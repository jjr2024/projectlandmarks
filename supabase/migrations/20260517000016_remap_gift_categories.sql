-- ============================================================================
-- Daysight — Migration 016: Remap Gift Categories, Reseed Catalog & Gender Tags
--
-- 1. Add description column to gift_catalog
-- 2. Add gender_tags column + GIN index to gift_catalog
-- 3. Wipe all placeholder seed data from gift_catalog (migration 004)
-- 4. Insert 67 real products from XLS v2.0 with clean affiliate URLs
-- 5. Remap contacts.gift_categories arrays (existing user data)
-- 6. Remap profiles.default_gift_categories arrays
-- 7. Update column defaults
--
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================================

BEGIN;

-- ── 1. Add description column ──────────────────────────────────────────────
ALTER TABLE public.gift_catalog
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

-- ── 2. Add gender_tags column + GIN index ──────────────────────────────────
-- Enables gender-aware gift scoring in the recommendation engine.
-- Values: 'woman', 'man', 'unisex', or empty array (gender-neutral).
ALTER TABLE public.gift_catalog
  ADD COLUMN IF NOT EXISTS gender_tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_gift_catalog_gender_tags
  ON public.gift_catalog USING GIN (gender_tags);

COMMENT ON COLUMN public.gift_catalog.gender_tags IS
  'Gender affinity tags for scoring: woman, man, unisex, or empty (neutral)';

-- ── 3. Wipe all placeholder seed data ──────────────────────────────────────
-- Migration 004 seeded ~30 fake items. Remove them all; real products below.
-- Also clears shown_gifts history since those gift IDs will no longer exist.
DELETE FROM public.shown_gifts
WHERE gift_id IN (SELECT id FROM public.gift_catalog);

DELETE FROM public.gift_catalog;

-- ── 4. Insert 67 real products from XLS v2.0 ──────────────────────────────
-- Categories: flowers, wine, food_snacks, home, books, electronics, sports,
--             apparel, beauty, jewelry, wellness, games_toys, pet
-- Affiliate URLs: clean /dp/ASIN?tag=daysightremin-20 for Amazon;
--                 original URLs for UrbanStems and Wine.com.
-- Gender tags: 'woman', 'man', or empty (gender-neutral). Set per XLS v2.0.
-- NOTE: relationship_affinities and event_affinities are "all" for now.
--       is_last_minute is over-tagged (97% yes) — both to be audited post-launch.

INSERT INTO public.gift_catalog (name, partner, affiliate_url, category, price_tier, description, tags, gender_tags, relationship_affinities, event_affinities, is_last_minute) VALUES

-- ── Flowers (6) ────────────────────────────────────────────────
('The Sorbet Flower Bouquet', 'urbanstems', 'https://urbanstems.com/products/the-sorbet', 'flowers', 'medium', 'Roses, carnations, and veronica arranged in soft pastel tones.', '{flower,flowers,roses,carnations,veronica,bouquet}', '{}', '{all}', '{all}', true),
('The Firecracker Flower Bouquet', 'urbanstems', 'https://urbanstems.com/products/the-firecracker', 'flowers', 'medium', 'A bold arrangement of roses, thistle, and craspedia in warm tones.', '{flower,flowers,thistle,roses,bouquet,craspedia}', '{}', '{all}', '{all}', true),
('The Peony Flower Bouquet', 'urbanstems', 'https://urbanstems.com/products/the-peony', 'flowers', 'high', 'Lush pink peonies with seasonal greenery. A crowd-pleasing classic.', '{flower,flowers,bouquet,peonies,peony,pink}', '{}', '{all}', '{all}', true),
('The Good Vibes Flower Bouquet', 'urbanstems', 'https://urbanstems.com/products/the-good-vibes', 'flowers', 'medium', 'A warm and cheerful mix of orange roses, delphinium, and lisianthus.', '{flower,flowers,bouquet,orange,roses,delphinium,lisianthus}', '{}', '{all}', '{all}', true),
('The Coquette Flower Bouquet', 'urbanstems', 'https://urbanstems.com/products/the-coquette', 'flowers', 'medium', 'Pink roses paired with hypericum berries and lush seasonal greenery.', '{flower,flowers,bouquet,pink,roses,hypericum,berries,greenery}', '{}', '{all}', '{all}', true),
('The Unicorn Flower Bouquet', 'urbanstems', 'https://urbanstems.com/products/the-unicorn', 'flowers', 'medium', 'A playful purple, pink, and white arrangement with roses and carnations.', '{flower,flowers,bouquet,purple,pink,white,roses,carnations,alstroemeria}', '{}', '{all}', '{all}', true),

