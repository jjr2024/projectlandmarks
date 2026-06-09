# Microsoft Ads — Offline Conversion Setup Runbook (Daysight, Path B)

Operational checklist to wire Bing/Microsoft Ads conversion tracking to the
`/api/ads/microsoft-conversions` feed. Companion to `MARKETING.md` §12.

> Menu labels in Microsoft Advertising shift over time. If a path below doesn't
> match exactly, use the in-app search and look for the bolded keyword
> ("auto-tagging", "conversion goal", "offline conversions", "scheduled import").

---

## 0. Prerequisites
- [ ] Admin access to the Microsoft Advertising account.
- [ ] The Daysight code (Stage 1 + Stage 2) deployed to production on `daysight.xyz`.
- [ ] **`MS_CONVERSIONS_TOKEN`** set in **Vercel** production env vars — a fresh long random string (e.g. `openssl rand -hex 32`). This must match the `token=` you put in the import URL. Redeploy after setting it.
- [ ] Verify the feed is live in prod (returns CSV, not 401):
      `curl "https://daysight.xyz/api/ads/microsoft-conversions?token=<prod-secret>"`
      A bare request with no token should return 401.

---

## 1. Confirm auto-tagging is ON (adds `msclkid` to ad clicks)
Without this, no click IDs reach the site and nothing can be attributed.

1. [ ] Top nav: **Settings** (gear) → **Account level options** (sometimes under "Account settings").
2. [ ] Find **"Add Microsoft Click ID (MSCLKID) to URLs to allow conversion tracking."**
3. [ ] Ensure the checkbox is **checked**. (Microsoft auto-enables this on most accounts now — just confirm.)
4. [ ] Save.

---

## 2. Create TWO Offline Conversion goals
Path: **Tools / Conversion tracking** → **Conversion goals** → **Create conversion goal**.

Create each goal with these settings. **Names must match the feed EXACTLY** (the CSV emits `Daysight Signup` and `Daysight Activation`).

