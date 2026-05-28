#!/usr/bin/env node
/**
 * sync-gift-catalog.mjs
 *
 * Reconciles `gift_catalog` in the Supabase DB against the master XLS file.
 * Replaces the previous "every catalog change is a SQL migration" workflow.
 *
 * USAGE:
 *   node scripts/sync-gift-catalog.mjs [options]
 *
 * OPTIONS:
 *   --dry-run                Show diff without writing anything to the DB.
 *                            Audit table is not touched.
 *   --max-deactivate-pct=N   Refuse to proceed if a single run would deactivate
 *                            more than N% of currently-active gifts (default: 15).
 *   --force                  Override the deactivate-pct guard.
 *   --yes                    Skip the interactive confirmation prompt before
 *                            applying destructive changes. For agent / CI use.
 *   --note="text"            Free-text note recorded against every audit row
 *                            in this run. Useful for documenting why a sync
 *                            happened ("Q3 catalog refresh", "deactivate
 *                            seasonal items", etc.).
 *
 * MATCHING:
 *   Rows are matched between XLS and DB by `ds_sku` — the internal Daysight
 *   SKU. Never by ASIN, name, or affiliate URL. See migration 023 for the
 *   rationale. Every XLS row must have a non-empty `ds_sku` in
 *   lowercase-kebab-case (regex: ^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$).
 *
 * SAFETY:
 *   - Validates every XLS row before any DB writes happen.
 *   - Never DELETEs from gift_catalog. Removed-from-XLS items get
 *     `is_active=false` (soft deactivation). This preserves shown_gifts FKs
 *     and reminder_log.gift_ids snapshots.
 *   - Each gift_catalog write is followed by an audit row in the same per-row
 *     scope. If the script dies mid-flight, partial state is left in the DB
 *     and the audit table records exactly what was applied. Re-running the
 *     script is idempotent — it computes a fresh diff against current state.
 *   - Cron-safe: writes are atomic per row (Postgres MVCC), and the cron's
 *     `SELECT * FROM gift_catalog WHERE is_active=true` will see a consistent
 *     view at the moment it runs. The cron's gift selection inside one user
 *     iteration doesn't span the sync window.
 *
 * IMAGE FILES:
 *   This script only updates DB rows. It does NOT download or upload image
 *   files. After adding a new gift to the XLS, run
 *   `node scripts/download-gift-images.mjs` first, then this script.
 *
 * SOURCE OF TRUTH:
 *   The XLS is the single source of truth for catalog content. Manual edits
 *   to gift_catalog via the Supabase SQL editor will be reconciled away on
 *   the next sync. If you need a hotfix, update the XLS in the same change.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { createInterface } from "readline";

// Dynamic imports so missing deps surface a clear message.
let XLSX, createClient;
try {
  XLSX = (await import("xlsx")).default || (await import("xlsx"));
} catch {
  console.error("Missing dependency: npm install xlsx");
  process.exit(1);
}
try {
  ({ createClient } = await import("@supabase/supabase-js"));
} catch {
  console.error("Missing dependency: npm install @supabase/supabase-js");
  process.exit(1);
}

// ─── Paths ─────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const XLS_PATH = join(
  PROJECT_ROOT,
  "Daysight Manual Amazon Inputs - XLS Format_v3.0.xlsx"
);
const ENV_PATH = join(PROJECT_ROOT, ".env.local");

// ─── ANSI colors for readable CLI output (no extra deps) ───────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// ─── Env loading (manual; no dotenv dep) ───────────────────────────────────

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) {
    console.error(`${C.red}Missing .env.local at ${envPath}${C.reset}`);
    console.error(
      "Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }
  for (const rawLine of readFileSync(envPath, "utf-8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

// ─── CLI args ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const flags = {
    dryRun: argv.includes("--dry-run"),
    force: argv.includes("--force"),
    yes: argv.includes("--yes"),
    maxDeactivatePct: 15,
    note: null,
  };
  for (const arg of argv) {
    if (arg.startsWith("--max-deactivate-pct=")) {
      const n = parseInt(arg.split("=")[1], 10);
      if (Number.isFinite(n) && n >= 0 && n <= 100) flags.maxDeactivatePct = n;
    } else if (arg.startsWith("--note=")) {
      flags.note = arg.slice("--note=".length);
    }
  }
  return flags;
}

// ─── Domain config: allowed enum values (mirror constants.ts) ──────────────

const ALLOWED_CATEGORIES = new Set([
  "flowers",
  "wine",
  "food_snacks",
  "home",
  "books",
  "electronics",
  "sports",
  "apparel",
  "beauty",
  "jewelry",
  "wellness",
  "games_toys",
  "pet",
]);
const ALLOWED_PRICE_TIERS = new Set(["low", "mid", "high"]);
const ALLOWED_GENDER_TAGS = new Set(["woman", "man", "unisex"]);
const DS_SKU_REGEX = /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/;

// Fields the sync writes to gift_catalog. Anything not in this list is
// either DB-managed (id, created_at, updated_at, last_changed_fields) or
// internal-reference in the XLS (asin, current_price, etc.) and is ignored.
const SYNCED_FIELDS = [
  "ds_sku",
  "name",
  "partner",
  "affiliate_url",
  "image_url",
  "category",
  "price_tier",
  "tags",
  "relationship_affinities",
  "event_affinities",
  "is_last_minute",
  "is_active",
  "description",
  "gender_tags",
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function yesNoToBool(v, fieldName, ctx) {
  if (v === true || v === false) return v;
  if (v == null || v === "") return false;
  const s = String(v).trim().toLowerCase();
  if (s === "yes" || s === "true" || s === "y" || s === "1") return true;
  if (s === "no" || s === "false" || s === "n" || s === "0") return false;
  throw new Error(
    `${ctx}: ${fieldName} must be yes/no, got ${JSON.stringify(v)}`
  );
}

function splitCsv(v) {
  if (v == null || v === "") return [];
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function nullableString(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// Array equality that's order-insensitive (catalog arrays are sets).
function arrayEqualUnordered(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

function valueEqual(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) return arrayEqualUnordered(a, b);
  return a === b;
}

// ─── Step 1: Parse + validate XLS ──────────────────────────────────────────

function loadXls() {
  if (!existsSync(XLS_PATH)) {
    console.error(`${C.red}XLS not found at ${XLS_PATH}${C.reset}`);
    process.exit(1);
  }
  const wb = XLSX.readFile(XLS_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

function validateAndTransform(rawRows) {
  const errors = [];
  const targets = [];
  const seenSkus = new Map();

  rawRows.forEach((row, idx) => {
    const lineNo = idx + 2; // XLS rows are 1-indexed with a header row
    const ctx = `Row ${lineNo}`;
    try {
      const ds_sku = nullableString(row.ds_sku);
      if (!ds_sku) {
        errors.push(`${ctx}: missing ds_sku`);
        return;
      }
      if (!DS_SKU_REGEX.test(ds_sku)) {
        errors.push(
          `${ctx}: ds_sku "${ds_sku}" must match ${DS_SKU_REGEX.source} (lowercase, alphanumeric + hyphens)`
        );
        return;
      }
      if (seenSkus.has(ds_sku)) {
        errors.push(
          `${ctx}: duplicate ds_sku "${ds_sku}" (also at row ${seenSkus.get(ds_sku)})`
        );
        return;
      }
      seenSkus.set(ds_sku, lineNo);

      const name = nullableString(row.name);
      const partner = nullableString(row.partner);
      const affiliate_url = nullableString(row.clean_affiliate_url);
      const category = nullableString(row.category);
      const price_tier = nullableString(row.price_tier);
      const description = String(row.description ?? "");

      if (!name) errors.push(`${ctx}: missing name`);
      if (!partner) errors.push(`${ctx}: missing partner`);
      if (!affiliate_url)
        errors.push(`${ctx}: missing clean_affiliate_url`);
      if (!category) errors.push(`${ctx}: missing category`);
      if (!price_tier) errors.push(`${ctx}: missing price_tier`);

      if (category && !ALLOWED_CATEGORIES.has(category)) {
        errors.push(
          `${ctx}: category "${category}" not in allowed set (${[...ALLOWED_CATEGORIES].join(", ")})`
        );
      }
      if (price_tier && !ALLOWED_PRICE_TIERS.has(price_tier)) {
        errors.push(
          `${ctx}: price_tier "${price_tier}" not in {low, mid, high}`
        );
      }

      const is_active = yesNoToBool(row.is_active, "is_active", ctx);
      const is_last_minute = yesNoToBool(
        row.is_last_minute,
        "is_last_minute",
        ctx
      );

      const tags = splitCsv(row.tags);
      const relationship_affinities = splitCsv(row.relationship_affinities);
      const event_affinities = splitCsv(row.event_affinities);
      const gender_tags = splitCsv(row.gender_tags);

      for (const g of gender_tags) {
        if (!ALLOWED_GENDER_TAGS.has(g)) {
          errors.push(
            `${ctx}: gender_tag "${g}" not in {woman, man, unisex}`
          );
        }
      }

      // image_url is computed deterministically from ds_sku — XLS image_url
      // is the Amazon CDN source and is never written to the DB (per CLAUDE.md).
      //
      // FILENAME ALIGNMENT: scripts/download-gift-images.mjs slices the
      // slug at 60 chars when writing files to public/gifts/. We mirror that
      // truncation here so the DB URL points at a file that actually exists.
      // For ds_sku ≤ 60 chars this is a no-op. For longer ds_sku, both the
      // download script and this script produce the same 60-char prefix,
      // keeping URL ↔ file alignment intact. If you ever lift the 60-char
      // cap in download-gift-images.mjs, lift it here in the same change.
      const image_url = `https://daysight.xyz/gifts/${ds_sku.slice(0, 60)}.jpg`;

      targets.push({
        ds_sku,
        name,
        partner,
        affiliate_url,
        image_url,
        category,
        price_tier,
        tags,
        relationship_affinities,
        event_affinities,
        is_last_minute,
        is_active,
        description,
        gender_tags,
      });
    } catch (e) {
      errors.push(`${ctx}: ${e.message}`);
    }
  });

  return { targets, errors };
}

// ─── Step 2: Fetch current DB state ────────────────────────────────────────

async function fetchCurrent(supabase) {
  const { data, error } = await supabase
    .from("gift_catalog")
    .select(SYNCED_FIELDS.concat(["id"]).join(","));
  if (error) throw new Error(`fetch gift_catalog: ${error.message}`);
  return data;
}

// ─── Step 3: Diff target vs current ────────────────────────────────────────

function diff(targets, currentRows) {
  const currentBySku = new Map(currentRows.map((r) => [r.ds_sku, r]));
  const targetBySku = new Map(targets.map((t) => [t.ds_sku, t]));

  const changes = [];

  for (const target of targets) {
    const current = currentBySku.get(target.ds_sku);
    if (!current) {
      // Brand-new gift
      changes.push({
        action: "insert",
        ds_sku: target.ds_sku,
        gift_id: null,
        old_values: null,
        new_values: target,
        changed_fields: SYNCED_FIELDS.slice(),
      });
      continue;
    }

    // Compute per-field diff
    const changedFields = [];
    const oldSnapshot = {};
    const newSnapshot = {};
    for (const f of SYNCED_FIELDS) {
      const oldV = current[f];
      const newV = target[f];
      if (!valueEqual(oldV, newV)) {
        changedFields.push(f);
        oldSnapshot[f] = oldV;
        newSnapshot[f] = newV;
      }
    }

    if (changedFields.length === 0) {
      // No-op: don't record anything, don't pollute audit log
      continue;
    }

    // Classify as 'reactivate' if the only/main change is flipping is_active false → true
    const isReactivation =
      !current.is_active &&
      target.is_active &&
      changedFields.includes("is_active");

    changes.push({
      action: isReactivation ? "reactivate" : "update",
      ds_sku: target.ds_sku,
      gift_id: current.id,
      old_values: oldSnapshot,
      new_values: newSnapshot,
      changed_fields: changedFields,
    });
  }

  // Anything in DB but not in XLS — deactivate if currently active
  for (const current of currentRows) {
    if (targetBySku.has(current.ds_sku)) continue;
    if (!current.is_active) continue; // already inactive, no-op
    changes.push({
      action: "deactivate",
      ds_sku: current.ds_sku,
      gift_id: current.id,
      old_values: { is_active: true },
      new_values: { is_active: false },
      changed_fields: ["is_active"],
    });
  }

  return changes;
}

// ─── Step 4: Sanity checks ─────────────────────────────────────────────────

function sanityCheck(changes, currentRows, flags) {
  const currentlyActive = currentRows.filter((r) => r.is_active).length;
  const deactivations = changes.filter((c) => c.action === "deactivate").length;
  const pct =
    currentlyActive === 0 ? 0 : (deactivations / currentlyActive) * 100;

  if (
    deactivations > 0 &&
    pct > flags.maxDeactivatePct &&
    !flags.force &&
    !flags.dryRun
  ) {
    console.error(
      `${C.red}REFUSING:${C.reset} ${deactivations} deactivations would touch ${pct.toFixed(
        1
      )}% of active gifts (cap is ${flags.maxDeactivatePct}%).`
    );
    console.error(
      "If this is intended, re-run with --force. Otherwise check the XLS for accidental deletions."
    );
    process.exit(1);
  }

  return { currentlyActive, deactivations, pct };
}

// ─── Step 5: Pretty-print the diff ─────────────────────────────────────────

function summarize(changes) {
  const counts = {
    insert: 0,
    update: 0,
    reactivate: 0,
    deactivate: 0,
  };
  for (const c of changes) counts[c.action]++;
  return counts;
}

function printDiff(changes, counts, currentlyActive, pct) {
  console.log(`\n${C.bold}Diff summary${C.reset}`);
  console.log(`  ${C.green}+ Insert     ${counts.insert}${C.reset}`);
  console.log(`  ${C.yellow}~ Update     ${counts.update}${C.reset}`);
  console.log(`  ${C.cyan}↑ Reactivate ${counts.reactivate}${C.reset}`);
  console.log(
    `  ${C.red}- Deactivate ${counts.deactivate}${C.reset} ${C.dim}(${pct.toFixed(
      1
    )}% of ${currentlyActive} active)${C.reset}`
  );
  console.log(
    `  ${C.dim}Total changes: ${changes.length}${C.reset}\n`
  );

  if (changes.length === 0) return;

  for (const c of changes) {
    const sigil =
      c.action === "insert"
        ? `${C.green}+`
        : c.action === "deactivate"
        ? `${C.red}-`
        : c.action === "reactivate"
        ? `${C.cyan}↑`
        : `${C.yellow}~`;
    let line = `${sigil} ${c.ds_sku}${C.reset}`;
    if (c.action === "update" || c.action === "reactivate") {
      const fieldList = c.changed_fields
        .map((f) => {
          const oldV = JSON.stringify(c.old_values[f]);
          const newV = JSON.stringify(c.new_values[f]);
          return `${f}: ${C.dim}${oldV}${C.reset} → ${newV}`;
        })
        .join(`\n    `);
      line += `\n    ${fieldList}`;
    }
    console.log(line);
  }
  console.log();
}

// ─── Step 6: Apply changes (with audit logging) ────────────────────────────

async function applyChanges(supabase, changes, runId, runBy, note) {
  const results = { applied: 0, failed: 0, errors: [] };

  for (const c of changes) {
    try {
      if (c.action === "insert") {
        const { data, error } = await supabase
          .from("gift_catalog")
          .insert(c.new_values)
          .select("id")
          .single();
        if (error) throw new Error(`insert ${c.ds_sku}: ${error.message}`);
        c.gift_id = data.id;
      } else if (c.action === "update" || c.action === "reactivate") {
        // Only set the fields that actually changed.
        const patch = {};
        for (const f of c.changed_fields) patch[f] = c.new_values[f];
        const { error } = await supabase
          .from("gift_catalog")
          .update(patch)
          .eq("id", c.gift_id);
        if (error) throw new Error(`update ${c.ds_sku}: ${error.message}`);
      } else if (c.action === "deactivate") {
        const { error } = await supabase
          .from("gift_catalog")
          .update({ is_active: false })
          .eq("id", c.gift_id);
        if (error) throw new Error(`deactivate ${c.ds_sku}: ${error.message}`);
      }

      // Audit row — write AFTER the catalog change succeeds. If this fails,
      // the catalog change has already committed; we report it as a partial
      // error and keep going. Next sync will skip the (now matching) gift
      // but the audit gap will be visible.
      const { error: auditErr } = await supabase
        .from("gift_catalog_audit")
        .insert({
          run_id: runId,
          run_by: runBy,
          gift_id: c.gift_id,
          gift_ds_sku: c.ds_sku,
          action: c.action,
          changed_fields: c.changed_fields,
          old_values: c.old_values,
          new_values: c.new_values,
          note,
        });
      if (auditErr) {
        results.errors.push(
          `${c.ds_sku}: catalog change applied but audit insert failed — ${auditErr.message}`
        );
      }

      results.applied++;
    } catch (e) {
      results.failed++;
      results.errors.push(e.message);
    }
  }

  return results;
}

// ─── Step 7: Confirmation prompt ───────────────────────────────────────────

function confirm(prompt) {
  return new Promise((resolveP) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer) => {
      rl.close();
      resolveP(answer.trim().toLowerCase());
    });
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  loadEnvFile(ENV_PATH);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error(
      `${C.red}Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local${C.reset}`
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });

  console.log(`${C.bold}Daysight gift catalog sync${C.reset}`);
  console.log(`  XLS: ${XLS_PATH}`);
  console.log(
    `  Mode: ${flags.dryRun ? `${C.cyan}DRY RUN${C.reset}` : `${C.magenta}LIVE${C.reset}`}`
  );

  // 1. Parse + validate XLS
  const rawRows = loadXls();
  const { targets, errors: validationErrors } = validateAndTransform(rawRows);
  if (validationErrors.length > 0) {
    console.error(
      `\n${C.red}Validation failed (${validationErrors.length} errors):${C.reset}`
    );
    for (const e of validationErrors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`  XLS rows: ${targets.length} (all valid)`);

  // 2. Fetch current DB state
  const currentRows = await fetchCurrent(supabase);
  console.log(
    `  DB rows: ${currentRows.length} (${currentRows.filter((r) => r.is_active).length} active)`
  );

  // 3. Diff
  const changes = diff(targets, currentRows);
  const counts = summarize(changes);

  // 4. Sanity
  const { currentlyActive, pct } = sanityCheck(changes, currentRows, flags);

  // 5. Print
  printDiff(changes, counts, currentlyActive, pct);

  if (changes.length === 0) {
    console.log(`${C.green}Catalog already in sync. No changes to apply.${C.reset}`);
    process.exit(0);
  }

  if (flags.dryRun) {
    console.log(
      `${C.cyan}Dry run complete. No DB writes attempted. Re-run without --dry-run to apply.${C.reset}`
    );
    process.exit(0);
  }

  // 6. Confirm if destructive
  if (counts.deactivate > 0 && !flags.yes) {
    const answer = await confirm(
      `${C.yellow}This will deactivate ${counts.deactivate} gift(s). Continue? [y/N] ${C.reset}`
    );
    if (answer !== "y" && answer !== "yes") {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  // 7. Apply
  const runId = randomUUID();
  const runBy =
    process.env.SYNC_RUN_BY ||
    process.env.USER ||
    process.env.USERNAME ||
    "unknown";
  console.log(
    `\n${C.bold}Applying ${changes.length} changes${C.reset} ${C.dim}(run_id=${runId}, run_by=${runBy})${C.reset}`
  );

  const results = await applyChanges(supabase, changes, runId, runBy, flags.note);

  console.log(
    `\n${C.bold}Done.${C.reset} Applied: ${C.green}${results.applied}${C.reset}, Failed: ${results.failed > 0 ? C.red : ""}${results.failed}${C.reset}`
  );
  if (results.errors.length > 0) {
    console.log(`${C.red}Errors:${C.reset}`);
    for (const e of results.errors) console.log(`  ${e}`);
  }
  console.log(
    `${C.dim}Audit log: SELECT * FROM gift_catalog_audit WHERE run_id = '${runId}';${C.reset}`
  );

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`${C.red}Fatal:${C.reset} ${e.stack || e.message || e}`);
  process.exit(1);
});
