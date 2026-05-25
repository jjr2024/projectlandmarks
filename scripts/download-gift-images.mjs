#!/usr/bin/env node
/**
 * download-gift-images.mjs
 *
 * Reads the Daysight gift catalog XLS, downloads every product image,
 * resizes to a standardized 200×200 white-background square (JPEG),
 * and saves to /public/gifts/ for self-hosted email use.
 *
 * Rate limiting:
 *   - 3–5 second random delay between Amazon requests (polite crawl)
 *   - 1–2 second delay for other CDNs (UrbanStems, Wine.com)
 *   - Randomized User-Agent rotation to look like normal browser traffic
 *   - Respects 429s with exponential backoff + retry
 *
 * Usage:
 *   npm install xlsx sharp  (if not already)
 *   node scripts/download-gift-images.mjs
 *
 * Options:
 *   --dry-run     Print what would be downloaded without fetching
 *   --skip-existing  Skip images that already exist in output dir
 *   --concurrency=1  Max parallel downloads (default: 1, sequential)
 */

import { readFileSync, mkdirSync, existsSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

// We use dynamic imports so the script fails gracefully with a helpful message
let XLSX, sharp;
try {
  XLSX = (await import("xlsx")).default || (await import("xlsx"));
} catch {
  console.error("❌ Missing dependency: npm install xlsx");
  process.exit(1);
}
try {
  sharp = (await import("sharp")).default || (await import("sharp"));
} catch {
  console.error("❌ Missing dependency: npm install sharp");
  process.exit(1);
}

// ─── Config ────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const XLS_PATH = join(
  PROJECT_ROOT,
  "Daysight Manual Amazon Inputs - XLS Format_v3.0.xlsx"
);
const OUTPUT_DIR = join(PROJECT_ROOT, "public", "gifts");
const MANIFEST_PATH = join(OUTPUT_DIR, "manifest.json");

// Image processing settings
// We store at 2× display size for retina sharpness: file is 400px, displayed at 200px
// in the email via width="200". This gives crisp images on 2x/3x screens.
const DISPLAY_SIZE = 200; // px — how wide the image renders in the email
const TARGET_SIZE = DISPLAY_SIZE * 2; // px — actual file resolution (retina 2×)
const JPEG_QUALITY = 82; // slightly higher quality since we're serving at 2× (still ≈ 15–25KB)
const BACKGROUND_COLOR = { r: 255, g: 255, b: 255, alpha: 1 }; // white

// Rate limiting — be very polite to Amazon
const DELAY_AMAZON_MIN_MS = 3000;
const DELAY_AMAZON_MAX_MS = 5000;
const DELAY_OTHER_MIN_MS = 1000;
const DELAY_OTHER_MAX_MS = 2000;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 5000; // exponential: 5s, 10s, 20s

// Rotate user agents to avoid looking like a bot
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

// ─── CLI args ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SKIP_EXISTING = args.includes("--skip-existing");

// ─── Helpers ───────────────────────────────────────────────────────────────

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDelay(url) {
  if (url.includes("m.media-amazon.com") || url.includes("amazon.com")) {
    return randomBetween(DELAY_AMAZON_MIN_MS, DELAY_AMAZON_MAX_MS);
  }
  return randomBetween(DELAY_OTHER_MIN_MS, DELAY_OTHER_MAX_MS);
}

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sanitizeFilename(name) {
  // Create a filesystem-safe slug from the gift name
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Transform an Amazon image URL to request a pre-rendered JPEG at our target size.
 *
 * Amazon's media CDN ignores Accept headers and serves whatever format (AVIF, WebP)
 * it wants based on internal routing. This causes garbled "blue dot" images when
 * decoded. BUT — if we rewrite the URL suffix, Amazon's image service will render
 * the exact format and size we ask for server-side.
 *
 * URL anatomy:
 *   https://m.media-amazon.com/images/I/{IMAGE_ID}._{TRANSFORMS}_.jpg
 *   Transforms: AC = auto-crop, SL = scale-longest-side, SX = scale-width, SY = scale-height
 *
 * We strip all existing transforms and request:
 *   ._SL{TARGET_SIZE}_.jpg  →  JPEG, longest side = TARGET_SIZE px (400px for retina 2×)
 *
 * This eliminates all local format-mismatch issues for Amazon images.
 */
function transformAmazonUrl(url) {
  // Match the image ID and strip everything after it up to the extension
  // e.g., /images/I/61sS-XIvEXL._AC_SL1500_.jpg → /images/I/61sS-XIvEXL._SL200_.jpg
  const match = url.match(
    /^(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+%-]+)\._[^.]+_\.(\w+)$/
  );
  if (match) {
    // Force JPEG at our target size — Amazon will do the resize + format conversion server-side
    return `${match[1]}._SL${TARGET_SIZE}_.jpg`;
  }
  // If the URL doesn't match the expected pattern, return as-is (will go through sharp locally)
  return url;
}