-- ── Wine (6) ───────────────────────────────────────────────────
('Laurent-Perrier La Cuvee Brut Champagne', 'wine.com', 'https://www.wine.com/product/laurent-perrier-la-cuvee-brut-375ml-half-bottle/330992', 'wine', 'low', 'Crisp and elegant French champagne, sold as a convenient half bottle.', '{champagne,wine}', '{}', '{all}', '{all}', true),
('Chateau Bourdieu No.1 2018 Red Wine', 'wine.com', 'https://www.wine.com/product/chateau-bourdieu-no1-2018/4122420', 'wine', 'low', 'A well-rounded Bordeaux red with dark fruit and a smooth finish.', '{redwine,wine,bordeaux,red}', '{}', '{all}', '{all}', true),
('Grand Napa Vineyards Los Carneros Chardonnay 2024', 'wine.com', 'https://www.wine.com/product/grand-napa-vineyards-los-carneros-chardonnay-2024/2880817', 'wine', 'medium', 'Bright California chardonnay with balanced citrus and a touch of oak.', '{whitewine,wine,chardonnay,white}', '{}', '{all}', '{all}', true),
('Heir Apparent Stags Leap District Cabernet Sauvignon 2022', 'wine.com', 'https://www.wine.com/product/heir-apparent-stags-leap-district-cabernet-sauvignon-2022/3693788', 'wine', 'high', 'A rich and structured Napa cabernet from the Stags Leap district.', '{wine,cabernet,sauvignon,red,alcohol}', '{}', '{all}', '{all}', true),
('Grand Napa Vineyards Los Carneros Pinot Noir 2023', 'wine.com', 'https://www.wine.com/product/grand-napa-vineyards-los-carneros-pinot-noir-2023/2918279', 'wine', 'medium', 'Light and earthy pinot noir from Los Carneros with soft berry notes.', '{wine,alcohol,pinot,noir,red,napa}', '{}', '{all}', '{all}', true),
('Veuve Clicquot Yellow Label Brut', 'wine.com', 'https://www.wine.com/product/veuve-clicquot-yellow-label-brut/528', 'wine', 'medium', 'Well-known Veuve Clicquot champagne. Dry, balanced, and full-bodied.', '{wine,alcohol,brut,champagne,veuve}', '{}', '{all}', '{all}', true),

-- ── Food & Snacks (6) ──────────────────────────────────────────
('Jade Leaf Matcha Barista Blend, Ceremonial Grade Matcha Green Tea Powder', 'amazon', 'https://www.amazon.com/dp/B097Z6ZH1S?tag=daysightremin-20', 'food_snacks', 'low', 'Ceremonial grade matcha powder that blends smooth into lattes and tea.', '{matcha,greentea,tea}', '{}', '{all}', '{all}', true),
('Ferrero Collection, Premium Assorted Treats', 'amazon', 'https://www.amazon.com/dp/B01BDI89SW?tag=daysightremin-20', 'food_snacks', 'low', 'A premium assortment of Rocher, Rondnoir, and Raffaello chocolates.', '{chocolate,coconut,darkchocolate,ferrero,hazelnut}', '{}', '{all}', '{all}', true),
('Lovetta Dubai Chocolate Bar', 'amazon', 'https://www.amazon.com/dp/B0DH59T4ZJ?tag=daysightremin-20', 'food_snacks', 'low', 'Dubai-style chocolate bar with pistachio and knafeh filling inside.', '{chocolate,pistachio,dubai,knafeh,sweet,milk}', '{}', '{all}', '{all}', true),
('RXBAR Protein Bars, Coconut Chocolate', 'amazon', 'https://www.amazon.com/dp/B0143NQVI4?tag=daysightremin-20', 'food_snacks', 'low', 'Clean protein bar made with egg whites, dates, and nuts. No fillers.', '{protein,bar,snack,cashew,dates,almonds,nuts}', '{}', '{all}', '{all}', true),
('Lindt LINDOR Milk Chocolate Candy Truffles, 60 Count Box', 'amazon', 'https://www.amazon.com/dp/B002RBTV78?tag=daysightremin-20', 'food_snacks', 'low', '60 individually wrapped milk chocolate truffles in a shareable gift box.', '{chocolate,milk,lindor,lindt,box,truffle}', '{}', '{all}', '{all}', true),
('ILLY CAFFE Medium Roast Espresso Classico Ground Coffee', 'amazon', 'https://www.amazon.com/dp/B00DTR9R9Q?tag=daysightremin-20', 'food_snacks', 'low', 'Classic Italian espresso grind, smooth medium roast with balanced flavor.', '{coffee,ground,roast,illy,café,caffe,espresso}', '{}', '{all}', '{all}', true),

