-- ============================================================================
-- Daysight — Migration 017: Seed 5 New Gift Catalog Items (XLS v3.0)
--
-- Adds 5 new products identified in XLS v3.0 that were not in migration 016.
-- Categories: home (3), sports (1), apparel (1). No schema changes needed.
--
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================================

BEGIN;

INSERT INTO public.gift_catalog (name, partner, affiliate_url, category, price_tier, description, tags, gender_tags, relationship_affinities, event_affinities, is_last_minute) VALUES

-- ── Home (3) ───────────────────────────────────────────────────
('Muso Wood Book Ends', 'amazon', 'https://www.amazon.com/dp/B07MNZCWSS?tag=daysightremin-20', 'home', 'low', 'Solid walnut wood bookends with non-slip bases. Heavy enough to hold a full shelf.', '{book,home,shelf,organize,clean,tidy}', '{}', '{all}', '{all}', true),
('Tramontina Professional 10-Inch Non Stick Frying Pan', 'amazon', 'https://www.amazon.com/dp/B009HBKQ16?tag=daysightremin-20', 'home', 'mid', 'Restaurant-grade nonstick pan with heavy-gauge aluminum and an oven-safe silicone handle.', '{cooking,chef,grill,egg,cook,pan,fry}', '{}', '{all}', '{all}', true),
('Ukulele (Mahogany), Adults Kit for Beginners', 'amazon', 'https://www.amazon.com/dp/B072JT9WLF?tag=daysightremin-20', 'home', 'mid', 'Solid mahogany concert ukulele bundled with a tuner, strap, gig bag, and picks.', '{ukelele,music,guitar,play,learn,songs,sing,song}', '{}', '{all}', '{all}', true),

-- ── Sports (1) ─────────────────────────────────────────────────
('SMITH Signal Cycling Helmet', 'amazon', 'https://www.amazon.com/dp/B0B8DTY3MZ?tag=daysightremin-20', 'sports', 'high', 'Lightweight road helmet with MIPS impact protection and a 21-vent airflow system.', '{bike,bicycle,cycling,helmet,safety}', '{}', '{all}', '{all}', true),

-- ── Apparel (1) ────────────────────────────────────────────────
('Repel Windproof Travel Umbrella', 'amazon', 'https://www.amazon.com/dp/B0DFCJHCHZ?tag=daysightremin-20', 'apparel', 'low', 'Compact auto-open umbrella built to handle winds up to 85 mph. Fits in a backpack.', '{rain,umbrella,windproof,travel,backpack}', '{}', '{all}', '{all}', true);

COMMIT;