/**
 * Check whether a URL is an Amazon media CDN image that we can transform server-side.
 * Only /images/I/ paths are real product images. /images/G/ are Amazon system assets
 * (placeholders, tiles, icons) that we cannot use.
 */
function isAmazonImage(url) {
  return url.includes("m.media-amazon.com/images/I/");
}

/**
 * Known-bad Amazon placeholder URLs. These are generic Amazon system tiles (blue/grey
 * dot grids) that appear in scraped data when the real product image wasn't captured.
 * We skip these entirely and flag them in the manifest for manual replacement.
 */
const AMAZON_PLACEHOLDER_PATTERNS = [
  "m.media-amazon.com/images/G/", // System assets (tiles, icons) — never real product images
];

/**
 * Detect URLs that are NOT actual image URLs (e.g., full product page links
 * accidentally placed in the image_url column).
 */
function isNotImageUrl(url) {
  // Product page URLs, not CDN image URLs
  if (url.includes("amazon.com/") && url.includes("/dp/")) return true;
  // Any URL without an image-like path
  if (!url.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?|$|#)/i) &&
      !url.includes("/images/") &&
      !url.includes("/image/upload/")) return true;
  return false;
}

function isPlaceholderImage(url) {
  return AMAZON_PLACEHOLDER_PATTERNS.some((pattern) => url.includes(pattern));
}

// ─── Download with retry + backoff ─────────────────────────────────────────

/**
 * IMPORTANT: We explicitly request JPEG/PNG only (no WebP).
 * Amazon CDN will serve WebP if you advertise support, but the response often
 * comes with quirks (wrong content-length, partial encoding for certain ASINs)
 * that produce garbled "blue dot grid" output when decoded. By requesting only
 * traditional formats we get reliable, consistent image data.
 */
async function downloadImage(url, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": randomUserAgent(),
        // NO WebP — forces Amazon to serve JPEG/PNG which decode reliably
        Accept: "image/jpeg,image/png,image/gif,image/*;q=0.8",
        "Accept-Encoding": "identity", // no compressed responses that might confuse things
        "Accept-Language": "en-US,en;q=0.9",
        Referer: url.includes("amazon")
          ? "https://www.amazon.com/"
          : url.includes("urbanstems")
            ? "https://urbanstems.com/"
            : "https://www.wine.com/",
      },
    });

    clearTimeout(timeout);

    if (res.status === 429 || res.status === 503) {
      if (attempt > MAX_RETRIES) {
        throw new Error(`Rate limited after ${MAX_RETRIES} retries: ${url}`);
      }
      const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      console.log(
        `  ⏳ Rate limited (${res.status}), backing off ${backoff / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`
      );
      await sleep(backoff);
      return downloadImage(url, attempt + 1);
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // ── Validate: reject XML error pages and non-image responses ──
    // Amazon S3 returns XML error documents (AccessDenied, NoSuchKey) with 200 status sometimes
    const head = buffer.slice(0, 100).toString("utf-8");
    if (head.includes("<?xml") || head.includes("<Error>") || head.includes("<html")) {
      throw new Error(
        `Response is XML/HTML, not an image (likely expired or access-denied). First bytes: "${head.slice(0, 60).replace(/\n/g, " ")}"`
      );
    }

    // ── Validate: check it's actually decodable as an image ──
    // sharp.metadata() will throw if the buffer isn't a valid image
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) {
      throw new Error(`Downloaded data has no valid dimensions (format: ${meta.format || "unknown"})`);
    }

    // ── Validate: reject tiny placeholder images (Amazon sometimes returns 1x1 tracking pixels) ──
    if (meta.width < 10 || meta.height < 10) {
      throw new Error(`Image too small (${meta.width}x${meta.height}) — likely a placeholder pixel`);
    }

    return { buffer, meta };
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === "AbortError") {
      if (attempt > MAX_RETRIES) {
        throw new Error(`Timeout after ${MAX_RETRIES} retries: ${url}`);
      }
      console.log(`  ⏳ Timeout, retrying (attempt ${attempt}/${MAX_RETRIES})...`);
      await sleep(BACKOFF_BASE_MS * attempt);
      return downloadImage(url, attempt + 1);
    }

    throw err;
  }
}