-- ── Home (7) ───────────────────────────────────────────────────
('Owala Stainless Steel Water Bottle', 'amazon', 'https://www.amazon.com/dp/B0BZYCJK89?tag=daysightremin-20', 'home', 'low', 'Insulated and leak-proof with a built-in straw. Fits any cup holder.', '{water,bottle,owala}', '{}', '{all}', '{all}', true),
('Alpha Grillers Meat Thermometer', 'amazon', 'https://www.amazon.com/dp/B00S93EQUK?tag=daysightremin-20', 'home', 'low', 'Instant-read digital thermometer, perfect for grilling and roasting.', '{cooking,meat,thermometer,steak,grill,chef}', '{}', '{all}', '{all}', true),
('Stanley Quencher H2.0 Tumbler', 'amazon', 'https://www.amazon.com/dp/B0CV64341S?tag=daysightremin-20', 'home', 'low', 'Keeps drinks cold for hours and fits in a car cup holder. Flip straw.', '{water,bottle,stanley,quencher}', '{}', '{all}', '{all}', true),
('Cocorrína Reed Diffuser Set, Scented Diffuser with Sticks', 'amazon', 'https://www.amazon.com/dp/B0B24QJ217?tag=daysightremin-20', 'home', 'low', 'Long-lasting reed diffuser that fills a room without needing a flame.', '{diffuser,scent,smell,fragrance,home,décor}', '{}', '{all}', '{all}', true),
('Owala Stainless Steel Coffee Tumbler', 'amazon', 'https://www.amazon.com/dp/B0DF472VMZ?tag=daysightremin-20', 'home', 'low', 'Insulated stainless steel tumbler that keeps coffee hot for hours.', '{tumbler,cup,mug,owala,coffee}', '{}', '{all}', '{all}', true),
('Etekcity Food Kitchen Scale', 'amazon', 'https://www.amazon.com/dp/B0113UZJE2?tag=daysightremin-20', 'home', 'low', 'Simple and accurate digital kitchen scale for cooking, baking, and prep.', '{kitchen,scale,weigh,cooking,cook}', '{}', '{all}', '{all}', true),
('Satya Incense Gift Set', 'amazon', 'https://www.amazon.com/dp/B01EB1QOGW?tag=daysightremin-20', 'home', 'low', 'Assorted incense sticks in a sampler box with classic and floral scents.', '{incense,smell,scent,candle}', '{}', '{all}', '{all}', true),

