-- ============================================================================
-- Daysight — Migration 018: Populate gift_catalog.image_url with self-hosted paths
--
-- Sets image_url for all 72 gift_catalog rows to point to self-hosted images
-- served from daysight.xyz/gifts/ via Vercel CDN.
--
-- Why self-hosted: Amazon CDN URLs cannot be hotlinked in emails (blocked by
-- Amazon in non-browser contexts, and URLs expire). UrbanStems/Wine.com URLs
-- also expire. All images are pre-downloaded to public/gifts/ and served from
-- our own domain.
--
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================================

BEGIN;

UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/owala-stainless-steel-water-bottle.jpg' WHERE name = 'Owala Stainless Steel Water Bottle';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/alpha-grillers-meat-thermometer.jpg' WHERE name = 'Alpha Grillers Meat Thermometer';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/elon-musk-by-walter-isaacson.jpg' WHERE name = 'Elon Musk by Walter Isaacson';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/den-of-thieves-by-james-b-stewart.jpg' WHERE name = 'Den of Thieves by James B. Stewart';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/apple-airpods-4-wireless-earbuds.jpg' WHERE name = 'Apple AirPods 4 Wireless Earbuds';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/innisfree-volcanic-clay-face-mask.jpg' WHERE name = 'Innisfree Volcanic Clay Face Mask';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/dog-squeak-toy-plush-5-pack.jpg' WHERE name = 'Dog Squeak Toy Plush, 5-Pack';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/zelus-weighted-vest-for-workout.jpg' WHERE name = 'ZELUS Weighted Vest for Workout';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/titleist-pro-v1-golf-balls.jpg' WHERE name = 'Titleist Pro V1 Golf Balls';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/wilson-us-open-tennis-balls.jpg' WHERE name = 'Wilson US Open Tennis Balls';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/jade-leaf-matcha-barista-blend-ceremonial-grade-matcha-green.jpg' WHERE name = 'Jade Leaf Matcha Barista Blend, Ceremonial Grade Matcha Green Tea Powder';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/apple-air-tag-2nd-generation.jpg' WHERE name = 'Apple Air Tag (2nd Generation)';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/the-upstarts-by-brad-stone.jpg' WHERE name = 'The Upstarts by Brad Stone';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/the-everything-store-by-brad-stone.jpg' WHERE name = 'The Everything Store by Brad Stone';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/the-hobbit-by-j-r-r-tolkien.jpg' WHERE name = 'The Hobbit by J.R.R. Tolkien';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/the-fellowship-of-the-ring-by-j-r-r-tolkien.jpg' WHERE name = 'The Fellowship of the Ring by J.R.R. Tolkien';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/atomic-habits-by-james-clear.jpg' WHERE name = 'Atomic Habits by James Clear';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/crocs-classic-clog.jpg' WHERE name = 'Crocs Classic Clog';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/nike-unisex-adult-crew-socks.jpg' WHERE name = 'Nike Unisex Adult Crew Socks';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/fbsport-ping-pong-paddle-set.jpg' WHERE name = 'FBSPORT Ping Pong Paddle Set';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/lego-botanical-happy-plants.jpg' WHERE name = 'LEGO Botanical Happy Plants';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/the-sorbet-flower-bouquet.jpg' WHERE name = 'The Sorbet Flower Bouquet';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/the-firecracker-flower-bouquet.jpg' WHERE name = 'The Firecracker Flower Bouquet';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/the-peony-flower-bouquet.jpg' WHERE name = 'The Peony Flower Bouquet';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/ferrero-collection-premium-assorted-treats.jpg' WHERE name = 'Ferrero Collection, Premium Assorted Treats';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/lovetta-dubai-chocolate-bar.jpg' WHERE name = 'Lovetta Dubai Chocolate Bar';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/rubik-s-cube-original.jpg' WHERE name = 'Rubik''s Cube Original';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/stanley-quencher-h2-0-tumbler.jpg' WHERE name = 'Stanley Quencher H2.0 Tumbler';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/laurent-perrier-la-cuvee-brut-champagne.jpg' WHERE name = 'Laurent-Perrier La Cuvee Brut Champagne';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/chateau-bourdieu-no-1-2018-red-wine.jpg' WHERE name = 'Chateau Bourdieu No.1 2018 Red Wine';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/grand-napa-vineyards-los-carneros-chardonnay-2024.jpg' WHERE name = 'Grand Napa Vineyards Los Carneros Chardonnay 2024';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/rxbar-protein-bars-coconut-chocolate.jpg' WHERE name = 'RXBAR Protein Bars, Coconut Chocolate';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/lindt-lindor-milk-chocolate-candy-truffles-60-count-box.jpg' WHERE name = 'Lindt LINDOR Milk Chocolate Candy Truffles, 60 Count Box ';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/cocorr-na-reed-diffuser-set-scented-diffuser-with-sticks.jpg' WHERE name = 'Cocorrína Reed Diffuser Set, Scented Diffuser with Sticks';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/owala-stainless-steel-coffee-tumbler.jpg' WHERE name = 'Owala Stainless Steel Coffee Tumbler';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/biodance-bio-collagen-hydrating-overnight-hydrogel-face-mask.jpg' WHERE name = 'BIODANCE Bio-Collagen Hydrating Overnight Hydrogel Face Mask';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/etekcity-food-kitchen-scale.jpg' WHERE name = 'Etekcity Food Kitchen Scale';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/iniu-wireless-charger-15w-fast-wireless-charging-station.jpg' WHERE name = 'INIU Wireless Charger, 15W Fast Wireless Charging Station';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/apple-watch-se-3-smartwatch.jpg' WHERE name = 'Apple Watch SE 3 Smartwatch';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/sony-wh-ch520-wireless-headphones.jpg' WHERE name = 'Sony WH-CH520 Wireless Headphones';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/optimum-nutrition-gold-standard-100-whey-protein-powder.jpg' WHERE name = 'Optimum Nutrition Gold Standard 100% Whey Protein Powder';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/swarovski-mesmera-collection-necklaces.jpg' WHERE name = 'Swarovski Mesmera Collection Necklaces';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/vitamin-d-5-000-vitamin-d3-supplement.jpg' WHERE name = 'Vitamin D-5,000 - Vitamin D3 Supplement';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/emergen-c-1000mg-vitamin-c-powder.jpg' WHERE name = 'Emergen-C 1000mg Vitamin C Powder';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/magnesium-glycinate.jpg' WHERE name = 'Magnesium Glycinate ';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/adidas-unisex-adult-samba-indoor-shoe.jpg' WHERE name = 'Adidas Unisex Adult Samba Indoor Shoe';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/swarovski-stone-crystal-pierced-hoop-earring-jewelry-collect.jpg' WHERE name = 'Swarovski Stone Crystal Pierced Hoop Earring Jewelry Collection ';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/ryze-superfoods-mushroom-coffee-with-6-adaptogenic-mushrooms.jpg' WHERE name = 'RYZE SUPERFOODS Mushroom Coffee with 6 Adaptogenic Mushrooms';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/illy-caffe-medium-roast-espresso-classico-ground-coffee.jpg' WHERE name = 'ILLY CAFFE Medium Roast Espresso Classico Ground Coffee';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/black-decker-pet-hair-remover.jpg' WHERE name = 'BLACK+DECKER Pet Hair Remover';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/under-armour-men-s-tech-golf-polo.jpg' WHERE name = 'Under Armour Men''s Tech Golf Polo';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/luvamia-wide-leg-jeans-for-women.jpg' WHERE name = 'luvamia Wide Leg Jeans for Women';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/automet-women-s-oversized-jeans-jacket.jpg' WHERE name = 'AUTOMET Women''s Oversized Jeans Jacket';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/jenga-wood-block-game.jpg' WHERE name = 'Jenga Wood Block Game';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/giant-uno-card-game.jpg' WHERE name = 'Giant UNO Card Game';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/heir-apparent-stags-leap-district-cabernet-sauvignon-2022.jpg' WHERE name = 'Heir Apparent Stags Leap District Cabernet Sauvignon 2022';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/grand-napa-vineyards-los-carneros-pinot-noir-2023.jpg' WHERE name = 'Grand Napa Vineyards Los Carneros Pinot Noir 2023';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/a-man-called-ove-a-novel-by-fredrik-backman.jpg' WHERE name = 'A Man Called Ove: A Novel by Fredrik Backman';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/the-good-vibes-flower-bouquet.jpg' WHERE name = 'The Good Vibes Flower Bouquet';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/the-coquette-flower-bouquet.jpg' WHERE name = 'The Coquette Flower Bouquet';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/the-unicorn-flower-bouquet.jpg' WHERE name = 'The Unicorn Flower Bouquet';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/anker-soundcore-2-portable-bluetooth-speaker.jpg' WHERE name = 'Anker Soundcore 2 Portable Bluetooth Speaker';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/beats-solo-4.jpg' WHERE name = 'Beats Solo 4';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/life360-tile-bluetooth-tracker-keys-finder-and-item-locator.jpg' WHERE name = 'Life360 Tile - Bluetooth Tracker, Keys Finder and Item Locator';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/satya-incense-gift-set.jpg' WHERE name = 'Satya Incense Gift Set';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/loop-experience-2-ear-plugs-for-hearing-protection.jpg' WHERE name = 'Loop Experience 2 Ear Plugs for Hearing Protection';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/veuve-clicquot-yellow-label-brut.jpg' WHERE name = 'Veuve Clicquot Yellow Label Brut';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/muso-wood-book-ends.jpg' WHERE name = 'Muso Wood Book Ends';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/tramontina-professional-10-inch-non-stick-frying-pan.jpg' WHERE name = 'Tramontina Professional 10-Inch Non Stick Frying Pan';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/smith-signal-cycling-helmet.jpg' WHERE name = 'SMITH Signal Cycling Helmet';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/repel-windproof-travel-umbrella.jpg' WHERE name = 'Repel Windproof Travel Umbrella';
UPDATE public.gift_catalog SET image_url = 'https://daysight.xyz/gifts/ukulele-mahogany-adults-kit-for-beginners.jpg' WHERE name = 'Ukulele (Mahogany), Adults Kit for Beginners';
COMMIT;
