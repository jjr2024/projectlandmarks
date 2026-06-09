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

### Live config notes (Microsoft UI, as set up 2026-06)
- Goal conversion window = **60 days** on both goals (not 90). Independent of the feed's 90-day import-freshness filter; both fine since conversions occur minutes-to-days after click.
- Scheduled-import **time zone must equal UTC**. MS picker has NO plain "UTC" entry → use a **no-DST UTC zone (Reykjavik/Monrovia)**. The feed emits `...Z` (true UTC). NEVER UTC+1 / "(GMT) Dublin" (summer DST shifts conversions ~1h early → fast signups rejected as before-click). GMT-1 is a safe late-side fallback if no UTC zone exists. Direction: MS reads wall-clock as `trueUTC − offset`, so +1 = early/bad, 0 = exact, −1 = late/safe.
- See `MS_ADS_SETUP.md` for the full click-by-click runbook.

## 13. Instagram (organic, faceless voiceover Reels)
> Goal: a low-personal, ColdFusion-style content engine (voiceover + b-roll + clean text, no face) that compounds into free signups. Format-agnostic but Reels-first (highest organic reach).
> HONEST EFFORT NOTE: "free" = founder labor. Faceless ≠ effortless (scripting + editing take real time). Sustainability rule below makes content piggyback on gift-catalog work you ALREADY do. If it ever competes with product time, drop to 1–2/wk or pause — paid Bing + free in-product loops remain the spine.

### Engineer for the 2026 ranking signals (NOT likes)
- Order of weight: **watch-completion → SHARES (DM sends are the single heaviest signal) → SAVES → comments.** Likes barely matter.
- ⇒ Design every post to be **DM'd to a specific person** ("send this to the friend who always forgets") and **saved** ("save this for the holidays"). That's the whole game.
- Hook in **first 2–3s** (≈50% drop by 3s). A 3-sec hold >60% can 5–10× reach. Lead with the payoff, never a slow intro.
- Length **7–45s** sweet spot (educational can stretch ~60–90s, but tighter wins). Always on-screen captions (sound-off viewing). Original footage only — **never repost watermarked TikToks** (penalized).

### 4 content pillars (each maps to a Daysight value prop, none is an ad)
1. **Gift intelligence / guides** (SAVE-bait, the workhorse). "5 gifts under $40 that look expensive," "what to get the person who has everything," "anniversary gifts by year." ← These come straight from your gift-catalog research → **product work IS the content**. This is the sustainability engine.
2. **Thoughtfulness / relationship psychology** (SHARE-bait; a top-performing faceless niche). "The real reason you forget birthdays (it's not your memory)," "what your gift says about you," "the 5-minute habit that makes you the thoughtful one."
3. **Relatable dread / POV** (DM/tag-bait). The last-minute scramble, gas-station flowers, the "happy belated 😬" text. → "tag your last-minute friend."
4. **Occasion etiquette / utility** (SAVE-bait). "How much to actually spend on a coworker," "gift etiquette by relationship," "what NOT to gift."