-- ── Books (8) ──────────────────────────────────────────────────
('Elon Musk by Walter Isaacson', 'amazon', 'https://www.amazon.com/dp/1982181281?tag=daysightremin-20', 'books', 'low', 'The inside story of one of tech''s most ambitious and polarizing people.', '{book,business,entrepreneurship,musk,biography,technology,nonfiction,startup}', '{}', '{all}', '{all}', true),
('Den of Thieves by James B. Stewart', 'amazon', 'https://www.amazon.com/dp/067179227X?tag=daysightremin-20', 'books', 'low', 'A true story of greed and insider trading on Wall Street.', '{nonfiction,finance,financial}', '{}', '{all}', '{all}', true),
('The Upstarts by Brad Stone', 'amazon', 'https://www.amazon.com/dp/316388416?tag=daysightremin-20', 'books', 'low', 'How Uber and Airbnb rewrote the rules of business from the ground up.', '{book,business,entrepreneurship,biography,technology,nonfiction,airbnb,uber,startup}', '{}', '{all}', '{all}', true),
('The Everything Store by Brad Stone', 'amazon', 'https://www.amazon.com/dp/316219282?tag=daysightremin-20', 'books', 'low', 'The story behind Jeff Bezos, Amazon, and building a retail empire.', '{book,business,entrepreneurship,biography,technology,nonfiction,amazon,startup}', '{}', '{all}', '{all}', true),
('The Hobbit by J.R.R. Tolkien', 'amazon', 'https://www.amazon.com/dp/054792822X?tag=daysightremin-20', 'books', 'low', 'The classic quest that launched Middle-earth. A beloved adventure for all ages.', '{book,fiction,classic,hobbit,tolkien,fantasy,novel,story}', '{}', '{all}', '{all}', true),
('The Fellowship of the Ring by J.R.R. Tolkien', 'amazon', 'https://www.amazon.com/dp/547928211?tag=daysightremin-20', 'books', 'low', 'The first book in the Lord of the Rings trilogy. Essential fantasy fiction.', '{book,fiction,classic,hobbit,tolkien,fantasy,novel,story}', '{}', '{all}', '{all}', true),
('Atomic Habits by James Clear', 'amazon', 'https://www.amazon.com/dp/735211299?tag=daysightremin-20', 'books', 'low', 'A practical guide to building good habits and breaking bad ones.', '{book,self-help,nonfiction,habits,psychology}', '{}', '{all}', '{all}', true),
('A Man Called Ove: A Novel by Fredrik Backman', 'amazon', 'https://www.amazon.com/dp/9781476738024?tag=daysightremin-20', 'books', 'low', 'A grumpy widower finds unexpected friendships in this bestselling novel.', '{book,fiction,novel}', '{}', '{all}', '{all}', true),

-- ── Electronics (8) ────────────────────────────────────────────
('Apple AirPods 4 Wireless Earbuds', 'amazon', 'https://www.amazon.com/dp/B0DGHMNQ5Z?tag=daysightremin-20', 'electronics', 'high', 'Active noise cancelling, all-day comfort, and seamless Apple pairing.', '{earbud,music,apple,airpod,podcast}', '{}', '{all}', '{all}', true),
('Apple Air Tag (2nd Generation)', 'amazon', 'https://www.amazon.com/dp/B0GJTFXNRX?tag=daysightremin-20', 'electronics', 'low', 'Tiny Bluetooth tracker for keys, bags, or anything you tend to lose.', '{apple,airtag}', '{}', '{all}', '{all}', true),
('INIU Wireless Charger, 15W Fast Wireless Charging Station', 'amazon', 'https://www.amazon.com/dp/B08LVSFN4X?tag=daysightremin-20', 'electronics', 'low', '15W wireless charging pad that works with any Qi-compatible phone.', '{phone,wireless,charging,charger}', '{}', '{all}', '{all}', true),
('Sony WH-CH520 Wireless Headphones', 'amazon', 'https://www.amazon.com/dp/B0BS1PRC4L?tag=daysightremin-20', 'electronics', 'medium', 'Lightweight wireless headphones with a 50-hour battery and clear sound.', '{headphone,wireless,sony,music,podcast}', '{}', '{all}', '{all}', true),
('Anker Soundcore 2 Portable Bluetooth Speaker', 'amazon', 'https://www.amazon.com/dp/B01MTB55WH?tag=daysightremin-20', 'electronics', 'low', 'Portable Bluetooth speaker with full bass and 24-hour battery life.', '{speaker,bluetooth,anker,music,stereo}', '{}', '{all}', '{all}', true),
('Beats Solo 4', 'amazon', 'https://www.amazon.com/dp/B0CZPGX972?tag=daysightremin-20', 'electronics', 'high', 'Premium on-ear headphones with spatial audio and up to 50 hours of play.', '{headphone,wireless,beats,music,podcast}', '{}', '{all}', '{all}', true),
('Life360 Tile - Bluetooth Tracker, Keys Finder and Item Locator', 'amazon', 'https://www.amazon.com/dp/B0D63657GY?tag=daysightremin-20', 'electronics', 'low', 'Slim Bluetooth tracker that clips onto keys, slides into wallets or bags.', '{bluetooth,key,find,lost,loses,finder,tracker}', '{}', '{all}', '{all}', true),
('Loop Experience 2 Ear Plugs for Hearing Protection', 'amazon', 'https://www.amazon.com/dp/B0D4DFQTMJ?tag=daysightremin-20', 'electronics', 'low', 'High-fidelity ear plugs that reduce volume without muddying the sound.', '{music,concert,nightlife,clubbing,club,dj,musician,loud,hearing,protection}', '{}', '{all}', '{all}', true),

