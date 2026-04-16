# Landmarks — To-Do List to Get Fit & Competitive

**Date:** April 15, 2026
**Basis:** `Competitive_Assessment.md` (same folder)
**Guiding constraint:** Landmarks is a **very low $/user business** — affiliate-funded, ~$8–12 per completed order, realistic 10% click-to-purchase at MVP. Every item below is filtered through: *low capex, low opex, no recurring per-user cost, ships with a tiny team.* Anything that violates that filter has been pushed to a "not yet" list at the bottom.

Priority = expected lift on **completed affiliate purchases** (the only metric that keeps the lights on), divided by build cost.

---

## Tier 0 — Pre-launch blockers (do these before shipping publicly)

These close the gaps that would make a first-time user churn in under 60 seconds. None of them are optional.

### 0.1 — Turn "curation" into actual curation
The assessment flags this as priority #1, and correctly. A category→affiliate-URL lookup table is not a product; it's a form letter. Feed `notes` + `relationship` + `event_type` + past-gift history into an LLM that picks 3 items from the affiliate catalog, with a one-line rationale per pick ("She mentioned weekend hiking — this is a packable picnic kit under $50"). Run it batch at reminder-send time, cache the result. Cost is cents per reminder at current model prices — fits the unit economics.

**Effort:** 1–2 weeks. **Impact:** largest single lever on CTR and conversion.

### 0.2 — One-click contact import
CSV upload, Google Contacts OAuth, vCard paste. A user with 30 friends will not type 30 birthdays. This is the difference between a completed onboarding and a closed tab. Start with CSV + vCard (zero external dependencies); add Google OAuth second.

**Effort:** 3–5 days. **Impact:** large — directly raises activated-user count.

### 0.3 — Diversify affiliate partners to 6–8 before launch
Four is fragile. Amazon has cut commission rates three times since 2017; any single cut at 40%+ revenue concentration is a business-continuity event. Add partners across flowers, books, food/wine, experiences, eco/handmade, and a physical-card service. This is email outreach and contract admin, not code.

**Effort:** ongoing, 2–3 weeks of calendar time. **Impact:** protects the whole revenue line.

### 0.4 — Ship a minimum conversion dashboard
Track reminder sent → email opened → link clicked → partner purchase confirmed, broken down by partner, gift category, and reminder lead time (7-day vs 3-day). Without this, every product decision after launch is guessing. A single SQL-backed page is enough. Set explicit numeric targets up front — MVP baseline of 10% click-to-purchase, 40% of signups adding ≥5 contacts in week one — so "is this working" has an answer, not a vibe.

**Effort:** 2–4 days. **Impact:** multiplicative — enables every later optimization.

### 0.5 — Email deliverability foundation
For an email-first product, deliverability *is* the product. Before any public traffic: SPF, DKIM, DMARC (start at `p=quarantine`, move to `reject`), a dedicated sending subdomain (e.g. `mail.landmarks.app`) separate from the root so transactional reputation doesn't leak into marketing, IP warmup schedule, bounce/complaint handling, Google Postmaster + Microsoft SNDS monitoring. Ending up in Gmail's Promotions tab is a 5–10× silent cut to CTR, and it's the cheapest possible fix *before* volume, brutal to unwind after.

**Effort:** 2–3 days + ongoing monitoring. **Impact:** gates every downstream email metric.

### 0.6 — Sensitive-event flag (suppress gift curation where inappropriate)
Users will add death anniversaries, the first birthday after a death, sobriety dates, divorces. Event schema needs a `suppress_gifts: bool` (or an event-type taxonomy that carries it implicitly). The reminder should land warmly with no affiliate block. A single viral "Landmarks tried to sell me a gift card for my mother's death anniversary" screenshot is an existential brand event, and the mitigation is a one-hour schema change plus a checkbox in the event form.

**Effort:** half a day. **Impact:** asymmetric — tiny cost, prevents a category of catastrophic failure.

### 0.7 — Timezone-aware sending
Send in the user's local timezone, not server time. A 7-day reminder that lands at 3 a.m. local is a reminder that dies in the overnight email pile. Capture timezone at signup (browser default, user-editable), store per user, schedule per user. Cheap, but overlooked surprisingly often.

**Effort:** 1 day. **Impact:** meaningful on open rates, invisible when it works.

---

## Tier 1 — First 60 days post-launch (cheap, compounding)

### 1.1 — Gift-history ledger ("last year you sent Sarah…")
One extra table (`gift_history`), one extra line in the reminder email. Makes the product feel like it knows the user. Reduces decision fatigue → lifts repeat conversion on subsequent birthdays. Technically trivial.