### Reels — 10 starter scripts (stat-led, mapped to VERIFIED studies)
> Each = surprising stat hook → visual metaphor → primary signal. Small source credit on-screen + full cite in caption. NEVER fabricate; every tag maps to the Research/stat bank below. Effect sizes modest → say "research finds," not miracle numbers.
- Hook formulas: number+payoff, myth-bust, curiosity gap, command, POV.
1. "Recipients don't appreciate pricier gifts more — givers just think they do." [Flynn & Adams 2009] — price tag vs flat smile. Myth-bust → SHARE/SAVE.
2. "People prefer gifts they asked for over surprises — we keep buying surprises." [Gino & Flynn 2011] — wishlist vs mystery box. → COMMENT ("team surprise or team list?").
3. "Givers chase the unwrapping 'wow'. Recipients want what they'll still use in March." [Galak, Givi & Williams 2016] — confetti vs item on a shelf. → SAVE. *(soft tie-in)*
4. "The sentimental gift you're scared to give is the one they want most." [Givi & Galak 2017] — gift card vs framed photo. → SHARE (tag partner).
5. "200 studies, ~198,000 people: being kind makes YOU happier too." [Hui et al. 2020 meta] — give → glow. Authority/big-N → SAVE/SHARE.
6. "Spending just $5 on someone else lifts your mood more than spending it on yourself." [Dunn, Aknin & Norton 2008, replicated] — a single $5 bill. → SHARE. *(soft tie-in)*
7. "Want to feel closer to someone? Give an experience, not an object." [Chan & Mogilner 2017] — concert tickets vs gadget. → SAVE.
8. "That little gesture you forgot? It meant far more to them than you'd guess." [Kumar & Epley 2023] — sticky note → ripple. Emotional → SHARE.
9. "Why birthdays hit different: your brain treats them as a 'fresh start'." [Dai, Milkman & Riis 2014] — calendar landmark glowing. Relatable → SAVE. *(soft tie-in)*
10. "Gifts to never give — and what research says to give instead." [Galak/Givi framework + Chan & Mogilner] — red-X items → swap. Polarizing → COMMENT/SAVE.
- Soft CTA on ~#3/#6/#9 only: "I got tired of forgetting + guessing, so I built a free tool that reminds me and picks gifts that land — link in bio." Never hard-sell.

### Carousels / slideshows — 10 post bank (easier to make; content overlap with Reels is fine)
> Portrait, text-on-image slides. Carousels over-index on SAVES → lean list / reference / depth. Same no-fabrication + sourced-caption rules.
1. "7 ways gift-givers get it wrong (per research)" — 1 mismatch/slide. [Galak, Givi & Williams 2016] → SAVE.
2. "5 gifts under $40 that look expensive" — 1 product/slide, straight from the catalog (product work = content). → SAVE.
3. "Experiences > stuff: 6 experience gifts for people you love." [Chan & Mogilner 2017] → SAVE.
4. "The honest science of gift-giving, in 6 slides" — the giver/receiver gap. [Flynn & Adams; Gino & Flynn; Galak] → SAVE/SHARE, authority.
5. "Anniversary gifts by year (so you never blank)" — etiquette/utility. → SAVE.
6. "What your go-to gift secretly says about you" — identity/personality (lighter). → COMMENT/SHARE.
7. "How much to actually spend on a gift, by relationship" — etiquette numbers. → SAVE.
8. "5 sentimental gifts that beat anything expensive." [Givi & Galak 2017] → SAVE/SHARE, emotional.
9. "Why we forget birthdays (and how to never again)" — relatable; soft product fix on the last slide. [Dai et al. 2014 + prospective-memory framing] → SHARE.
10. "Gifts to never give — and the better swap for each" — polarizing list w/ swaps. → COMMENT/SAVE.

### Reels vs carousels — the reach trade (choose deliberately)
- **Reels = reach/discovery engine:** roughly **1.4–3× more reach** than carousels (varies by source/account) because the Reels feed + Explore push to NON-followers. For a cold-start account that needs discovery, that's the metric that matters.
- **Carousels = engagement/saves engine:** less cold reach, but higher engagement rate + more saves among people who see them; Mosseri has said photos/carousels are NOT penalized.
- **Verdict:** slides aren't "much worse" — ~1.4–3× weaker on cold reach, but stronger on saves (a top ranking signal) and far quicker to produce. Reels for top-of-funnel discovery; carousels for save-bait depth + converting existing followers. Don't grow a cold account on carousels alone.

