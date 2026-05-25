# Image Pipeline — Gift Catalog

## Status (May 2026)
Script written, tested, and run. All 72 images downloaded and committed to `public/gifts/`. Email template updated to render product images. Migration 018 populates `gift_catalog.image_url` with self-hosted paths.

## Script Location
`scripts/download-gift-images.mjs`

## What It Does
1. Reads XLS v3.0 (72 items, all with valid image URLs)
2. Amazon images: rewrites URL to `_SL400_.jpg` (lets Amazon CDN do the resize as JPEG — avoids WebP/AVIF format issues that caused "blue dot grid" corruption)
3. Non-Amazon images (UrbanStems, Wine.com): downloads full-size, resizes locally with sharp
4. All images: 400×400px (retina 2×), white background, JPEG 82% quality, mozjpeg compression
5. Output: `public/gifts/{slug}.jpg` + `manifest.json`

## Key Decisions Made
- **Retina 2×**: Files are 400px, displayed at 200px in email (`width="200"`) for crisp rendering on HiDPI screens
- **Self-hosted on Vercel**: Images go in `/public/gifts/` → served from `daysight.xyz/gifts/...` via Vercel CDN. Avoids hotlinking (Amazon blocks it in email, UrbanStems URLs expire)
- **No WebP in Accept header**: Amazon ignores Accept headers anyway and serves whatever it wants; the URL suffix `_SL400_.jpg` is what actually controls output format
- **Conservative rate limiting**: 3–5s random delay for Amazon, 1–2s for others. Exponential backoff on 429s

## Problems Solved
1. **Blue dot grids**: ~26 items in XLS v2.0 had Amazon placeholder tile URLs (`/images/G/...`), not real product images. Fixed in v3.0.
2. **XML parse error (incense item)**: Had a product page URL instead of image CDN URL. Fixed in v3.0.
3. **Format mismatch**: Original script requested WebP via Accept header; Amazon served garbled responses for some items. Fixed by removing WebP from Accept and using URL suffix to force JPEG.

## Next Steps
- [x] Run script locally to download all 72 images
- [x] Commit `public/gifts/` to repo
- [x] Update `src/emails/reminder.tsx` to render product thumbnails (200px, 8px border-radius)
- [x] Pass `image_url` through in cron route (line ~217 of reminders/route.ts)
- [ ] Seed 5 new XLS v3.0 items into `gift_catalog` DB table (migration 017 written, needs to be run)
- [ ] Update `gift_catalog.image_url` for all items to point to self-hosted paths (migration 018 written, needs to be run)

## Usage
```bash
node scripts/download-gift-images.mjs --dry-run    # preview
node scripts/download-gift-images.mjs              # full run (~5 min)
node scripts/download-gift-images.mjs --skip-existing  # retry failures only
```
