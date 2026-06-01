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

### 7.1 No-LTV-yet operating mode (current reality: zero affiliate data)
- Frame phase 1 spend as **buying data, not customers** (tuition). Goal = generate first affiliate activity so LTV becomes computable at all.
- **Data lag is real:** signup today → next reminder may be months out → click → purchase within Amazon's 24h cookie. Expect 2–4 months before meaningful commission data even with steady signups. Don't judge paid ROI before then.
- Front-load users with **near-term events** (birthday/anniv in next few weeks) for faster first data point.
- **Early LTV proxy = reminder→affiliate-click rate** (measurable NOW via reminder_log + conversion_events; shows months before commissions; tells you if gift recs resonate = the real revenue driver).
- Metric ladder while blind on revenue: activated-signup rate → reminder→affiliate-click rate → (lagging) commission/LTV.
- Revisit LTV math once ~50–100 reminders actually sent w/ click data.

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

## 11. Bing/Google ad copy — DRAFT v1 (Responsive Search Ad)
> Format: Microsoft + Google RSA. Headlines ≤30 chars (provide up to 15; engine mixes). Descriptions ≤90 chars (up to 4). Display paths ≤15 chars each. Tag each by messaging layer (H=hook, F=feature, T=trust).
> Status: untested drafts; need char-count + claim review (no instant-delivery claims per CLAUDE.md).

### Headlines (≤30 chars)
- H — Never Forget a Birthday        (23)
- H — Be the One Who Remembers       (24)
- H — Remember Everyone You Love     (26)
- H — Never Scramble for a Gift      (25)
- F — Reminders + Gift Ideas         (22)
- F — Right Gift, Right on Time      (25)
- F — Hand-Picked Gift Ideas         (22)
- F — Email Alerts, No App Needed    (25)
- F — Birthday & Anniversary Alerts  (29)
- T — 100% Free, No App Needed       (24)
- T — Private. No Spam. Ever.        (23)
- T — Free Birthday Reminders        (23)
- H — Be Thoughtful, Every Time      (25)
- F — A Gift Idea for Each Person    (25)
- T — Free Forever, No Catch         (23)

### Descriptions (≤90 chars)
- H+T — Never forget the people who matter. Free reminders + curated gift ideas. No spam.   (~84)
- F   — Get a friendly email before each birthday, with a few hand-picked gift ideas. Free. (~86)
- F   — Set it once; we email you in time to find the perfect gift. Completely free, no app. (~88)
- T   — Private by design—no spam, no data games. Just timely reminders and gift ideas.     (~83)

### Display path
- daysight.xyz / Reminders / Free   (paths: "Reminders" 9, "Free" 4)
- alt: daysight.xyz / Gift-Ideas