### Goal A — primary (this is the one bidding optimizes toward)
- [ ] **Goal type:** Offline conversion *(NOT website/UET — offline doesn't need a site tag)*
- [ ] **Name:** `Daysight Signup`  ← exact, including the space and capitalization
- [ ] **Category:** Sign-up (or "Other" if Sign-up isn't offered)
- [ ] **Count:** **Unique** *(count one conversion per click — see note below)*
- [ ] **Conversion window:** **60 days** *(chosen — plenty, since signups happen within minutes-to-days of the click; see note)*
- [ ] **Revenue / value:** leave off / default. We bid on Max Conversions, not value, so no per-conversion dollar amount is needed.
- [ ] **Include in "Conversions" column:** Yes *(this makes it the action automated bidding uses)*

### Goal B — secondary (quality signal, not for bidding)
- [ ] **Goal type:** Offline conversion
- [ ] **Name:** `Daysight Activation`  ← exact
- [ ] **Category:** Other
- [ ] **Count:** **Unique**
- [ ] **Conversion window:** 60 days
- [ ] **Revenue / value:** leave off / default
- [ ] **Include in "Conversions" column:** **No** *(keep it out of the bidding signal; watch it as a secondary metric so it doesn't dilute optimization)*

> **Why "Unique":** with CountType = Unique, only the first conversion per click is
> counted, and re-importing the same row is ignored. Our feed re-serves the same
> rows on every pull (stable timestamps), so Unique is what makes that safe.

> **Important:** after creating a goal, **wait ~2 hours** before sending/importing
> data, and allow **up to ~6 hours** for conversions to appear in reporting.

---

## 3. Set up the scheduled import (Microsoft pulls the CSV)
Path: **Tools / Conversion tracking** → **Offline conversions** (or **Imports**) → **Schedule** tab → **+ Schedule** / **Create schedule**.

1. [ ] **Source / file location:** "From a URL" (HTTP/HTTPS file).
2. [ ] **URL:** `https://daysight.xyz/api/ads/microsoft-conversions?token=<prod-secret>`
       *(exact prod token; the endpoint returns `text/csv`)*
3. [ ] **Frequency:** Daily is plenty (Hourly is fine too). Conversions aren't time-critical at this scale.
4. [ ] **Time zone:** must equal UTC. The feed emits `...Z` (true UTC). There is **no plain "UTC" entry** in MS's picker, so:
       - BEST: pick a **no-DST UTC zone** — **"(UTC+00:00) Monrovia, Reykjavik"** (Iceland never observes DST → permanently UTC, matches `Z` year-round).
       - FALLBACK (only if no UTC option): **GMT-1 (UTC−1)** — makes conversions read ~1h *late*, which is harmless (never before the click, well inside 60 days).
       - **NEVER pick UTC+1 or "(GMT) Dublin/London"** — Dublin shifts to UTC+1 in summer, reading conversions ~1h *early* → fast signups can land *before* their click and get **rejected**.
       - (Direction: a wall-clock read in zone offset `o` becomes `trueUTC − o`. o=+1 → early/bad; o=0 → exact; o=−1 → late/safe.)
5. [ ] **Column mapping** (map the CSV headers to fields):
       - `Microsoft Click ID`  → **Microsoft Click ID**
       - `Conversion Name`     → **Conversion Name**
       - `Conversion Time`     → **Conversion Time**
       *(No value/currency columns — leave those unmapped; goal defaults apply.)*
6. [ ] Save the schedule. If there's a "Run now" / "Import now" option, run it once to get an immediate first import.
7. [ ] Check the import's **status/history** for row counts and errors. Common errors: name mismatch (fix goal name), time outside 90 days, or time before the click.

---

## 4. Bid strategy (tie-in with conversions)
- [ ] At launch, while zero conversions exist, run **Maximize Clicks** (or Manual CPC) just to seed traffic — Maximize Conversions has nothing to learn from yet and will behave like clicks anyway.
- [ ] Once real conversions are importing and visible in reporting, switch to **Maximize Conversions**, leave **Target CPA OFF** (we don't know our CPA yet — let it learn).
- [ ] Do **NOT** use Maximize Conversion Value / Target ROAS — that needs a per-conversion dollar value we don't have (no LTV data yet).

---

## 5. Validate end-to-end with a real click (the one thing local testing can't prove)
Local tests proved the plumbing; only a real paid click proves attribution.

1. [ ] Launch the campaign at **minimum daily budget**.
2. [ ] Let a genuine click come through and complete a signup (**do NOT click your own live ads — that's an invalid-click policy violation**).
3. [ ] Wait for the next scheduled import + up to ~6h processing.
4. [ ] Confirm a `Daysight Signup` conversion appears in Microsoft reporting, attributed to the campaign.
5. [ ] Only then scale budget / switch to Maximize Conversions.

---

## 6. Gotchas / quick reference
- Conversion **name must match the feed string exactly** (`Daysight Signup`, `Daysight Activation`).
- Import **time zone = UTC**, via a **no-DST UTC zone (Reykjavik/Monrovia)** since there's no plain "UTC" option. Never UTC+1 / Dublin (summer DST → conversions read early → before-click rejections). GMT-1 is a safe late-side fallback.
- **Conversion window = 60 days** on both goals (chosen). This is the click→conversion attribution limit; independent of the feed's 90-day *import-freshness* filter (MS rejects rows whose timestamp is >90 days old). Both fine — conversions happen within minutes-to-days of the click.
- Conversion time must be **after the click** and within the 60-day window, or the row won't be counted.
- **Auto-tagging must stay ON**, or `msclkid` never reaches the site.
- Re-imports are **idempotent** only because CountType = **Unique** + stable timestamps — don't switch a goal to "All".
- Secret rotation: change `MS_CONVERSIONS_TOKEN` in Vercel **and** the import URL together.
- Treat the numbers as **direction-finding**, not exact accounting (cross-device + tag-less = some undercount; see `MARKETING.md` §12).

---

## Sources
- MS Offline Conversion Record (format, 90-day/UTC, CountType): https://learn.microsoft.com/en-us/advertising/bulk-service/offline-conversion?view=bingads-13
- MS Tracking offline conversions (help): https://help.ads.microsoft.com/apex/index/3/en/56852
