# MARKETING.md — Daysight (codename: Landmarks)

> Master marketing plan. Dense/token-efficient by design (optimized for fast LLM review, not human aesthetics).
> Companion to CLAUDE.md (product/architecture). Brand=Daysight, domain=daysight.xyz. Status: live, ~handful of users, solo founder.
> Last updated: 2026-05-30.

## 0. TL;DR
- Model: free email-first birthday/gift reminder service; revenue = affiliate commissions (Amazon + UrbanStems/Wine.com). No user payment.
- Category truth: **low-search-volume, low-awareness**. Nobody searches for this by name. Paid SEARCH harvests thin existing intent (cheap but limited spend); growth lever = demand creation + free in-product loops.
- Channel order: **Bing search → Google search → (later) Meta/Instagram.** Search reuses one asset set, zero creative treadmill — fits "founder won't make content."
- Load-bearing risk: **affiliate LTV is low + delayed → tolerable CAC is very low (est. low single $).** Validate unit economics before scaling any paid channel.
- North-star conversion metric: **cost per ACTIVATED signup** (signup + ≥1 contact added), not raw signup, not revenue (too delayed).
- Founder hours: product + gift catalog ONLY — but "product" explicitly includes landing page, onboarding funnel, email deliverability (these multiply every ad dollar).

## 1. Positioning
- One-liner: "Never forget the people who matter — free reminders + a few hand-picked gift ideas, no spam, no data games."
- Differentiators vs competitors: (a) email-first, no app install required; (b) privacy posture (HMAC tokens, no raw UUIDs, email-verification gated, GDPR-conscious); (c) actually free (no paywall tier); (d) curated gift recs tied to relationship/occasion/budget via deterministic engine.
- Weakness vs competitors: no mobile app, no greeting cards, no contact import (CSV/Google/vCard) — see CLAUDE.md Known Limitations.

## 2. ICP (Ideal Customer Profile)
- Primary: 45–65, higher household income, desktop-centric, buys gifts for family/friends, mildly anxious about forgetting, values privacy, not a power-app user. Email is their native channel.
- Why this ICP ↔ Bing: Bing skews desktop + higher-income (see §6 research). Channel demographics match ICP.
- Secondary (later): 30–45 organized "default gift-giver in the family."

## 3. Messaging hierarchy (ranked — fix from founder draft)
1. HOOK (emotional outcome): be the thoughtful one / never be the person who forgot.
2. HOW (functional): timely reminders at your chosen time + a few hand-picked gift ideas for each person.
3. TRUST/CLOSE: completely free · private, no spam · no app to install.
- Note: founder draft listed reminders/gifts/privacy as co-equal pillars. Reranked: reminders+gifts = features (the HOW), privacy = trust-closer, "free" was under-used and is a major friction remover → promoted near top.
- Privacy is a closer for this ICP, not the headline (rarely the primary purchase driver for this demo).

## 4. Channel plan
### 4.1 Bing / Microsoft Ads — PRIMARY (validate)
- Why: cheapest qualified clicks for this ICP; desktop + affluent skew; low advertiser competition; TEXT ads = no creative load.
- Format: Search only to start. Tight keyword set: category terms, competitor brand terms (hip, TouchBase, Birthday Boss, etc.), occasion terms ("anniversary gift ideas", "birthday reminder").
- Required: strong negative-keyword list (block "free printable", "card maker", "song", "meme", jobs, etc.); single high-conversion landing page; conversion tracking on activated-signup.
- Caveat: volume is thin — expect NOT to spend full budget here. That's fine; it's a proving ground for message + CAC.

### 4.2 Google Ads — SECONDARY (scale validated message)
- Why #2 (not Instagram): reuses Bing keywords + copy verbatim; intent-based; ~2–3x Bing CPC but far more volume. No new creative.
- Trigger to start: once Bing shows an activated-signup CPC at/under target.

### 4.3 Meta/Instagram — DEFERRED
- Why later: paid social is creative-hungry (constant new images/video) = exactly the labor founder won't supply. Burns budget without a content engine.
- Revisit when: budget supports creative + retargeting AND unit economics proven. Best first use = retargeting site visitors, not cold prospecting.

### 4.4 Free / low-labor loops (the real scale lever)
- In-product referral: "invite a friend — you both never forget." Highest-leverage build; product work, not content.
- Shareable .ics calendar (already built) — make the share path prominent.
- Lead-magnet that is PRODUCT not content: public "gift finder" quiz → email capture → signup. Reuses gift-engine; no posting habit required.
- SEO via existing public pages (about/privacy/terms/contact) — low priority; thin given no content engine.

## 5. Budget (current: <$300/mo)
- Constraint reframed: budget is NOT the binding constraint — thin search volume + low tolerable CAC are. Don't force-spend.
- Allocation M1: ~$220 Bing Search · ~$60 held for Google mirror test (week 3) · $0 Instagram.
- Ongoing labor: ~1 hr/week ad tending (negative keywords, bids) is mandatory even for "set-and-forget."
- Scale rule: only raise spend on a channel after it hits activated-signup CPC target for 2+ consecutive weeks.