### Copy notes / guardrails
- NO instant/same-day delivery claims (Daysight doesn't control fulfillment — CLAUDE.md). Avoid "ships today", "delivers instantly".
- Lead emotional (H) in pinned headline slot; let "Free" + "No app" do trust work; privacy as differentiator vs app-heavy competitors (hip, TouchBase).
- A/B axis 1: emotional hook vs functional ("never forget" vs "reminders + gift ideas"). Axis 2: "free" vs "private" as trust closer.
- Competitor-term campaigns: use comparative angle ("No app to install", "Just email") — do NOT use competitor names IN ad text (trademark/policy risk), only as keywords.

## 12. Conversion measurement — Bing/Microsoft (DECISION: Path B, BUILT via file import)
> Decision (final, implemented): **server-side, tag-less, msclkid-only, NO PII.** Capture msclkid client-side on the public landing page → carry it in auth signup metadata → expose a secret-gated CSV endpoint that Microsoft's *scheduled offline-conversion import* pulls on a schedule. No UET JavaScript, no OAuth, no developer token, no SOAP API, and **no new DB table** (conversions computed on the fly; Microsoft dedupes). Keeps the privacy pillar intact. Confirmed against MS docs 2026-06.
> Why file import beats the CAPI/API path we first scoped: offline-conversion *goals* don't require the UET tag; the scheduled file import needs only a reachable CSV URL — far less code and zero credential provisioning (no Azure app, no dev token). msclkid-based offline conversions are the documented fit for click-then-later-convert.

### Why this over standard UET (Path A)
- Path A (UET JS sitewide) sets non-essential advertising cookies → directly contradicts CookieNotice + Privacy §6 ("no analytics/advertising cookies, no consent banner needed"). Would force consent-banner rework + privacy rewrite + dents marketing pillar #3.
- Path B loads NO browser tag/cookie. Only an account-side UET tag *ID* (required by MS for attribution) + server-to-server reporting.

### Mechanism (as built — verified vs MS docs)
- Auto-tagging appends `msclkid` (32-char) as URL param; MS now auto-enables. Verify: Settings → Account level options → "Add Microsoft Click ID (MSCLKID) to URLs".
- Ads land on the PUBLIC homepage (not redirected by middleware), so `?msclkid=` survives → captured client-side, no middleware edit needed.
- Conversion time must be UTC and within the last 90 days, and later than the click time; goal CountType = **Unique** (first conversion per click). Conversion Name in the CSV must EXACTLY match the goal name in the MS UI.
- Dedup is Microsoft-side on (MicrosoftClickId, ConversionName, ConversionTime) → re-serving the same rows each pull is idempotent as long as timestamps are stable.

### Bid-strategy pairing
- Use **Maximize Conversions**, target CPA OFF initially (no LTV known; let it learn). NOT Max Conversion Value/ROAS (needs per-conversion $ we don't have).
- Auto-bidding wants ~15–30 conv/mo; at our budget we'll be under → behaves ~like max-clicks early. Fine. Revisit at volume.
- WARNING: if no conversion tracking set up, MS silently downgrades bid strategy to maximize-clicks.

### Conversion definitions (what we report — computed in the CSV endpoint, not fire-on-event)
- PRIMARY (for bidding) "Daysight Signup" = **email-verified signup**: msclkid in auth metadata AND `email_confirmed_at` set. Conversion time = `email_confirmed_at` (stable). Counts verified, not raw signup → bots/typos don't inflate.
- SECONDARY (quality watch) "Daysight Activation" = onboarding complete. Conversion time = user's earliest `contacts.created_at` (stable, == activation moment). 
- Both names MUST match the MS goal names exactly. Reconciliation is pull-based: the endpoint recomputes from current DB state each fetch — no event hooks in the verify/onboarding flows (lower risk).
- Do NOT report affiliate purchase as a conversion: happens months later, outside MS 90-day window → rejected. Revenue-equal metric structurally can't feed bidding. Hard ceiling — accept it.

### Failure points / counting bias (design around these)
- OVER-count sources: pre-verification signups (→ mitigated by counting at verify), stale msclkid reattributing organic returns (→ TTL on stored msclkid), non-idempotent CAPI re-sends (→ `uploaded` flag per row), client double-fire (→ guard), internal/test traffic (→ exclude).
- UNDER-count sources (mostly hit ACTIVATION): cross-device (msclkid captured desktop, onboarding on phone via token_hash any-device login — known, accept+document), middleware redirects stripping `?msclkid=` before capture (→ capture in middleware BEFORE redirects, persist server-side), storage cleared/ITP/adblock, verification gap (→ persist msclkid to profiles at signup, not client storage), tag-less lower match rate (MS recommends JS for accuracy — extra undercount we accept), silent CAPI/OAuth-refresh failures (→ surface errors, don't swallow per codebase pattern).
- NET BIAS: signup over-counts, activation under-counts → signup→activation ratio is partly artifact. Treat all numbers as **direction-finding (Bing producing real signups y/n), NOT precise CPA accounting.**

### Build status (files) — Stage 1 ✅ + Stage 2 code ✅ (as of 2026-06)
- Stage 1 (capture) — DONE, locally validated:
  - `src/components/msclkid-capture.tsx` (NEW): client; reads `?msclkid=`, validates `^[A-Za-z0-9]{1,64}$`, writes first-party cookie `ds_msclkid` (90d, SameSite=Lax, Secure on https). Defensive (never throws).
  - `src/app/layout.tsx`: renders `<MsclkidCapture />` beside `CookieNotice`.
  - `src/app/auth/page.tsx` `handleSignUp`: reads cookie, adds `msclkid` to `signUp` `options.data` only when valid. Non-blocking. (Verified locally: lands in `auth.users.raw_user_meta_data`.)
- Stage 2 (feed) — CODE DONE, not yet live-tested with a real click:
  - `src/app/api/ads/microsoft-conversions/route.ts` (NEW): GET, `?token=` gated (timing-safe vs `MS_CONVERSIONS_TOKEN`, validated in-route NOT in env.ts so a missing value can't break other routes). Paginates `listUsers`, joins `profiles.onboarding_completed` + earliest `contacts.created_at`, emits CSV `Microsoft Click ID,Conversion Name,Conversion Time` (ISO-8601 UTC, 90-day window). Read-only; no table; no PII.
  - `src/app/privacy/page.tsx` §6: discloses the first-party msclkid cookie + msclkid-only reporting to MS; keeps "no third-party advertising cookies/scripts" (still true).
- NOT changed (deliberately, to minimize risk): middleware, the verify route, onboarding flow, `handle_new_user` trigger, schema.

### To deploy / go live (your steps)
- Set `MS_CONVERSIONS_TOKEN` (long random string) in `.env.local` AND Vercel prod env.
- In Microsoft Ads: confirm auto-tagging ON; create two **Offline Conversion** goals named EXACTLY `Daysight Signup` and `Daysight Activation`, CountType=Unique, ConversionWindow generous (e.g. 90d). Wait ~2h after creating before data counts.
- Set up a **scheduled import** pointing at `https://daysight.xyz/api/ads/microsoft-conversions?token=<secret>`; map columns; set import timezone = UTC.
- Deploy code to prod (Vercel). Launch campaign minimal-budget; confirm first REAL conversion appears in MS reporting (up to ~6h delay) before scaling / switching bid to Max Conversions.

### Open decisions / caveats
- [ ] msclkid-only chosen (default). Adding SHA-256 hashed email later would raise match rate (the CSV format supports a Hashed Email column) — revisit only if match rate looks poor.
- [ ] Putting the secret in a URL query param (Microsoft scheduled import is URL-based) — acceptable for low-sensitivity (msclkid, no PII); rotate via `MS_CONVERSIONS_TOKEN` if needed.
- [ ] EU/ePrivacy nuance: `ds_msclkid` is a first-party *measurement* cookie (arguably non-essential). We disclose it in §6 and did NOT add a consent gate (US-focused audience). Revisit if EU traffic grows → gate cookie set behind consent.
- [ ] Cross-device activation undercount (desktop click → phone onboarding) remains, by design. Direction-finding, not exact CPA.

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
- MS Conversions API (CAPI) guide: https://learn.microsoft.com/en-us/advertising/guides/uet-conversion-api-integration?view=bingads-13
- MS Click ID (msclkid) Q&A: https://learn.microsoft.com/en-us/answers/questions/2290248/microsoft-click-id
- MS auto-enables Click ID (ppc.land): https://ppc.land/microsoft-advertising-auto-enables-click-id-for-improved-conversion-tracking/
- Stape CAPI integration guide: https://stape.io/blog/guide-microsoft-conversion-api-integration
- MS Offline Conversion Record (bulk format, columns + 90-day/UTC rules): https://learn.microsoft.com/en-us/advertising/bulk-service/offline-conversion?view=bingads-13
- MS Tracking offline conversions (help): https://help.ads.microsoft.com/apex/index/3/en/56852