### Research / stat bank (VERIFIED vs journals 2026-06 — cite, never fabricate)
> Use directionally (effect sizes modest); meta-analyses are strongest for broad claims. These are the sources behind the hooks above.
- Flynn & Adams (2009), *JESP* 45(2):404–409 — recipients' appreciation is NOT linked to gift price; givers wrongly assume it is.
- Gino & Flynn (2011), *JESP* 47(5):915–922 — requested gifts appreciated more than unsolicited; givers overrate "surprise" thoughtfulness.
- Galak, Givi & Williams (2016), *Current Directions in Psych Science* 25(6):380–385 (review) — givers weight the exchange moment, recipients weight lasting value; ~7 mismatches.
- Givi & Galak (2017), *J. Consumer Psychology* 27(4):473–479 — givers under-give sentimental gifts (fear of missing); recipients want them more.
- Chan & Mogilner (2017), *J. Consumer Research* 43(6):913–931 — experiential gifts strengthen relationships more than material (more emotionally evocative).
- Dunn, Aknin & Norton (2008), *Science* 319:1687–1688 — prosocial spending (as little as $5) raises happiness. CAVEAT: small original (n=46); later supported by a Registered Replication Report → cite as "replicated," not the lone 2008 study.
- Hui, Ng, Berzaghi, Cunningham-Amos & Kogan (2020), *Psychological Bulletin* 146(12):1084–1116 — **META:** prosociality↔well-being r≈.13 (201 studies, N≈198,213).
- Curry, Rowland, Van Lissa, Zlotowitz, McAlaney & Whitehouse (2018), *JESP* 76:320–329 — **META:** acts of kindness boost actor well-being δ≈0.28 (27 studies, N=4,045).
- Kumar & Epley (2023), *J. Exp. Psychology: General* 152(1):236–252 — givers underestimate the impact of small kindnesses on recipients.
- Dai, Milkman & Riis (2014), *Management Science* 60(10):2563–2582 — "fresh start effect": birthdays/landmarks spark aspirational behavior (dates are psychologically loaded).
- Umbrella review: Givi, Birg, Lowrey & Galak (2023), *J. Consumer Psychology* — integrative review of gift-giving research.
- Daysight consumer stats (sourced 2026-06; grade matters — prefer Gallup/NRF over brand PR surveys):
  - **Last-minute shopping (STRONG):** ~49–50% of US holiday shoppers do the BULK of shopping in December (Shopify–Gallup / Gallup poll); ~60% don't FINISH until December and only ~13% START in December (NRF). Credible, usable.
  - **Plan-ahead motivation (STRONG):** ~40% (2-in-5) start before November, with "avoid the stress of last-minute shopping" among the top reasons (NRF). Directly supports the reminder value prop.
  - **"Occasions forgotten per year" (NO rigorous figure — do NOT invent one):** only commissioned PR surveys exist, e.g. Moonpig: ~29% have forgotten a parent's birthday (45% of 16–29s); "~1 in 5 usually forget birthdays." If used, ATTRIBUTE the brand and frame as a survey, never as an "average N/yr." Better: lean on the academic memory angle instead.
  - **"Preferred reminder lead time" (NO direct stat):** use NRF shopping-start timing as a behavioral proxy, not a literal "how far ahead people want reminding" figure.

### What good looks like — per-post checklist (teardown of 8 reference posts, 2026-06)
> Derived from high-performers across health/longevity/investing/careers (saved in Landmarks_Marketing/Instagram/Post References). Build every post to pass most of these:
- [ ] **Quantified hook, legible in frame 1** — one surprising NUMBER does the work ("47%", "128,000 people", "$1.77tn"). Numbers stop the scroll + signal credibility.
- [ ] **Counterintuitive / myth-bust angle** beats a plain fact ("The reason you forget birthdays isn't your memory").
- [ ] **Built for SAVES + SHARES, not likes** — the heavy 2026 signals. (Reference Forbes post = 533 saves : 75 likes.) Make it reference-worthy (guide/list) or identity-worthy ("this is me").
- [ ] **List with a finite number + contrast** where possible ("5 that add years, 5 that don't"; "Six paths that…").
- [ ] **Authority line + sourced caption** — study language / big-N ("study of 128,000"), real source NAMED in caption.
- [ ] **Striking visual metaphor carries the idea** (faceless-friendly): the image = the argument (e.g. calendar bleeding red dates; gift dissolving into a "?").
- [ ] **Bold centered text, color-pop the 2–3 key words** (legible sound-off).
- [ ] **Confident subtitle under the hook** that promises payoff ("The honest list. Decades of data.").
- [ ] **Carousel for guides/depth** ("swipe for more" → dwell + saves); single image for one punchy stat.
- [ ] **Mild polarization to earn comments** — a defensible debatable take ("never give gift cards"), not rage-bait.
- [ ] **Comparison framing makes numbers relatable** ("looks like $100, costs $30"; SpaceX "7× LVMH").
- [ ] **Consistent template + single niche** — one recognizable look; stay on thoughtfulness/gifting (algorithmic clarity + follow-worthiness).
- [ ] **Soft CTA only, sparingly** ("comment X for the list" / "link in bio") — every 2–3 posts, never every post.
- **STAT BANK:** verified research bank is in the "Research / stat bank" subsection below (10 sources + 2 meta-analyses). NEVER fabricate — sourced or cut. Still TO SOURCE: avg occasions forgotten/yr, % last-minute shoppers, preferred reminder lead time.