**Effort:** 2–3 days. **Impact:** medium-large on repeat conversion, large on perceived product quality.

### 1.2 — Sunday weekly digest
A single email on Sunday: "Here's what's coming up this week." Solves the "inbox bankruptcy" failure mode without adding a new channel. Same infra, same cost.

**Effort:** 1–2 days. **Impact:** meaningful recovery of otherwise-missed reminders.

### 1.3 — Read-only .ics calendar feed
One URL per user that emits all their events as a subscribable calendar. The user's existing Google/Apple calendar becomes a second, free reminder channel. Zero per-user cost, zero ongoing maintenance.

**Effort:** 1–2 days. **Impact:** medium; also a defensible answer to the "why not just use Google Calendar" objection.

### 1.4 — Privacy as landing-page copy
The posture is already best-in-class — it's just invisible. Add: a "how we make money" line on the landing page, an explicit "we never email your contacts" line on the contacts page, one-click data export in the main nav. For the target audience (finance/law/consulting), this is a conversion driver, not a compliance checkbox.

**Effort:** half a day of copy + a couple hours to move the export button. **Impact:** medium on conversion, large on brand positioning.

### 1.5 — Email subject-line A/B testing
Two variants per reminder, automatic winner selection after ~200 sends. Free (no tooling cost beyond a column in the sends table). Over months, 10–20% CTR lift is realistic and compounds across every later feature.

**Effort:** 2–3 days. **Impact:** compounding on every email sent forever.

### 1.6 — Natural-language event entry
"Add Mike, March 12, loves hiking, reads fantasy." One LLM call parses it into contact + event + notes. Dayze demonstrates this works; it removes the last bit of setup friction. Marginal cost is fractions of a cent per add.

**Effort:** 2–3 days. **Impact:** medium on activation, compounds with 0.2.

### 1.7 — Preference center + unsubscribe granularity
One-click unsubscribe per RFC 8058 (required by Gmail/Yahoo for bulk senders anyway), plus a preference page where users can turn off digests without killing reminders, or pause a single contact's reminders without deleting the contact. Granular unsubscribe is the single biggest lever against full-account abandonment when life gets noisy, and it directly protects sender reputation.

**Effort:** 2–3 days. **Impact:** deliverability insurance + measurable retention on edge cases.

### 1.8 — Privacy-respecting product analytics
Self-hosted Plausible, Umami, or equivalent — no third-party trackers, no pixels, no Google Analytics. Reinforces the brand claim in 1.4 by actually matching it. Much cheaper to set up right now than to rip out a GA integration later when a prospective user asks why it's there.

**Effort:** half a day. **Impact:** small on metrics quality, large on brand consistency — it would be embarrassing to ship "privacy-first" with GA on the page.

---

## Tier 2 — Months 3–6 (grow without adding cost structure)

### 2.1 — Lightweight shared gift idea
A link a user can send to one other person — a partner, sibling — that shows a single gift candidate. Not a full Elfster clone. It's a viral loop with zero paid marketing cost: the recipient sees the product and often signs up.

**Effort:** 3–5 days. **Impact:** compounding acquisition channel; free.

### 2.2 — Referral program (invite → both parties get something small)
"Send this to a friend; if they sign up you both get [a tangible but cheap reward: a free premium physical card, a donation in the friend's name, etc.]." Free users inviting free users is the right shape for an affiliate business where marginal-user cost is near zero.

**Effort:** 3–5 days. **Impact:** the primary acquisition channel for a low-CAC business.

### 2.3 — Browser-extension "remember this person" bookmarklet
When the user's on a contact's LinkedIn or a Facebook profile, one click pre-fills name + photo + optional notes into a new Landmarks contact. Tiny surface area, massive reduction in friction for the "I should really add them" moment.

**Effort:** 1 week. **Impact:** medium on activated contacts per user; works as word-of-mouth demo.

### 2.4 — Affiliate-catalog shopping "save for later"
When a user browses a partner site (from any surface, not just a reminder), they can paste a URL into Landmarks as a gift idea attached to a contact. Builds a user-curated layer on top of the algorithmic one. Turns Landmarks into a gift CRM, not just a reminder tool. Low build cost — URL + contact_id + note.

**Effort:** 3–5 days. **Impact:** medium on long-term retention and perceived utility.

### 2.5 — Optional SMS via Twilio for the 3-day reminder only
Twilio SMS is $0.008/message in the US. At 8 reminders/user/year on the 3-day cadence, that's ~6 cents per user per year — well within affiliate-funded economics even at the pessimistic 10% conversion rate. Make it opt-in, a single channel, one message type only. Do *not* let this creep into a primary channel; email stays the default.

