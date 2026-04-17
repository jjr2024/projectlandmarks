/**
 * Landmarks – Gift Catalog Data
 * Shared by email-preview.html and admin.html.
 * In production this moves to a `gift_catalog` Postgres table with tags,
 * relationship/event affinities, and price tiers (see Blueprint Section 11.1).
 *
 * budget: 'low' = under $30, 'mid' = $30-75, 'high' = $75+, null = any
 */

const GIFT_DATA = {
  flowers: [
    { emoji: '🌷', name: 'Mini Bouquet – Bouqs', description: 'Small, cheerful arrangement · Email delivery option', price: 'From $24 · Affiliate link', partner: 'Bouqs', budget: 'low' },
    { emoji: '💐', name: 'Tulip Bouquet – Bouqs', description: 'Farm-fresh, sustainably grown · Free delivery', price: 'From $49 · Affiliate link', partner: 'Bouqs', budget: 'mid' },
    { emoji: '🌹', name: 'Classic Roses – 1-800-Flowers', description: '12 premium roses with vase · Next-day delivery available', price: 'From $59.99 · Affiliate link', partner: '1-800-Flowers', budget: 'mid' },
    { emoji: '🌸', name: 'Luxury Arrangement – FTD', description: 'Florist-designed premium piece, locally delivered', price: 'From $89.99 · Affiliate link', partner: 'FTD', budget: 'high' },
    { emoji: '🌺', name: 'Signature Collection – Teleflora', description: 'Exclusive designer arrangement with keepsake vase', price: 'From $99 · Affiliate link', partner: 'Teleflora', budget: 'high' },
  ],
  wine: [
    { emoji: '🍷', name: 'Everyday Red – Wine.com', description: 'Well-rated everyday bottle · Ships next day', price: 'From $18 · Affiliate link', partner: 'Wine.com', budget: 'low' },
    { emoji: '🥂', name: 'Reserve Cabernet – Wine.com', description: 'Top-rated 92-point Cab Sauv · Gift wrapped', price: 'From $35 · Affiliate link', partner: 'Wine.com', budget: 'mid' },
    { emoji: '🍷', name: 'Curated Wine Trio – Winc', description: '3 bottles matched to their taste · Free shipping', price: '$50 · Affiliate link', partner: 'Winc', budget: 'mid' },
    { emoji: '🍾', name: 'Champagne Gift Set – Goldbelly', description: 'Prestige cuvée with 2 crystal flutes', price: 'From $95 · Affiliate link', partner: 'Goldbelly', budget: 'high' },
  ],
  treats: [
    { emoji: '🍬', name: 'Sugarfina Candy Bento Box', description: 'Gourmet candy collection · Ships in 1-2 days', price: 'From $24 · Affiliate link', partner: 'Sugarfina', budget: 'low' },
    { emoji: '🍫', name: 'Artisan Chocolate Box – Vosges', description: 'Award-winning truffles, 36 pieces', price: 'From $42 · Affiliate link', partner: 'Vosges', budget: 'mid' },
    { emoji: '🍰', name: 'Harry & David Favorites Tower', description: 'Gourmet snacks, cheese, chocolate, and more', price: 'From $59.99 · Affiliate link', partner: 'Harry & David', budget: 'mid' },
    { emoji: '🎂', name: 'Iconic Birthday Cake – Goldbelly', description: 'Famous bakery cake shipped nationwide overnight', price: 'From $85 · Affiliate link', partner: 'Goldbelly', budget: 'high' },
  ],
  gift_card: [
    { emoji: '☕', name: 'Starbucks Gift Card', description: 'For the coffee lover in your life', price: 'From $10 · Affiliate link', partner: 'Starbucks', budget: 'low' },
    { emoji: '🎁', name: 'Amazon Gift Card', description: 'Any amount, instant email delivery', price: 'From $25 · Affiliate link', partner: 'Amazon', budget: 'low' },
    { emoji: '🛒', name: 'Nordstrom Gift Card', description: 'Fashion-forward, works online & in-store', price: 'From $50 · Affiliate link', partner: 'Nordstrom', budget: 'mid' },
    { emoji: '✈️', name: 'Delta / United Gift Card', description: 'For the frequent traveler', price: 'From $100 · Affiliate link', partner: 'Delta', budget: 'high' },
  ],
  experiences: [
    { emoji: '🌍', name: 'Airbnb Experience', description: 'Unique local activity with a local guide', price: 'From $30 · Affiliate link', partner: 'Airbnb', budget: 'low' },
    { emoji: '🎭', name: 'Broadway or Show Tickets – TodayTix', description: 'Live events in their city', price: 'From $50 · Affiliate link', partner: 'TodayTix', budget: 'mid' },
    { emoji: '✨', name: 'Uncommon Goods Experience Box', description: 'Spa, cooking class, wine tasting & more', price: 'From $75 · Affiliate link', partner: 'Uncommon Goods', budget: 'mid' },
    { emoji: '🍽️', name: 'Omakase Dining Experience – Tock', description: "Chef's table reservation at a top restaurant", price: 'From $150 · Affiliate link', partner: 'Tock', budget: 'high' },
  ],
  donation: [
    { emoji: '🌱', name: 'Plant a Tree – One Tree Planted', description: 'Plant 10 trees in their honor · Certificate included', price: '$10 · Affiliate link', partner: 'One Tree Planted', budget: 'low' },
    { emoji: '🐾', name: 'Animal Rescue Donation', description: 'Support shelter animals in their name', price: 'From $25 · Affiliate link', partner: 'Best Friends', budget: 'low' },
    { emoji: '❤️', name: 'Charity of their choice – JustGiving', description: 'Donate in their name to a cause they love', price: 'Any amount · Affiliate link', partner: 'JustGiving', budget: 'mid' },
  ],
};