### Production stack (ColdFusion-style, faceless, mostly free)
- Script: Hook (0–3s) → tension/promise (3–8s) → 3–5 beats (8–40s) → payoff → soft CTA. ~20–40s.
- Voiceover: **your own voice** (calm, no face — most authentic, free) OR ElevenLabs for consistent premium TTS. 
- Visuals: free b-roll (Pexels/Pixabay) + your actual product images from the catalog + simple motion text. Ambient bed; add a low-volume IG **trending/licensed audio** under the VO for reach (tradeoff vs pure original score — worth it on IG).
- Edit: **CapCut** (free: script-to-video, auto-captions, AI voice if wanted) or DaVinci Resolve (free, more cinematic). Export clean (NO watermark).

### Cadence & sustainability (respect the product-first constraint)
- **3 Reels/week**, BATCH-produced: write 6–9 scripts + record all VOs in one sitting, edit in a block. Don't make it a daily task.
- Repurpose each piece → IG carousel + Story, and cross-post to TikTok / YouTube Shorts / Pinterest (re-export without watermark). One idea → ~4 surfaces.
- **Content-from-product loop:** every gift-catalog update or seasonal refresh = ≥1 gift-guide Reel. The labor you're already spending becomes the top of the funnel.
- Profile: bio = clear value + "🎁 free birthday & gift reminders," name field keyworded ("Birthday & Gift Reminders"), link → `daysight.xyz/auth?mode=signup` (or homepage).

### Measurement (IG organic won't show in Bing/MS)
- Track **shares + saves per post** as the leading indicators (not likes/views). Find the 2–3 hooks/pillars that hit → repeat & iterate; kill the rest.
- Attribute signups: put a **UTM / unique ref on the bio link** and watch signups in your own analytics (`conversion_events`). Optional later: capture an `igref` query param the same way as `msclkid` for cleaner attribution.
- Expectation-setting: faceless accounts that hit 100k typically take **6–12 months of consistent posting** — this is a slow COMPOUNDING bet, not a quick tap. First milestone = find repeatable formats, not instant virality.

### Guardrails
- **No instant/same-day delivery claims** (same rule as emails — you don't control fulfillment; CLAUDE.md). Don't imply Daysight ships gifts.
- On-brand privacy: fine to make a pillar out of "no spam, no data selling" occasionally — reinforces the differentiator.
- No bought followers/engagement; consistency + retention beat vanity metrics.

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
- Instagram Reels algorithm 2026 (Buffer): https://buffer.com/resources/instagram-algorithms/
- Reels viral guide 2026 (invideo): https://invideo.io/blog/instagram-reels-guide/
- Faceless Reels strategy (fluxnote): https://fluxnote.io/guides/faceless-instagram-reels-content-strategy
- Faceless Reels ideas 2026 (fluxnote): https://fluxnote.io/guides/faceless-instagram-reels-ideas-2026
- Accounts that do faceless Reels well (Homemade Social): https://www.homemadesocial.com/blog/accounts-that-do-instagram-reels-well-without-showing-their-face
- Reels vs carousels reach/engagement (Buffer): https://buffer.com/resources/instagram-reach-engagement-analysis/
- Gift research full citations verified via: ScienceDirect/JESP, Oxford JCR, APA Psychological Bulletin, INFORMS Management Science, Science (links per study in chat thread)
