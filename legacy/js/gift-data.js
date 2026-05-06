/**
 * Daysight – Gift Catalog Data
 * Shared by email-preview.html and admin.html.
 * In production this moves to a `gift_catalog` Postgres table with tags,
 * relationship/event affinities, and price tiers (see Blueprint Section 11.1).
 *
 * budget: 'low' = under $30, 'mid' = $30-75, 'high' = $75+, null = any
 */

const GIFT_DATA = {
  flowers: [
    { name: 'Mini Bouquet – Bouqs', description: 'Small, cheerful arrangement · Email delivery option', price: 'From $24 · Affiliate link', partner: 'Bouqs', budget: 'low' },
    { name: 'Tulip Bouquet – Bouqs', description: 'Farm-fresh, sustainably grown · Free delivery', price: 'From $49 · Affiliate link', partner: 'Bouqs', budget: 'mid' },
    { name: 'Classic Roses – 1-800-Flowers', description: '12 premium roses with vase · Next-day delivery available', price: 'From $59.99 · Affiliate link', partner: '1-800-Flowers', budget: 'mid' },
    { name: 'Luxury Arrangement – FTD', description: 'Florist-designed premium piece, locally delivered', price: 'From $89.99 · Affiliate link', partner: 'FTD', budget: 'high' },
    { name: 'Signature Collection – Teleflora', description: 'Exclusive designer arrangement with keepsake vase', price: 'From $99 · Affiliate link', partner: 'Teleflora', budget: 'high' },
  ],
  wine: [
    { name: 'Everyday Red – Wine.com', description: 'Well-rated everyday bottle · Ships next day', price: 'From $18 · Affiliate link', partner: 'Wine.com', budget: 'low' },
    { name: 'Reserve Cabernet – Wine.com', description: 'Top-rated 92-point Cab Sauv · Gift wrapped', price: 'From $35 · Affiliate link', partner: 'Wine.com', budget: 'mid' },
    { name: 'Curated Wine Trio – Winc', description: '3 bottles matched to their taste · Free shipping', price: '$50 · Affiliate link', partner: 'Winc', budget: 'mid' },
    { name: 'Champagne Gift Set – Goldbelly', description: 'Prestige cuvée with 2 crystal flutes', price: 'From $95 · Affiliate link', partner: 'Goldbelly', budget: 'high' },
  ],
  treats: [
    { name: 'Sugarfina Candy Bento Box', description: 'Gourmet candy collection · Ships in 1-2 days', price: 'From $24 · Affiliate link', partner: 'Sugarfina', budget: 'low' },
    { name: 'Artisan Chocolate Box – Vosges', description: 'Award-winning truffles, 36 pieces', price: 'From $42 · Affiliate link', partner: 'Vosges', budget: 'mid' },
    { name: 'Harry & David Favorites Tower', description: 'Gourmet snacks, cheese, chocolate, and more', price: 'From $59.99 · Affiliate link', partner: 'Harry & David', budget: 'mid' },
    { name: 'Iconic Birthday Cake – Goldbelly', description: 'Famous bakery cake shipped nationwide overnight', price: 'From $85 · Affiliate link', partner: 'Goldbelly', budget: 'high' },
  ],
  gift_card: [
    { name: 'Starbucks Gift Card', description: 'For the coffee lover in your life', price: 'From $10 · Affiliate link', partner: 'Starbucks', budget: 'low' },
    { name: 'Amazon Gift Card', description: 'Any amount, instant email delivery', price: 'From $25 · Affiliate link', partner: 'Amazon', budget: 'low' },
    { name: 'Nordstrom Gift Card', description: 'Fashion-forward, works online & in-store', price: 'From $50 · Affiliate link', partner: 'Nordstrom', budget: 'mid' },
    { name: 'Delta / United Gift Card', description: 'For the frequent traveler', price: 'From $100 · Affiliate link', partner: 'Delta', budget: 'high' },
  ],
  experiences: [
    { name: 'Airbnb Experience', description: 'Unique local activity with a local guide', price: 'From $30 · Affiliate link', partner: 'Airbnb', budget: 'low' },
    { name: 'Broadway or Show Tickets – TodayTix', description: 'Live events in their city', price: 'From $50 · Affiliate link', partner: 'TodayTix', budget: 'mid' },
    { name: 'Uncommon Goods Experience Box', description: 'Spa, cooking class, wine tasting & more', price: 'From $75 · Affiliate link', partner: 'Uncommon Goods', budget: 'mid' },
    { name: 'Omakase Dining Experience – Tock', description: "Chef's table reservation at a top restaurant", price: 'From $150 · Affiliate link', partner: 'Tock', budget: 'high' },
  ],
  donation: [
    { name: 'Plant a Tree – One Tree Planted', description: 'Plant 10 trees in their honor · Certificate included', price: '$10 · Affiliate link', partner: 'One Tree Planted', budget: 'low' },
    { name: 'Animal Rescue Donation', description: 'Support shelter animals in their name', price: 'From $25 · Affiliate link', partner: 'Best Friends', budget: 'low' },
    { name: 'Charity of their choice – JustGiving', description: 'Donate in their name to a cause they love', price: 'Any amount · Affiliate link', partner: 'JustGiving', budget: 'mid' },
  ],
};