-- ── Sports (6) ─────────────────────────────────────────────────
('ZELUS Weighted Vest for Workout', 'amazon', 'https://www.amazon.com/dp/B07518RBH2?tag=daysightremin-20', 'sports', 'medium', 'Adjustable weighted vest for bodyweight training and running drills.', '{weight,sport,exercise,workout,strength,strong}', '{man}', '{all}', '{all}', true),
('Titleist Pro V1 Golf Balls', 'amazon', 'https://www.amazon.com/dp/B0DPN7QZ9R?tag=daysightremin-20', 'sports', 'medium', 'Tour-level golf balls with long distance and consistent short game.', '{golf,golfing,titleist,prov1}', '{man}', '{all}', '{all}', true),
('Wilson US Open Tennis Balls', 'amazon', 'https://www.amazon.com/dp/B0DC7ZZP5V?tag=daysightremin-20', 'sports', 'low', 'Official US Open ball, sold in a 3-pack. Great for regular players.', '{tennis,ball}', '{}', '{all}', '{all}', true),
('FBSPORT Ping Pong Paddle Set', 'amazon', 'https://www.amazon.com/dp/B088R1P8QC?tag=daysightremin-20', 'sports', 'low', 'Comes with two paddles, three balls, and a handy carrying case.', '{tabletennis,sports,fun,game,play}', '{}', '{all}', '{all}', true),
('Apple Watch SE 3 Smartwatch', 'amazon', 'https://www.amazon.com/dp/B0FQFNRH72?tag=daysightremin-20', 'sports', 'high', 'Fitness tracking, heart rate monitoring, and notifications on your wrist.', '{smartwatch,sports,running,heart,sleep,watch,apple}', '{}', '{all}', '{all}', true),
('Optimum Nutrition Gold Standard 100% Whey Protein Powder', 'amazon', 'https://www.amazon.com/dp/B000GISTZ4?tag=daysightremin-20', 'sports', 'medium', 'Popular whey protein powder for post-workout recovery. 24g protein per serving.', '{protein,powder,sports,workout,whey,lifting,weightlift}', '{man}', '{all}', '{all}', true),

-- ── Apparel (6) ────────────────────────────────────────────────
('Crocs Classic Clog', 'amazon', 'https://www.amazon.com/dp/B0FBS23TFH?tag=daysightremin-20', 'apparel', 'medium', 'Lightweight, cushioned, and easy to clean. Fits a wide range of occasions.', '{shoe,crocs,clog,shoes}', '{}', '{all}', '{all}', true),
('Nike Unisex Adult Crew Socks', 'amazon', 'https://www.amazon.com/dp/B00K5CN2EE?tag=daysightremin-20', 'apparel', 'low', 'Cushioned cotton crew socks in a 6-pack. A reliable everyday staple.', '{socks,clothing,clothes,nike}', '{}', '{all}', '{all}', true),
('Adidas Unisex Adult Samba Indoor Shoe', 'amazon', 'https://www.amazon.com/dp/B0CKMRBH97?tag=daysightremin-20', 'apparel', 'high', 'The classic Adidas Samba in black and white. A staple sneaker.', '{shoe,shoes,soccer,football,adidas,indoor}', '{}', '{all}', '{all}', true),
('Under Armour Men''s Tech Golf Polo', 'amazon', 'https://www.amazon.com/dp/B01GH5KNR6?tag=daysightremin-20', 'apparel', 'low', 'Breathable and quick-drying polo shirt, great for golf or casual wear.', '{shirt,polo,golf,underarmor}', '{man}', '{all}', '{all}', true),
('luvamia Wide Leg Jeans for Women', 'amazon', 'https://www.amazon.com/dp/B0CP9HK36V?tag=daysightremin-20', 'apparel', 'medium', 'Relaxed-fit wide-leg jeans with a flattering high waist and deep pockets.', '{woman,jeans,pants,flare,baggy,pockets,she,her}', '{woman}', '{all}', '{all}', true),
('AUTOMET Women''s Oversized Jeans Jacket', 'amazon', 'https://www.amazon.com/dp/B0D8VTLXTC?tag=daysightremin-20', 'apparel', 'medium', 'Oversized denim jacket that layers well over almost anything casual.', '{woman,jeans,jacket,pockets,she,her}', '{woman}', '{all}', '{all}', true),