// ─── Image processing: resize + white bg + JPEG ────────────────────────────

async function processImage(inputBuffer, outputPath, meta) {
  // sharp auto-detects input format (JPEG, PNG, WebP, AVIF, TIFF, GIF, SVG)
  // regardless of file extension — so even if Amazon lied about the format,
  // this will decode it correctly as long as the bytes are valid.
  const pipeline = sharp(inputBuffer);

  // If the source is animated (GIF), take just the first frame
  if (meta?.pages && meta.pages > 1) {
    pipeline.extract({ left: 0, top: 0, width: meta.width, height: meta.height });
  }

  await pipeline
    // Resize to fit within 200×200, preserving aspect ratio (letterboxed)
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: "contain",
      background: BACKGROUND_COLOR,
    })
    // Flatten transparency to white (handles PNGs with alpha)
    .flatten({ background: BACKGROUND_COLOR })
    // Output as JPEG — universal email client support
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(outputPath);
}

// ─── Read XLS ──────────────────────────────────────────────────────────────

function readGiftCatalog() {
  if (!existsSync(XLS_PATH)) {
    console.error(`❌ XLS not found at: ${XLS_PATH}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(XLS_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  return rows
    .filter((row) => row.name && row.image_url)
    .map((row) => ({
      name: row.name,
      image_url: row.image_url,
      partner: row.partner || "unknown",
      category: row.category || "other",
      // Use a slug for the filename — predictable and human-readable
      filename: `${sanitizeFilename(row.name)}.jpg`,
    }));
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🖼️  Daysight Gift Image Pipeline");
  console.log("─".repeat(50));

  // Read catalog
  const gifts = readGiftCatalog();
  console.log(`📋 Found ${gifts.length} gifts with image URLs in XLS\n`);

  if (gifts.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  if (DRY_RUN) {
    console.log("🏜️  DRY RUN — no downloads will occur:\n");
    let goodCount = 0;
    let placeholderCount = 0;
    let badUrlCount = 0;

    for (const gift of gifts) {
      if (isPlaceholderImage(gift.image_url)) {
        console.log(`  🚫 ${gift.filename} — PLACEHOLDER (needs real URL)`);
        console.log(`    ← ${gift.image_url.slice(0, 80)}\n`);
        placeholderCount++;
      } else if (isNotImageUrl(gift.image_url)) {
        console.log(`  🚫 ${gift.filename} — NOT AN IMAGE URL`);
        console.log(`    ← ${gift.image_url.slice(0, 80)}\n`);
        badUrlCount++;
      } else {
        const fetchUrl = isAmazonImage(gift.image_url)
          ? transformAmazonUrl(gift.image_url)
          : gift.image_url;
        const tag = isAmazonImage(gift.image_url) ? " (CDN-resized)" : "";
        console.log(`  ✅ ${gift.filename}${tag}`);
        console.log(`    ← ${fetchUrl}\n`);
        goodCount++;
      }
    }

    console.log(`\n${"─".repeat(50)}`);
    console.log(`📊 Summary:`);
    console.log(`   ✅ Ready to download: ${goodCount}`);
    console.log(`   🚫 Placeholder URLs:  ${placeholderCount} (need real image URLs from product pages)`);
    console.log(`   🚫 Bad URLs:          ${badUrlCount} (not image URLs)`);
    console.log(`   📁 Output dir:        ${OUTPUT_DIR}`);
    return;
  }

  // Track results for manifest
  const manifest = [];
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < gifts.length; i++) {
    const gift = gifts[i];
    const outputPath = join(OUTPUT_DIR, gift.filename);
    const progress = `[${i + 1}/${gifts.length}]`;

    // Skip if already exists
    if (SKIP_EXISTING && existsSync(outputPath)) {
      console.log(`${progress} ⏭️  ${gift.filename} (exists, skipping)`);
      skipped++;
      manifest.push({
        name: gift.name,
        filename: gift.filename,
        partner: gift.partner,
        category: gift.category,
        status: "skipped",
      });
      continue;
    }

    // ── Pre-flight checks: skip known-bad URLs ──
    if (isPlaceholderImage(gift.image_url)) {
      console.log(`${progress} 🚫 ${gift.name}`);
      console.log(`       SKIPPED: Amazon placeholder/system tile (not a product image)`);
      console.log(`       URL: ${gift.image_url.slice(0, 80)}\n`);
      failed++;
      manifest.push({
        name: gift.name,
        filename: gift.filename,
        partner: gift.partner,
        category: gift.category,
        source_url: gift.image_url,
        status: "placeholder",
        error: "Amazon system tile — needs real product image URL from product page",
      });
      continue;
    }

    if (isNotImageUrl(gift.image_url)) {
      console.log(`${progress} 🚫 ${gift.name}`);
      console.log(`       SKIPPED: Not an image URL (looks like a product page link)`);
      console.log(`       URL: ${gift.image_url.slice(0, 80)}\n`);
      failed++;
      manifest.push({
        name: gift.name,
        filename: gift.filename,
        partner: gift.partner,
        category: gift.category,
        source_url: gift.image_url,
        status: "bad_url",
        error: "Not an image URL — needs the actual image CDN link from the product page",
      });
      continue;
    }

    // For Amazon images, rewrite the URL to get a pre-rendered JPEG at target size
    const isAmazon = isAmazonImage(gift.image_url);
    const fetchUrl = isAmazon ? transformAmazonUrl(gift.image_url) : gift.image_url;

    console.log(`${progress} ⬇️  ${gift.name}`);
    console.log(`       src: ${fetchUrl.slice(0, 90)}${isAmazon ? " (CDN-resized)" : ""}`);

    try {
      // Download + validate
      const { buffer: imageBuffer, meta } = await downloadImage(fetchUrl);
      console.log(
        `       downloaded: ${(imageBuffer.length / 1024).toFixed(1)}KB (${meta.format}, ${meta.width}×${meta.height})`
      );

      if (isAmazon && meta.format === "jpeg" && meta.width <= TARGET_SIZE && meta.height <= TARGET_SIZE) {
        // Amazon already gave us the right size and format — just flatten to white bg and save
        // (skip heavy resize, just ensure no transparency and consistent JPEG output)
        await sharp(imageBuffer)
          .flatten({ background: BACKGROUND_COLOR })
          .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
          .toFile(outputPath);
      } else {
        // Non-Amazon or unexpected dimensions — full resize pipeline
        await processImage(imageBuffer, outputPath, meta);
      }

      // Report final size
      const { size } = await import("fs").then((fs) =>
        fs.promises.stat(outputPath)
      );
      console.log(
        `       → ${gift.filename} (${(size / 1024).toFixed(1)}KB) ✅\n`
      );

      succeeded++;
      manifest.push({
        name: gift.name,
        filename: gift.filename,
        partner: gift.partner,
        category: gift.category,
        url: `/gifts/${gift.filename}`,
        status: "ok",
      });
    } catch (err) {
      console.log(`       ❌ FAILED: ${err.message}\n`);
      failed++;
      manifest.push({
        name: gift.name,
        filename: gift.filename,
        partner: gift.partner,
        category: gift.category,
        source_url: gift.image_url,
        status: "failed",
        error: err.message,
      });
    }

    // Polite delay before next request (skip on last item)
    if (i < gifts.length - 1) {
      const delay = getDelay(gift.image_url);
      console.log(
        `       💤 waiting ${(delay / 1000).toFixed(1)}s before next request...`
      );
      await sleep(delay);
    }
  }

  // Write manifest (useful for DB seeding / debugging)
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  // Summary
  console.log("\n" + "─".repeat(50));
  console.log("📊 Results:");
  console.log(`   ✅ Succeeded: ${succeeded}`);
  console.log(`   ⏭️  Skipped:   ${skipped}`);
  console.log(`   ❌ Failed:    ${failed}`);
  console.log(`   📁 Output:    ${OUTPUT_DIR}`);
  console.log(`   📄 Manifest:  ${MANIFEST_PATH}`);

  if (failed > 0) {
    console.log(
      "\n⚠️  Some downloads failed. Re-run with --skip-existing to retry only failures."
    );
  }

  // Estimate total run time for the user
  const estimatedMinutes = Math.ceil((gifts.length * 4) / 60); // ~4s avg per image
  if (succeeded === 0 && skipped === 0) {
    console.log(
      `\n⏱️  Estimated total time for full run: ~${estimatedMinutes} minutes`
    );
  }
}

main().catch((err) => {
  console.error("💥 Unexpected error:", err);
  process.exit(1);
});