**Effort:** 3–5 days plus compliance review. **Impact:** medium on reminder reliability, small on cost.

### 2.6 — Per-partner CTR/CVR reporting, surfaced to affiliate partners
Once there's a month of data, send partners a one-page report showing click-through and conversion rates. This is the lever that gets commission-rate bumps — partners pay more for traffic they know converts. Zero product-side work beyond the dashboard in 0.4.

**Effort:** a half-day per month. **Impact:** directly raises $/order.

### 2.7 — Lapsed-user re-engagement drip
The expensive failure isn't churn — it's the user who signs up, adds zero contacts, and goes quiet. A 3-email nudge sequence at D+3, D+10, D+30 ("here's a 60-second contact import," "here's what a Landmarks reminder actually looks like," "one birthday you probably don't want to miss next month") reclaims a meaningful slice of them for pennies. Reuses the sending infra from 0.5.

**Effort:** 2 days. **Impact:** recovers activation without new acquisition spend.

### 2.8 — One-page partner pitch doc
Most affiliate partner onboarding stalls in email. A short, concrete pitch — who the audience is, expected send volume, sample reminder email, UTM conventions, the reporting from 2.6 — cuts the partner-add loop from weeks to days and makes 0.3 and its long-tail ongoing version much less painful. Not product work, but it's the single thing that most compresses the revenue-diversification timeline.

**Effort:** half a day. **Impact:** compounds the value of every partner conversation.

---

## Tier 3 — Defensive / strategic (keep an eye on, act if triggered)

### 3.1 — Monitor Etsy Gift Mode and Amazon Gift Mode for "reminders" feature launch
If either ships reminders, the Landmarks moat narrows from "month" to "week." No build cost — just a weekly scan. Trigger: if either ships it, prioritize 0.1 depth and 1.1 personalization even harder; the differentiator becomes memory-plus-privacy, not just curation.

### 3.2 — Evaluate open-sourcing the email-reminder engine
The reminder scheduler is simple. Open-sourcing the non-differentiating piece (scheduler + email templating) costs nothing, earns developer goodwill, and reinforces the privacy brand. Keep curation closed. Revisit at 2,000+ users.

### 3.3 — Rate-limit + abuse prevention on contact imports
Someone will try to import 10,000 contacts and spray the system. Cheap to handle now (server-side row count cap, email-domain rate limits); expensive to handle after it happens.

**Effort:** 1 day. **Impact:** prevents an outage and/or deliverability blacklist.

---

## What to explicitly NOT do yet (and why)

- **Native mobile app.** Wrong investment for a tiny team and a responsive-web audience. Email lands on mobile already.
- **Subscription tier.** One of the clearest positioning wins is being the non-subscription option in a subscription-fatigued category. Revisit at 5,000+ users, not before.
- **AI-autonomous gifting ("we'll just send something").** Asymmetric reputational risk (one bad gift goes viral). Margin doesn't support the support burden.
- **Paid acquisition at meaningful scale.** LTV at 10% conversion and ~$10 commission per order is too thin to buy users profitably. Invest the same dollars into 2.1 and 2.2 (viral loops) instead.
- **Building a full group-gifting / Secret Santa product.** Elfster owns that category with 40M users; a feature inside Landmarks (2.1) is the right slice.
- **On-device encryption / zero-knowledge architecture.** The data isn't sensitive enough to justify the engineering tax, and the blueprint's posture already beats 90% of competitors.
- **Corporate / team / HR-gifting tier.** A real adjacent market, but the sales cycle, contracts, and support expectations are a different business. Revisit only if inbound demand is unignorable.
- **Custom domains / white-label.** Flattering to be asked, distracting to build.

---

## Suggested sequencing (rough)

- **Weeks 1–4:** 0.1, 0.2, 0.4, 0.5, 0.6, 0.7 in parallel (0.5–0.7 are each ≤3 days and cheap to parallelize). 0.3 running in background. 2.8 knocked out in an afternoon to accelerate 0.3.
- **Weeks 5–8:** 0.3 finished, 1.1–1.5 and 1.7–1.8 in parallel (all small).
- **Weeks 9–16:** 1.6, 2.1, 2.2, 2.7 — turn on growth loops and re-engagement once curation + analytics prove the funnel.
- **Months 4–6:** 2.3, 2.4, 2.5, 2.6 — efficiency and partner-relationship work.
- **Ongoing:** 3.1 weekly, 3.2 and 3.3 as triggered.

---

## One-line summary
The single bet is **0.1 (real curation) + 0.4 (measure everything) + 2.1/2.2 (free growth loops)**. If those work, the rest of this list is incremental polish. If they don't, no amount of polish saves it.
