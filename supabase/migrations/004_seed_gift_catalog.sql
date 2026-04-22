-- ============================================================================
-- Daysight — Migration 004: Seed Gift Catalog
-- ~30 realistic placeholder gifts across all 8 categories, 3 price tiers.
-- Tags, relationship/event affinities, and last-minute flags populated.
-- Run in Supabase Dashboard → SQL Editor.
-- Replace affiliate_urls with real partner links before launch.
-- ============================================================================

INSERT INTO public.gift_catalog (name, partner, affiliate_url, category, price_tier, tags, relationship_affinities, event_affinities, is_last_minute) VALUES

-- ── Flowers ─────────────────────────────────────────────────────────────────
('Seasonal Bouquet',           'Bouqs',        'https://bouqs.com',                'flowers', 'mid',  '{classic,colorful}',            '{family,friend,colleague}',   '{birthday,anniversary}',      false),
('Dried Flower Arrangement',   'Urbanstems',   'https://urbanstems.com',           'flowers', 'low',  '{minimalist,lasting}',          '{friend,colleague}',          '{birthday}',                  false),
('Premium Rose Collection',    'FTD',          'https://ftd.com',                  'flowers', 'high', '{romantic,luxury}',             '{family,friend}',             '{anniversary}',               false),
('Same-Day Delivery Tulips',   'Bouqs',        'https://bouqs.com/same-day',       'flowers', 'mid',  '{classic,bright}',              '{family,friend,colleague}',   '{birthday,anniversary}',      true),

-- ── Wine ────────────────────────────────────────────────────────────────────
('Monthly Wine Box (3 bottles)','Winc',        'https://winc.com',                 'wine',    'mid',  '{curated,discovery}',           '{friend,colleague}',          '{birthday}',                  false),
('Napa Valley Cabernet',       'Wine.com',     'https://wine.com',                 'wine',    'high', '{bold,classic}',                '{family,friend}',             '{birthday,anniversary}',      false),
('Sparkling Wine Duo',         'Wine.com',     'https://wine.com',                 'wine',    'low',  '{celebratory,bubbly}',          '{friend,colleague}',          '{birthday,anniversary}',      false),
('Wine & Cheese Hamper',       'Harry & David','https://harryanddavid.com',        'wine',    'high', '{gourmet,shareable}',           '{family,friend}',             '{anniversary}',               false),

-- ── Treats ──────────────────────────────────────────────────────────────────
('Artisan Chocolate Box',      'Vosges',       'https://vosgeschocolate.com',      'treats',  'mid',  '{chocolate,gourmet}',           '{family,friend,colleague}',   '{birthday,anniversary}',      false),
('Cookie Delivery Box',        'Levain',       'https://levainbakery.com',         'treats',  'low',  '{baked,comfort}',               '{friend,colleague}',          '{birthday}',                  true),
('Luxury Truffle Collection',  'La Maison',    'https://lamaisonduchocolat.com',   'treats',  'high', '{chocolate,luxury,french}',     '{family,friend}',             '{birthday,anniversary}',      false),
('Snack Care Package',         'Mouth',        'https://mouth.com',               'treats',  'low',  '{variety,fun}',                 '{friend,colleague}',          '{birthday}',                  true),

-- ── Gift Cards ──────────────────────────────────────────────────────────────
('Amazon eGift Card',          'Amazon',       'https://amazon.com/gift-cards',    'gift_card','mid', '{universal,instant}',           '{family,friend,colleague,other}','{birthday,anniversary,custom}', true),
('DoorDash Gift Card',         'DoorDash',     'https://doordash.com/gift-cards',  'gift_card','low', '{food,convenience}',            '{friend,colleague}',          '{birthday,custom}',           true),
('Airbnb Gift Card',           'Airbnb',       'https://airbnb.com/gift-cards',    'gift_card','high','{travel,adventure}',            '{family,friend}',             '{birthday,anniversary}',      true),
('Spotify Premium Gift',       'Spotify',      'https://spotify.com/gift',         'gift_card','low', '{music,digital}',               '{friend,colleague,other}',    '{birthday,custom}',           true),

-- ── Experiences ─────────────────────────────────────────────────────────────
('Cooking Class Voucher',      'Sur La Table', 'https://surlatable.com/classes',   'experiences','mid','{foodie,hands-on,social}',     '{friend,family}',             '{birthday,anniversary}',      false),
('Spa Day Gift Card',          'Spafinder',    'https://spafinder.com',            'experiences','high','{relaxation,luxury,wellness}', '{family,friend}',             '{birthday,anniversary}',      false),
('Local Food Tour',            'Airbnb',       'https://airbnb.com/experiences',   'experiences','mid','{foodie,adventure,local}',      '{friend,family}',             '{birthday}',                  false),
('Online Masterclass Pass',    'MasterClass',  'https://masterclass.com/gift',     'experiences','mid','{learning,digital,creative}',   '{friend,colleague,family}',   '{birthday,custom}',           true),

-- ── Donations ───────────────────────────────────────────────────────────────
('Plant a Tree in Their Name', 'One Tree Planted','https://onetreeplanted.org',    'donation','low',  '{eco,meaningful}',              '{friend,colleague,other}',    '{birthday,custom}',           true),
('Charity Water Gift Card',    'charity: water','https://donate.charitywater.org', 'donation','mid',  '{humanitarian,impactful}',      '{family,friend,colleague}',   '{birthday,custom}',           true),
('Kiva Microloan Gift',        'Kiva',         'https://kiva.org/gifts',           'donation','low',  '{entrepreneurship,global}',     '{colleague,friend}',          '{birthday,custom}',           true),

-- ── Home ────────────────────────────────────────────────────────────────────
('Scented Candle Set',         'Voluspa',      'https://voluspa.com',              'home',    'low',  '{cozy,aromatic}',               '{friend,family,colleague}',   '{birthday,anniversary}',      false),
('Cashmere Throw Blanket',     'Brooklinen',   'https://brooklinen.com',           'home',    'high', '{cozy,luxury,lasting}',         '{family,friend}',             '{birthday,anniversary}',      false),
('Smart Herb Garden Kit',      'AeroGarden',   'https://aerogarden.com',           'home',    'mid',  '{gardening,unique,hands-on}',   '{family,friend}',             '{birthday}',                  false),
('Soy Candle + Matches Set',   'P.F. Candle',  'https://pfcandleco.com',           'home',    'low',  '{minimalist,aromatic}',         '{friend,colleague}',          '{birthday}',                  true),

-- ── Accessories ─────────────────────────────────────────────────────────────
('Leather Passport Holder',    'Bellroy',      'https://bellroy.com',              'accessories','mid','{travel,classic,lasting}',      '{family,friend}',             '{birthday,anniversary}',      false),
('Silk Sleep Mask & Scrunchie','Slip',         'https://slipsilkpillowcase.com',   'accessories','low','{self-care,luxury}',            '{friend,family}',             '{birthday}',                  false),
('Engraved Pen Set',           'Cross',        'https://cross.com',                'accessories','mid','{professional,classic,lasting}', '{colleague,family}',          '{birthday,anniversary,custom}',false),
('Wireless Earbuds',           'JBL',          'https://jbl.com',                  'accessories','high','{tech,music,daily-use}',       '{friend,family}',             '{birthday}',                  false);