-- ── Beauty (2) ─────────────────────────────────────────────────
('Innisfree Volcanic Clay Face Mask', 'amazon', 'https://www.amazon.com/dp/B0CQZ3W88P?tag=daysightremin-20', 'beauty', 'low', 'Korean volcanic clay mask that draws out dirt and tightens pores.', '{skincare,korean,mask,clay,skin}', '{woman}', '{all}', '{all}', false),
('BIODANCE Bio-Collagen Hydrating Overnight Hydrogel Face Mask', 'amazon', 'https://www.amazon.com/dp/B0B2RM68G2?tag=daysightremin-20', 'beauty', 'low', 'Korean hydrogel face mask you wear overnight for deep, lasting hydration.', '{skincare,korean,mask,skin}', '{woman}', '{all}', '{all}', true),

-- ── Jewelry (2) ────────────────────────────────────────────────
('Swarovski Mesmera Collection Necklaces', 'amazon', 'https://www.amazon.com/dp/B0CDQSGL9R?tag=daysightremin-20', 'jewelry', 'high', 'A sleek crystal pendant necklace with a modern trillion cut design.', '{woman,jewelry,necklace,pendant,she,her}', '{woman}', '{all}', '{all}', true),
('Swarovski Stone Crystal Pierced Hoop Earring Jewelry Collection', 'amazon', 'https://www.amazon.com/dp/B095VF1VZR?tag=daysightremin-20', 'jewelry', 'medium', 'Sparkling crystal hoop earrings that work for everyday or dressed up.', '{woman,jewelry,earring,she,her,crystal,hoop,ear}', '{woman}', '{all}', '{all}', true),

-- ── Wellness (4) ───────────────────────────────────────────────
('Vitamin D-5,000 - Vitamin D3 Supplement', 'amazon', 'https://www.amazon.com/dp/B0797HQFGT?tag=daysightremin-20', 'wellness', 'low', 'High-strength vitamin D3 capsules intended to support immune function and bone health.', '{vitamin,supplement,heart,immune,sport,athlete,healthy,nutrition,nutrient}', '{}', '{all}', '{all}', true),
('Emergen-C 1000mg Vitamin C Powder', 'amazon', 'https://www.amazon.com/dp/B00016RL9G?tag=daysightremin-20', 'wellness', 'low', 'Fizzy vitamin C drink packets with zinc and electrolytes. 30 servings.', '{vitamin,supplement,immune,sport,athlete,healthy,nutrition,nutrient,zinc,electrolytes}', '{}', '{all}', '{all}', true),
('Magnesium Glycinate', 'amazon', 'https://www.amazon.com/dp/B0F5XYHRPV?tag=daysightremin-20', 'wellness', 'low', 'Gentle magnesium supplement designed to support sleep, relaxation, and muscle recovery.', '{vitamin,supplement,immune,sport,athlete,healthy,nutrition,nutrient,magnesium}', '{}', '{all}', '{all}', true),
('RYZE SUPERFOODS Mushroom Coffee with 6 Adaptogenic Mushrooms', 'amazon', 'https://www.amazon.com/dp/B0FSGHP1FC?tag=daysightremin-20', 'wellness', 'medium', 'Mushroom-based coffee alternative with mushroom extract and less caffeine.', '{supplement,immune,sport,athlete,healthy,nutrition,nutrient,coffee,mushroom,superfood,keto}', '{}', '{all}', '{all}', true),