// Same-day / last-minute gifts (used when event is ≤ 2 days away)
const GIFT_DATA_LASTMINUTE = {
  flowers: [
    { emoji: '🌸', name: 'Same-Day Flowers – Instacart', description: 'Fresh flowers delivered within 2 hours from local stores', price: 'From $25 · Affiliate link', partner: 'Instacart' },
    { emoji: '💐', name: 'Local Florist – 1-800-Flowers', description: 'Same-day delivery from a florist near them', price: 'From $39.99 · Affiliate link', partner: '1-800-Flowers' },
    { emoji: '🌹', name: 'FTD Same-Day Delivery', description: 'Guaranteed same-day if ordered before 2pm', price: 'From $44.99 · Affiliate link', partner: 'FTD' },
  ],
  wine: [
    { emoji: '🍷', name: 'Wine via Instacart / Drizly', description: 'Delivered in under 60 minutes from a local store', price: 'From $20 · Affiliate link', partner: 'Drizly' },
    { emoji: '🎁', name: 'Wine.com Express', description: 'Same-day delivery in select cities', price: 'From $30 · Affiliate link', partner: 'Wine.com' },
    { emoji: '🛒', name: 'Amazon Same-Day Wine', description: 'Prime members: free same-day in eligible zip codes', price: 'Varies · Affiliate link', partner: 'Amazon' },
  ],
  treats: [
    { emoji: '🍫', name: 'Chocolate via Instacart', description: 'Artisan chocolate from local stores, delivered today', price: 'From $15 · Affiliate link', partner: 'Instacart' },
    { emoji: '🎂', name: 'Edible Arrangements', description: 'Fruit & chocolate arrangements, same-day pickup or delivery', price: 'From $35 · Affiliate link', partner: 'Edible Arrangements' },
    { emoji: '☕', name: 'GrubHub / DoorDash Sweet Box', description: 'Order from a local bakery for today', price: 'Varies · Affiliate link', partner: 'DoorDash' },
  ],
  gift_card: [
    { emoji: '⚡', name: 'Amazon e-Gift Card', description: 'Sent instantly to their inbox — any amount', price: 'From $10 · Affiliate link', partner: 'Amazon' },
    { emoji: '🎮', name: 'Apple / Google Play Gift Card', description: 'Instant digital delivery', price: 'From $15 · Affiliate link', partner: 'Apple' },
    { emoji: '🛒', name: 'Uber / DoorDash Gift Card', description: 'Digital, instant — great for foodies', price: 'From $25 · Affiliate link', partner: 'Uber' },
  ],
  experiences: [
    { emoji: '⚡', name: 'Amazon e-Gift Card', description: 'Let them pick their own experience', price: 'From $25 · Affiliate link', partner: 'Amazon' },
    { emoji: '🎭', name: 'TodayTix Last-Minute Tickets', description: "Rush tickets for tonight's shows, available now", price: 'From $20 · Affiliate link', partner: 'TodayTix' },
    { emoji: '🍽️', name: 'OpenTable Gift Card (Digital)', description: 'Instant email delivery, redeemable at thousands of restaurants', price: 'From $25 · Affiliate link', partner: 'OpenTable' },
  ],
  donation: [
    { emoji: '⚡', name: 'JustGiving Instant Donation', description: 'Donate right now in their name — instant confirmation', price: 'Any amount · Affiliate link', partner: 'JustGiving' },
    { emoji: '🌱', name: 'One Tree Planted (Instant)', description: 'Immediate confirmation email, shareable certificate', price: 'From $1 · Affiliate link', partner: 'One Tree Planted' },
    { emoji: '❤️', name: 'GoFundMe Gift', description: 'Support a cause they care about, instantly', price: 'Any amount · Affiliate link', partner: 'GoFundMe' },
  ],
};