// Same-day / last-minute gifts (used when event is ≤ 2 days away)
const GIFT_DATA_LASTMINUTE = {
  flowers: [
    { name: 'Same-Day Flowers – Instacart', description: 'Fresh flowers delivered within 2 hours from local stores', price: 'From $25 · Affiliate link', partner: 'Instacart' },
    { name: 'Local Florist – 1-800-Flowers', description: 'Same-day delivery from a florist near them', price: 'From $39.99 · Affiliate link', partner: '1-800-Flowers' },
    { name: 'FTD Same-Day Delivery', description: 'Guaranteed same-day if ordered before 2pm', price: 'From $44.99 · Affiliate link', partner: 'FTD' },
  ],
  wine: [
    { name: 'Wine via Instacart / Drizly', description: 'Delivered in under 60 minutes from a local store', price: 'From $20 · Affiliate link', partner: 'Drizly' },
    { name: 'Wine.com Express', description: 'Same-day delivery in select cities', price: 'From $30 · Affiliate link', partner: 'Wine.com' },
    { name: 'Amazon Same-Day Wine', description: 'Prime members: free same-day in eligible zip codes', price: 'Varies · Affiliate link', partner: 'Amazon' },
  ],
  treats: [
    { name: 'Chocolate via Instacart', description: 'Artisan chocolate from local stores, delivered today', price: 'From $15 · Affiliate link', partner: 'Instacart' },
    { name: 'Edible Arrangements', description: 'Fruit & chocolate arrangements, same-day pickup or delivery', price: 'From $35 · Affiliate link', partner: 'Edible Arrangements' },
    { name: 'GrubHub / DoorDash Sweet Box', description: 'Order from a local bakery for today', price: 'Varies · Affiliate link', partner: 'DoorDash' },
  ],
  gift_card: [
    { name: 'Amazon e-Gift Card', description: 'Sent instantly to their inbox — any amount', price: 'From $10 · Affiliate link', partner: 'Amazon' },
    { name: 'Apple / Google Play Gift Card', description: 'Instant digital delivery', price: 'From $15 · Affiliate link', partner: 'Apple' },
    { name: 'Uber / DoorDash Gift Card', description: 'Digital, instant — great for foodies', price: 'From $25 · Affiliate link', partner: 'Uber' },
  ],
  experiences: [
    { name: 'Amazon e-Gift Card', description: 'Let them pick their own experience', price: 'From $25 · Affiliate link', partner: 'Amazon' },
    { name: 'TodayTix Last-Minute Tickets', description: "Rush tickets for tonight's shows, available now", price: 'From $20 · Affiliate link', partner: 'TodayTix' },
    { name: 'OpenTable Gift Card (Digital)', description: 'Instant email delivery, redeemable at thousands of restaurants', price: 'From $25 · Affiliate link', partner: 'OpenTable' },
  ],
  donation: [
    { name: 'JustGiving Instant Donation', description: 'Donate right now in their name — instant confirmation', price: 'Any amount · Affiliate link', partner: 'JustGiving' },
    { name: 'One Tree Planted (Instant)', description: 'Immediate confirmation email, shareable certificate', price: 'From $1 · Affiliate link', partner: 'One Tree Planted' },
    { name: 'GoFundMe Gift', description: 'Support a cause they care about, instantly', price: 'Any amount · Affiliate link', partner: 'GoFundMe' },
  ],
};