## 6. Research findings (2026 benchmarks — verify before relying)
### CPC benchmarks
- Bing avg CPC ~$1.54 all-industries; Google avg ~$2.96. Bing ~48% cheaper per click for comparable keywords.
- Bing low-CPC verticals: retail/e-comm ~$0.88, hospitality ~$0.73, apparel ~$0.91. (Gifting likely lands in this cheap retail band.)
- Implication: Bing clicks plausibly <$1 for our terms; even at 5–10% landing→activated, activated-signup CPC ~$10–20 → **likely ABOVE tolerable CAC. Must improve funnel conversion or rely on free loops.**

### Bing demographics (ICP fit = strong)
- 41% of US Bing users earn >$100K/yr; ~half in top 25% household income.
- Overwhelmingly desktop (~12% desktop share vs <1% mobile).
- Skews 25–44 most, but income/desktop profile matches affluent gift-buyer ICP. (Note: Bing's age skew is younger than our 45–65 target — test, don't assume.)

### Competitors
- **hip** (hip.app, iOS): closest analog. Birthday/anniversary reminders + 100+ greeting cards + "hip Finds" gift suggestions (US). Free w/ basic features. Mobile app, card-centric. Our edge: email-first, no install, privacy, free.
- **TouchBase** (touchbase.site): contact mgmt + occasion tracking + gift-idea logging. Free tier + ~$3/mo premium.
- **Birthday Boss / Birthdays Reminder / Memorigi / Friendly / Every Year**: mostly mobile reminder apps, some w/ gift ideas, mix of free/paid.
- Takeaway: space is mobile-app-dominated + many charge. Our white space = **email-first + genuinely free + privacy-forward**. Lean into "no app to install."

### Affiliate economics (LTV reality)
- Amazon Associates: home/kitchen ~3–4%, handmade ~5%; most everyday categories 1–4% (rates cut over years). **Amazon cookie = 24h only** → user must buy within a day of clicking → conversion + attribution both leaky.
- Implication: revenue/active-user/yr is likely a few $ at best (few gift purchases × small basket × low %). Confirms very low tolerable CAC. **This is the central business-model tension — paid acquisition may never be profitable alone.**

## 7. Metrics & instrumentation
- North star: cost per ACTIVATED signup (signup + ≥1 contact). Use existing `conversion_events` table.
- Funnel to track: ad click → landing → signup → email-verified → ≥1 contact → (later) reminder sent → affiliate click → purchase.
- Per-channel: CPC, landing→signup %, signup→activated %, activated-signup CPC.
- Do NOT optimize to revenue early (delayed/noisy). Optimize to activated signup as proxy.
- Set explicit target before spending: e.g. activated-signup CPC ≤ $X (derive X from estimated revenue/active-user/yr once measured).

## 8. 30 / 60 / 90
- M1 (validate message + CAC): Bing Search live; 1 landing page (hook+free); negatives; conversion tracking; instrument activated-signup. Week 3: small Google mirror test. Measure activated-signup CPC.
- M2 (improve funnel + free loop): CRO on landing + onboarding (biggest lever); build referral loop; decide Google scale-up based on M1 CPC.
- M3 (scale or pivot): if paid CAC ≤ target → scale Bing+Google. If not → shift weight to free loops (referral, gift-finder lead magnet, .ics share) + reconsider whether paid is viable at all given affiliate LTV.

## 9. Open questions / decisions needed
- [ ] Measured revenue per active user per year? (Determines tolerable CAC — currently unknown, load-bearing.)
- [ ] Activated-signup CPC target number?
- [ ] Is there ANY paid path to profitability, or is paid purely a learning budget while free loops do the scaling?
- [ ] Build referral loop priority vs gift-finder lead magnet — which first?
- [ ] Confirm Bing age skew (younger) doesn't undercut ICP fit — validate with first cohort.

## 10. Sources
- LocalIQ search benchmarks: https://localiq.com/blog/search-advertising-benchmarks/
- Shno Bing Ads stats 2026: https://www.shno.co/marketing-statistics/bing-ads-statistics
- MegaDigital Bing Ads cost: https://megadigital.ai/en/blog/bing-ads-cost/
- Nerdynav Bing statistics: https://nerdynav.com/bing-statistics/
- Keystar Bing Ads stats: https://www.keystaragency.com/bing-ads-statistics/
- TouchBase best birthday apps: https://touchbase.site/blog/best-apps-for-remembering-birthdays
- hip app: https://www.hip.app/
- Amazon affiliate rates by category: https://helpingmerchants.com/amazon-affiliate-commission-rates-by-category/
- AzonPress Amazon rates 2026: https://azonpress.com/amazon-affiliate-commission-rates/