-- ── Games & Toys (4) ───────────────────────────────────────────
('LEGO Botanical Happy Plants', 'amazon', 'https://www.amazon.com/dp/B0DRW6C2RF?tag=daysightremin-20', 'games_toys', 'low', 'A colorful buildable plant set that looks great on any desk or shelf.', '{lego,toy}', '{}', '{all}', '{all}', true),
('Rubik''s Cube Original', 'amazon', 'https://www.amazon.com/dp/B092W7D64G?tag=daysightremin-20', 'games_toys', 'low', 'The original 3x3 puzzle cube. Still tricky, still fun.', '{toy,rubik,cube,game,puzzle,fun}', '{}', '{all}', '{all}', true),
('Jenga Wood Block Game', 'amazon', 'https://www.amazon.com/dp/B0D87PKYYK?tag=daysightremin-20', 'games_toys', 'low', 'The classic pull-a-block tower game. Simple rules, fun with groups.', '{jenga,game,board,fun}', '{}', '{all}', '{all}', true),
('Giant UNO Card Game', 'amazon', 'https://www.amazon.com/dp/B07Y98CFPB?tag=daysightremin-20', 'games_toys', 'low', 'Oversized UNO cards that make game night louder and harder to ignore.', '{uno,card,game,fun}', '{}', '{all}', '{all}', true),

-- ── Pet (2) ────────────────────────────────────────────────────
('Dog Squeak Toy Plush, 5-Pack', 'amazon', 'https://www.amazon.com/dp/B07YWCVKFH?tag=daysightremin-20', 'pet', 'low', 'Five colorful squeaky plush toys in different shapes and sizes.', '{dog,toy,pet}', '{}', '{all}', '{all}', false),
('BLACK+DECKER Pet Hair Remover', 'amazon', 'https://www.amazon.com/dp/B09YN468KG?tag=daysightremin-20', 'pet', 'low', 'Reusable lint roller that lifts pet hair from furniture and car seats.', '{pet,cat,dog,fur}', '{}', '{all}', '{all}', true);

-- ── 5. Remap contacts.gift_categories arrays ────────────────────────────────
-- For any existing users who selected now-removed or renamed categories.

-- Renames
UPDATE public.contacts
SET gift_categories = array_replace(gift_categories, 'treats', 'food_snacks')
WHERE 'treats' = ANY(gift_categories);

UPDATE public.contacts
SET gift_categories = array_replace(gift_categories, 'accessories', 'beauty')
WHERE 'accessories' = ANY(gift_categories);

-- Removals (strip retired categories from arrays)
UPDATE public.contacts
SET gift_categories = array_remove(gift_categories, 'gift_card')
WHERE 'gift_card' = ANY(gift_categories);

UPDATE public.contacts
SET gift_categories = array_remove(gift_categories, 'experiences')
WHERE 'experiences' = ANY(gift_categories);

-- If a contact now has an empty array after removals, give them sensible defaults
UPDATE public.contacts
SET gift_categories = '{flowers,home}'
WHERE gift_categories = '{}';

-- ── 6. Remap profiles.default_gift_categories ───────────────────────────────
UPDATE public.profiles
SET default_gift_categories = array_replace(default_gift_categories, 'treats', 'food_snacks')
WHERE 'treats' = ANY(default_gift_categories);

UPDATE public.profiles
SET default_gift_categories = array_replace(default_gift_categories, 'accessories', 'beauty')
WHERE 'accessories' = ANY(default_gift_categories);

UPDATE public.profiles
SET default_gift_categories = array_remove(default_gift_categories, 'gift_card')
WHERE 'gift_card' = ANY(default_gift_categories);

UPDATE public.profiles
SET default_gift_categories = array_remove(default_gift_categories, 'experiences')
WHERE 'experiences' = ANY(default_gift_categories);

-- If profile defaults are now empty, set sensible defaults
UPDATE public.profiles
SET default_gift_categories = '{flowers,home}'
WHERE default_gift_categories = '{}';

-- ── 7. Update column defaults ───────────────────────────────────────────────
-- profiles.default_gift_categories was defaulting to '{gift_card}'
ALTER TABLE public.profiles
  ALTER COLUMN default_gift_categories SET DEFAULT '{flowers,home}';

COMMIT;
