-- Migration 023 — Stable identifier (`ds_sku`) and audit log for gift catalog
--
-- WHY: We are moving gift catalog management off of one-off SQL migrations and
-- onto a re-runnable sync script (`scripts/sync-gift-catalog.mjs`). The script
-- needs a stable, Daysight-owned identifier for matching XLS rows to DB rows
-- (ASIN is unsuitable: it's blank for UrbanStems/Wine.com items, externally
-- controlled, and mixed semantics make the script brittle). The script also
-- needs a durable audit trail so we can answer "who changed which gift and
-- when" without grepping git history.
--
-- WHAT THIS DOES:
--   1. Adds `ds_sku text` to `gift_catalog`. Lowercase, kebab-case, NOT NULL
--      UNIQUE. Daysight's internal SKU — never derived from external IDs.
--   2. Backfills `ds_sku` for the existing 72 catalog rows via deterministic
--      slug-of-name with numeric suffix on collisions.
--   3. Creates `gift_catalog_audit` — append-only log of catalog changes,
--      one row per (run, gift, action). Indexed by run_id / gift_id /
--      ds_sku / run_at for fast lookups.
--   4. Wires gift_catalog to the `set_updated_at_and_changed_fields()` trigger
--      from migration 022 so updated_at and last_changed_fields auto-populate
--      consistently with the other instrumented tables.
--      (Note: gift_catalog didn't have an UPDATE trigger before today.
--      updated_at on existing rows = created_at as a side effect of how the
--      seeded INSERTs ran. From this migration forward, updated_at reflects
--      real edits and last_changed_fields names them.)
--
-- COMPATIBILITY: ASIN stays in the XLS as internal reference for price-checking
-- workflows. The sync script doesn't read it. Existing code that selects from
-- gift_catalog is unaffected (`ds_sku` is a new column; no existing queries
-- need it). FK from `shown_gifts.gift_id` is unchanged.
--
-- COST: ~30 bytes/row for ds_sku, plus the audit table (grows ~150 bytes per
-- change record). At 200-300 catalog items with quarterly sync runs, audit
-- table growth is negligible.

-- ── 1. Add ds_sku column (nullable for backfill, tightened after) ──────────

ALTER TABLE public.gift_catalog
  ADD COLUMN IF NOT EXISTS ds_sku text;

ALTER TABLE public.gift_catalog
  ADD COLUMN IF NOT EXISTS last_changed_fields text[];

-- ── 2. Backfill ds_sku from existing names ─────────────────────────────────
-- Deterministic slugify: lowercase, replace non-alphanumeric with hyphen,
-- trim leading/trailing hyphens. On collision, append `-2`, `-3`, ... ordered
-- by created_at (stable, oldest gets the clean slug).

WITH slugged AS (
  SELECT
    id,
    created_at,
    regexp_replace(
      regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'),
      '(^-+)|(-+$)', '', 'g'
    ) AS base_slug
  FROM public.gift_catalog
),
numbered AS (
  SELECT
    id,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY created_at, id) AS rn
  FROM slugged
)
UPDATE public.gift_catalog g
SET ds_sku = CASE
  WHEN n.rn = 1 THEN n.base_slug
  ELSE n.base_slug || '-' || n.rn::text
END
FROM numbered n
WHERE g.id = n.id;

-- ── 3. Enforce NOT NULL + UNIQUE after backfill ────────────────────────────

ALTER TABLE public.gift_catalog
  ALTER COLUMN ds_sku SET NOT NULL;

ALTER TABLE public.gift_catalog
  ADD CONSTRAINT gift_catalog_ds_sku_key UNIQUE (ds_sku);

-- Format constraint: lowercase alphanumeric + hyphens, between 2 and 80 chars.
-- Prevents typos like "Owala Bottle" sneaking in via direct SQL.
ALTER TABLE public.gift_catalog
  ADD CONSTRAINT gift_catalog_ds_sku_format
  CHECK (ds_sku ~ '^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$');

-- ── 4. Trigger: bring gift_catalog into the updated_at + last_changed_fields family ─
DROP TRIGGER IF EXISTS gift_catalog_updated_at ON public.gift_catalog;
CREATE TRIGGER gift_catalog_updated_at
  BEFORE UPDATE ON public.gift_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_changed_fields();

-- ── 5. Audit table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gift_catalog_audit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid NOT NULL,         -- groups all changes from one sync invocation
  run_at        timestamptz NOT NULL DEFAULT now(),
  run_by        text NOT NULL DEFAULT 'unknown',  -- $USER or script-supplied identifier
  gift_id       uuid REFERENCES public.gift_catalog(id) ON DELETE SET NULL,
  gift_ds_sku   text NOT NULL,         -- denormalized so the row survives if gift is ever deleted
  action        text NOT NULL CHECK (action IN ('insert','update','deactivate','reactivate')),
  changed_fields text[],                -- for updates: which fields changed
  old_values    jsonb,                  -- pre-change snapshot (NULL for inserts)
  new_values    jsonb,                  -- post-change snapshot (NULL for deactivations, full row for others)
  note          text                    -- optional human-supplied note for the run
);

-- Indexes scoped to typical lookup patterns: by run, by gift, by sku, by time.
CREATE INDEX IF NOT EXISTS gift_catalog_audit_run_id_idx
  ON public.gift_catalog_audit (run_id);
CREATE INDEX IF NOT EXISTS gift_catalog_audit_gift_id_idx
  ON public.gift_catalog_audit (gift_id);
CREATE INDEX IF NOT EXISTS gift_catalog_audit_gift_ds_sku_idx
  ON public.gift_catalog_audit (gift_ds_sku);
CREATE INDEX IF NOT EXISTS gift_catalog_audit_run_at_idx
  ON public.gift_catalog_audit (run_at DESC);

-- RLS: deny all client access. The audit table is service-role only.
ALTER TABLE public.gift_catalog_audit ENABLE ROW LEVEL SECURITY;
-- No policies = no access for authenticated/anon roles. Service role bypasses RLS by design.
