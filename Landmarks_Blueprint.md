**Landmarks**

Birthday & Gift Reminder Service

Product Blueprint & Business Plan

Version 1.0 --- March 2026

**CONFIDENTIAL**

**1. Executive Summary**

Landmarks is an email-first web application that ensures busy professionals never miss an important date for the people they care about. Users enter their contacts and key dates once, pre-select gift categories, and the system handles the rest: timely email reminders with curated, one-click gift purchase links.

The service is free to use. Revenue comes from affiliate commissions on gift purchases made through the reminder emails. This model eliminates subscription friction, aligns revenue with user value delivery, and creates a naturally sticky product since personal dates don't change.

**Target user:** Time-constrained professionals (finance, consulting, tech, law) aged 24--40 who have disposable income but limited mental bandwidth for personal logistics.

**Core insight:** Calendar reminders tell you a birthday is coming. Landmarks tells you what to do about it.

**Key Metrics Target (Month 12)**

  -----------------------------------------------------------------------
  **Metric**                               **Target**
  ---------------------------------------- ------------------------------
  Registered users                         1,500

  Avg. contacts per user                   8

  Monthly gift-purchase opportunities      1,000

  Click-through-to-purchase rate           8--12% (baseline), 15--20% (target as scoring improves)

  Avg. affiliate commission per purchase   \$8--12

  Monthly revenue                          \$800--\$1,200 (at 10% baseline)

  Monthly infrastructure cost              \<\$50
  -----------------------------------------------------------------------

**2. Product Design**

**2.1 User Journey**

The entire product experience is designed to require minimal ongoing engagement from the user. The initial setup takes 5--10 minutes. After that, the product works in the background and surfaces only when action is needed.

1.  User signs up via the website (email/password or Google OAuth).

2.  User adds contacts: first name, optional last name, relationship tag (family, friend, colleague).

3.  User adds dates for each contact: birthday, anniversary, or custom events.

4.  User selects default gift preferences per contact or globally: gift card, flowers, cake/treats, wine, charitable donation, or "just remind me."

5.  System sends a reminder email 7 days before and 3 days before each event.

6.  Each reminder email includes 3--4 curated gift links based on the user's preferences, with affiliate tracking.

7.  User clicks a link, completes the purchase on the partner site. Landmarks earns a commission.

**2.2 Reminder Email Design**

The reminder email is the core product surface. It must be clean, personal, and frictionless. Every element should reduce the time between "opening the email" and "completing a gift purchase."

-   Subject line: "Your mom Sarah's birthday is in 7 days --- here's what to get her"

-   Body: Contact name, event, date, and 3--4 gift recommendations as clickable cards with price, image, and a "Buy Now" button.

-   Fallback: A "Just send a gift card" button for users who don't want to browse.

-   Footer: Quick link to add/edit contacts, unsubscribe, or snooze reminders for this contact.

**2.3 What the Product Is Not**

Landmarks is deliberately narrow in scope. It is not a social network, a gift registry, a greeting card service, or a calendar app. It solves exactly one problem: making sure you don't forget the people who matter, and making it effortless to act on that reminder. Scope discipline is critical to keeping maintenance low and the product reliable.

**3. Technical Architecture**

**3.1 Design Principles**

-   Use managed services with generous free tiers that scale automatically.

-   Pay near-zero at MVP scale; costs grow linearly and predictably with usage.

-   No vendor lock-in on the database layer (standard Postgres).

-   Minimal moving parts: fewer services = fewer failure points = less weekend maintenance.

**3.2 Stack Overview**

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Layer**        **Technology**                        **Why This Choice**                                                                               **Cost at MVP**
  ---------------- ------------------------------------- ------------------------------------------------------------------------------------------------- -------------------------
  Frontend + API   Next.js on Vercel                     Full-stack in one framework; API routes eliminate need for separate backend; Vercel auto-scales   \$0 (free tier)

  Database         Supabase (Postgres)                   Real relational DB; row-level security; built-in auth; can migrate to any Postgres host later     \$0 (free tier)

  Authentication   Supabase Auth                         Bundled with DB; supports email/password + Google OAuth; handles sessions, tokens, hashing        \$0 (included)

  Email Delivery   Resend                                Modern API; clean DX; reliable delivery; GDPR-compliant                                           \$0 (3k emails/mo free)

  Scheduled Jobs   Vercel Cron                           Built into Vercel; triggers serverless functions on schedule; no infra to manage                  \$0 (free tier)

  Domain           Any registrar                         e.g., Namecheap, Cloudflare                                                                       \~\$12/year

  Monitoring       Vercel Analytics + Sentry free tier   Basic error tracking and performance monitoring                                                   \$0
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**3.3 Infrastructure Cost Scaling**

One of the strongest aspects of this architecture is that costs scale gently and predictably. You will not face a sudden cost cliff.

  ------------------------------------------------------------------------------------
  **User Count**   **Supabase**    **Resend**    **Vercel**      **Total/Month**
  ---------------- --------------- ------------- --------------- ---------------------
  0--500           Free            Free          Free            \~\$1 (domain only)

  500--2,000       \$25/mo (Pro)   \$20/mo       Free            \~\$45/mo

  2,000--5,000     \$25/mo         \$40/mo       \$20/mo (Pro)   \~\$85/mo

  5,000--10,000    \$50/mo         \$80/mo       \$20/mo         \~\$150/mo
  ------------------------------------------------------------------------------------

At every tier, your affiliate revenue should comfortably exceed infrastructure costs. The business is cash-flow positive from the first paying click.

**4. Database Schema**

**4.1 Entity Relationship Summary**

The data model is intentionally minimal. Four tables cover the entire product. Each table is protected by Supabase Row-Level Security (RLS) so users can only access their own data at the database level.

**4.2 Tables**

**users**

Managed by Supabase Auth. Stores authentication credentials, email, and account metadata. You do not need to create this table manually; Supabase provisions it in the auth schema.

**profiles**

Extends the auth user with application-specific settings.

  ---------------------------------------------------------------------------------------------------------------------------------
  **Column**              **Type**                     **Notes**
  ----------------------- ---------------------------- ----------------------------------------------------------------------------
  id                      UUID (PK, FK → auth.users)   Matches Supabase auth user ID

  display_name            TEXT                         Optional; used in email greetings

  timezone                TEXT                         e.g., "America/New_York"; ensures reminders arrive at sensible local times

  reminder_days_before    INTEGER\[\]                  Default: \[7, 3\]; user can customize

  default_gift_category   TEXT                         Global fallback if no per-contact preference set

  created_at              TIMESTAMPTZ                  Auto-set

  updated_at              TIMESTAMPTZ                  Auto-updated via trigger
  ---------------------------------------------------------------------------------------------------------------------------------

**contacts**

  --------------------------------------------------------------------------------------------------------------
  **Column**         **Type**               **Notes**
  ------------------ ---------------------- --------------------------------------------------------------------
  id                 UUID (PK)              Auto-generated

  user_id            UUID (FK → profiles)   Owner of this contact

  first_name         TEXT (required)        Used in reminder emails

  last_name          TEXT (optional)        Not displayed in emails by default; kept for user's reference only

  relationship       TEXT                   Tag: family, friend, colleague, other

  gift_category      TEXT (nullable)        Overrides user's global default for this contact

  notes              TEXT (nullable)        Freeform; e.g., "likes dark chocolate," "allergic to flowers"

  created_at         TIMESTAMPTZ            Auto-set
  --------------------------------------------------------------------------------------------------------------

**events**

  -------------------------------------------------------------------------------------------------------------------------------
  **Column**         **Type**               **Notes**
  ------------------ ---------------------- -------------------------------------------------------------------------------------
  id                 UUID (PK)              Auto-generated

  contact_id         UUID (FK → contacts)   Which contact this event belongs to

  user_id            UUID (FK → profiles)   Denormalized for efficient querying and RLS

  event_type         TEXT                   birthday, anniversary, custom

  event_label        TEXT (nullable)        For custom events: "graduation," "retirement"

  month              SMALLINT (1--12)       Stored as month + day, not full date, since year is irrelevant for recurring events

  day                SMALLINT (1--31)       Day of month

  year_started       SMALLINT (nullable)    Optional; allows "turning 30!" context in reminders

  created_at         TIMESTAMPTZ            Auto-set
  -------------------------------------------------------------------------------------------------------------------------------

**reminder_log**

Tracks which reminders have been sent to prevent duplicates and enable analytics.

  -----------------------------------------------------------------------------------------------------
  **Column**         **Type**               **Notes**
  ------------------ ---------------------- -----------------------------------------------------------
  id                 UUID (PK)              Auto-generated

  user_id            UUID (FK → profiles)   Who received the reminder

  event_id           UUID (FK → events)     Which event triggered it

  sent_at            TIMESTAMPTZ            When the email was dispatched

  reminder_type      TEXT                   "7_day" or "3_day"

  email_id           TEXT (nullable)        Resend's message ID for tracking delivery

  clicked            BOOLEAN                Whether any gift link was clicked

  purchased          BOOLEAN                Whether affiliate conversion was confirmed (if trackable)
  -----------------------------------------------------------------------------------------------------

**4.3 Row-Level Security Policies**

Every table with user data has RLS enabled. The policies follow a simple pattern: a user can only SELECT, INSERT, UPDATE, and DELETE rows where user_id matches their authenticated session ID. This is enforced at the database level, meaning even a bug in application code cannot leak another user's data.

Example policy (applied to each table):

*CREATE POLICY \"Users can only access own data\" ON contacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);*

**5. Cron Job & Email Logic**

**5.1 How the Reminder Engine Works**

A Vercel Cron job runs once daily (e.g., 8:00 AM UTC). It triggers a serverless API route that performs the following steps:

8.  Query the events table for all events whose month/day falls within a user's configured reminder window (e.g., 7 days or 3 days from today, adjusted for the user's timezone).

9.  Cross-reference the reminder_log table to skip any events that have already received a reminder of that type for this year.

10. For each unsent reminder: look up the contact's gift category (falling back to the user's global default), generate the appropriate affiliate links, compose the email, and send via Resend.

11. Log each sent reminder to the reminder_log table with the Resend message ID.

**5.2 Edge Cases to Handle**

-   Timezone math: A user in EST might have a birthday "tomorrow" while UTC says it's still "today." Always convert to the user's local timezone before calculating reminder windows.

-   Leap year: February 29 birthdays should trigger reminders on February 28 in non-leap years.

-   Late signups: If a user adds a contact whose birthday is 2 days away and their first reminder window is 7 days, send an immediate "heads up" email.

-   Duplicate prevention: The reminder_log table and a unique constraint on (event_id, reminder_type, year) ensures no double-sends even if the cron job runs twice.

**5.3 Scaling Considerations**

At small scale (under 5,000 users), a single cron invocation can process all reminders in one pass. If the user base grows beyond that, batch the query by user timezone buckets and process in parallel serverless invocations. Vercel's serverless functions have a 10-second timeout on the free tier (60 seconds on Pro), which is ample for batched email sends via Resend's batch API.

**6. Revenue Model: Affiliate Commissions**

**6.1 Why Affiliate Over Subscription**

A \$0.50--\$1.00/month subscription creates friction (credit card entry, perceived cost vs. free alternatives) while generating minimal revenue per user. Affiliate commissions align your revenue with the moment the user gets the most value: when they actually buy a gift. A single flower delivery commission can exceed an entire year's subscription revenue from that user.

**6.2 Target Affiliate Programs**

  -------------------------------------------------------------------------------------------------------------------------------------------------
  **Partner Category**   **Example Partners**                **Typical Commission**                 **Avg. Order Value**   **Est. Revenue/Order**
  ---------------------- ----------------------------------- -------------------------------------- ---------------------- ------------------------
  Flowers                1-800-Flowers, FTD, Bouqs           10--15%                                \$60--\$90             \$6--\$13

  Gift Cards             Amazon Associates, Raise            1--4% (Amazon), \$2--5 flat (others)   \$25--\$100            \$1--\$4

  Gourmet Food / Cakes   Goldbelly, Harry & David            5--10%                                 \$50--\$80             \$3--\$8

  Wine / Spirits         Wine.com, Drizly                    5--10%                                 \$40--\$70             \$2--\$7

  Experiences            Uncommon Goods, Tinggly             8--12%                                 \$50--\$150            \$4--\$18

  Charitable Donations   Charity partner referral programs   Flat fee per referral                  Varies                 \$2--\$5
  -------------------------------------------------------------------------------------------------------------------------------------------------

Weighted average across categories: approximately \$8--\$12 per completed purchase. This is the number used in revenue projections throughout this document.

**6.3 Revenue Projection (Realistic)**

  --------------------------------------------------------------------------------------------------------------------------
  **Month**   **Users**   **Contacts (avg 8)**   **Monthly Events**   **Click-to-Purchase (10%)**   **Revenue (\$10 avg)**
  ----------- ----------- ---------------------- -------------------- ----------------------------- ------------------------
  3           100         800                    67                   7                             \$70

  6           400         3,200                  267                  27                            \$270

  9           800         6,400                  533                  53                            \$530

  12          1,500       12,000                 1,000                100                           \$1,000

  18          3,000       24,000                 2,000                200                           \$2,000

  24          5,000       40,000                 3,333                333                           \$3,330
  --------------------------------------------------------------------------------------------------------------------------

The "Monthly Events" column divides total contacts by 12 (assuming birthdays are roughly evenly distributed across months). The click-to-purchase rate of 10% is a realistic MVP baseline. Well-designed transactional emails in retail run 15--25% CTR, but click-to-*purchase* (a completed transaction at a partner site, attributed correctly, with no cart abandonment) is typically 30--50% of CTR. An honest starting point is 8--12%, climbing toward 15--20% as the scoring-based curation system accumulates click and purchase data and the recommendation weights are tuned. Plan the unit economics at 10%, not 25%.

**7. Data Privacy & Security**

**7.1 Data Classification**

  --------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Data Type**                **Sensitivity**   **Storage**                                            **Notes**
  ---------------------------- ----------------- ------------------------------------------------------ --------------------------------------------------------
  User email + password hash   High              Supabase Auth (encrypted at rest)                      Passwords are bcrypt-hashed; never stored in plaintext

  Contact names                Medium            Supabase Postgres (encrypted at rest, RLS-protected)   Store first names only by default; last names optional

  Event dates                  Low--Medium       Supabase Postgres (encrypted at rest, RLS-protected)   No year-of-birth stored unless user opts in

  Gift preferences             Low               Supabase Postgres (RLS-protected)                      Category tags only; no purchase history stored

  Payment information          N/A               Not stored anywhere                                    All transactions happen on partner sites
  --------------------------------------------------------------------------------------------------------------------------------------------------------------

**7.2 Security Measures**

-   Encryption at rest: Supabase encrypts all Postgres data on disk by default (AES-256).

-   Encryption in transit: All connections use TLS/HTTPS, enforced by both Vercel and Supabase.

-   Row-Level Security: Database-level enforcement ensures users can only access their own data, regardless of application-layer bugs.

-   Authentication: Supabase Auth handles password hashing (bcrypt), session management, and OAuth flows. No custom auth code.

-   Input validation: All user inputs are validated and sanitized on the server side before database insertion.

-   Rate limiting: API routes implement rate limiting to prevent abuse (e.g., mass contact creation).

-   No analytics tracking: No third-party analytics scripts, no tracking pixels in emails, no behavioral profiling. You know what dates they entered and what links they clicked. That's it.

**7.3 Privacy Policy Commitments**

Your privacy policy should make the following commitments clearly and without legal obfuscation:

-   We do not sell, rent, or share your data with any third party.

-   We do not use your data for advertising or profiling.

-   Email addresses of your contacts are never collected or stored.

-   Reminder emails are sent only to you, the account holder.

-   You can export all your data at any time (JSON download).

-   You can permanently delete your account and all associated data at any time. Deletion is real and irreversible, not a soft delete.

-   We use Supabase and Resend as sub-processors. Both offer GDPR-compliant Data Processing Agreements.

**7.4 GDPR / CCPA Compliance**

Even with a small user base, building compliance in from the start is far easier than retrofitting. The key requirements are: lawful basis for processing (legitimate interest / consent), right to access (data export), right to erasure (account deletion), and transparency (clear privacy policy). The architecture described above satisfies all of these by default.

**8. Build Timeline (Weekends Only)**

This timeline assumes approximately 8--10 hours of work per weekend (Saturday + Sunday). The phases are sequential but each results in a working, testable increment.

**Phase 1: Foundation (Weekends 1--2)**

-   Set up Next.js project, deploy to Vercel, configure custom domain.

-   Set up Supabase project: create database tables, enable RLS, configure auth.

-   Build signup/login flow (email + Google OAuth).

-   Build the "add contacts" and "add events" forms.

-   Deliverable: Users can sign up and enter their data. No emails yet.

**Phase 2: Reminder Engine (Weekends 3--4)**

-   Integrate Resend for email delivery.

-   Design and build the HTML email template.

-   Build the cron job logic: query upcoming events, compose emails, send, log.

-   Handle timezone math and edge cases.

-   Deliverable: The core product works end-to-end. You can test with your own contacts.

**Phase 3: Affiliate Integration (Weekend 5)**

-   Sign up for affiliate programs (Amazon Associates, 1-800-Flowers, etc.).

-   Build the gift scoring and curation engine: structured gift catalog with tags, keyword-to-tag parser for contact notes, weighted scoring function that ranks items by category match, relationship affinity, event type, seasonality, and safe-default fallback. See Section 11.1 for architecture details.

-   Add affiliate tracking parameters to all outbound links.

-   Deliverable: Reminder emails now include monetized gift links.

**Phase 4: Polish & Launch Prep (Weekends 6--7)**

-   Build the dashboard: view/edit contacts, upcoming reminders, account settings.

-   Build the "delete my account" flow (hard delete all data).

-   Build the data export feature (JSON download).

-   Write the privacy policy and terms of service.

-   Manual QA and edge-case testing.

-   Deliverable: Product is launch-ready.

**Phase 5: Soft Launch (Weekend 8)**

-   Launch to a small audience: personal network, relevant Reddit/Twitter communities, one or two ProductHunt/HackerNews posts.

-   Collect feedback, fix bugs, iterate.

-   Deliverable: Real users, real data, real revenue signal.

Total estimated time to launch: 8 weekends (\~60--80 hours of focused work).

**9. Marketing & User Acquisition**

With no subscription to pitch, your "sale" is just getting someone to sign up and enter their contacts. That's a very low ask, which makes organic growth channels viable even without a marketing budget.

**9.1 Launch Channels**

-   Personal network: Your colleagues, friends, and finance community contacts are the ideal early adopters. They're busy, they forget birthdays, and they'll give honest feedback.

-   Reddit: r/productivity, r/LifeProTips, r/sidehustle, r/startups. Frame it as "I built this to solve my own problem" --- authentic posts perform well.

-   Twitter/X: Finance Twitter is active and supportive of builder-professionals. A thread about building a side project while working in finance will resonate.

-   Product Hunt: A clean landing page and a good one-liner ("Never forget a birthday again. Free.") can drive a few hundred signups on launch day.

**9.2 Organic Growth Levers**

-   SEO: Target long-tail keywords like "birthday reminder service," "never forget a birthday," "automated gift reminders." These have low competition and high intent.

-   Word of mouth: The product has a natural referral loop. When someone receives a thoughtful, on-time gift, the recipient often asks "how did you remember?" That's your referral moment.

-   Content marketing: Short blog posts about gift ideas by relationship type, occasion, and budget. These serve dual purposes: SEO traffic and gift recommendation authority.

**9.3 What Not to Spend Money On (Yet)**

Paid advertising (Google Ads, Meta Ads) is premature until you've validated product-market fit with organic users. The unit economics of paid acquisition at \$0 subscription revenue and \$8--\$12 per affiliate conversion need careful modeling before you invest. Keep the \$20k budget in reserve for paid growth only after you've proven the organic funnel converts.

**10. Risks & Mitigations**

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Risk**                                                **Likelihood**   **Impact**          **Mitigation**
  ------------------------------------------------------- ---------------- ------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------
  Users set reminders but don't click gift links          Medium           High (no revenue)   Test email subject lines and gift curation quality aggressively. Add a "quick gift card" option that's frictionless. Track click rates and iterate.

  Affiliate programs change terms or close                Medium           Medium              Diversify across 4--6 programs from day one. Never depend on a single partner for \>40% of revenue.

  Free alternatives (Google Calendar) are "good enough"   High             Medium              The gift curation is your differentiator, not the reminder. Lean into the "what to do about it" angle in all messaging.

  Low organic signup rate                                 Medium           High                Validate demand before building the full product. A landing page with an email waitlist (Mailchimp, free) can test interest in 1--2 weekends.

  Email deliverability issues (spam folders)              Low              High                Use a reputable sender (Resend), authenticate with SPF/DKIM/DMARC, keep content clean, and warm up the domain gradually.

  Data breach or security incident                        Low              Very High           RLS, encryption, minimal data collection, and no payment data storage. The attack surface is deliberately small.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**11. Future Enhancements (Post-Launch)**

These are ideas to pursue only after the core product is stable and generating revenue. Do not build any of these before launch.

-   SMS reminders: Offer a premium tier (\$2--3/month) for text message reminders in addition to email. This introduces subscription revenue alongside affiliate income.

-   Scoring-based gift recommendations (core, not future --- build before launch): A weighted scoring function that ranks gift catalog items per reminder using category match, keyword-extracted tags from contact notes, relationship and event-type affinity, click/purchase history, price-tier inference, seasonality, and diversity constraints. No LLM required --- per-query cost is zero, the system is deterministic and debuggable, and it improves automatically as click and feedback data accumulates. See Section 11.1 for full architecture.

-   Shared accounts / couples mode: Let two users manage a combined contact list so both partners are reminded and coordinated on gifts.

-   Corporate/team plans: Offer a version for managers who want to remember their team's birthdays and work anniversaries. Higher willingness to pay; expense-account pricing.

-   Automatic gift sending: Partner with a fulfillment service to let users pre-authorize a gift that auto-ships on the event date. This is the ultimate convenience play.

-   iOS / Android app: Only if email-first proves limiting. The SwiftUI skills you're building would be directly applicable here.

**11.1 Gift Curation Engine Architecture (No-LLM Scoring System)**

The gift curation system uses a deterministic, weighted scoring function rather than an LLM. This is a deliberate architectural decision: for a free, affiliate-funded service where every reminder email has zero marginal cost, adding a per-query LLM expense (even at cents per call) introduces a cost that scales linearly with the most important usage metric (reminders sent). The scoring approach keeps per-reminder cost at exactly zero, is fully deterministic and debuggable, and improves automatically as behavioral data accumulates.

**Gift Catalog Structure**

Each item in the catalog is a structured record, not a flat URL mapping:

  --------------------------------------------------------------------------------------------
  **Field**                **Type**          **Purpose**
  ------------------------ ----------------- -------------------------------------------------
  id                       UUID              Unique identifier

  name                     TEXT              Display name in reminder email

  partner_id               UUID (FK)         Which affiliate partner

  affiliate_url            TEXT              Tracking-parameterized purchase URL

  price_tier               ENUM              under_25, 25_50, 50_100, over_100

  tags                     TEXT[]            Controlled vocabulary (outdoors, cooking, books, tech, wellness, humor, sentimental, experience, practical, luxury, eco, food_drink, flowers, handmade); 2--4 per item

  relationship_affinities  JSONB             Scores by relationship type, e.g. {"family": 0.9, "friend": 0.7, "colleague": 0.3}

  event_type_affinities    JSONB             Scores by event type, e.g. {"birthday": 0.8, "anniversary": 0.9}

  season_start             SMALLINT          Month (1--12) when item is most appropriate (nullable)

  season_end               SMALLINT          Month (1--12) end of seasonal window (nullable)

  safe_default             BOOLEAN           Show this item when there is zero personalization signal

  active                   BOOLEAN           Can be deactivated without deletion
  --------------------------------------------------------------------------------------------

A catalog of 100--200 well-tagged items is far more useful than 1,000 items with no structure. Manual curation during affiliate onboarding is the work that makes the system go.

**Keyword-to-Tag Parser (Notes Field)**

A `keyword_tags` reference table maps common words to the controlled tag vocabulary:

  -----------------------------------------------
  **keyword**     **tag**        **is_negative**
  --------------- -------------- -----------------
  hiking          outdoors       false
  cooking         cooking        false
  chef            cooking        false
  vegan           eco            false
  wine            food_drink     false
  allergic        (modifier)     true
  -----------------------------------------------

The parser runs case-insensitive substring matching against the contact's notes field. Negation patterns (regex: `(no|not|don't|doesn't|hate|hates|allergic|never)\s+\w*\s*(keyword)`) trigger tag exclusions. Approximately 150--200 keyword entries cover the majority of what users write. Notes that produce zero tag matches should be logged and reviewed monthly to expand the dictionary.

**Scoring Function**

At reminder-send time, every active catalog item is scored for the specific (user, contact, event) tuple:

`score = (category_match * 5) + (tag_match * 3) + (relationship_affinity * 2) + (click_history_contact * 4) + (click_history_similar * 1.5) + (popularity * 1) + (price_match * 2) + (seasonality * 1) - (repeat_penalty * 10) - (negative_tag * 1000)`

Signal sources, in order of importance once behavioral data exists:

1.  **Category match.** Contact-level or user-default gift category preference. Strongest explicit signal; dominates early.
2.  **Tag match from notes.** Keywords extracted from the contact's notes field, matched against item tags.
3.  **Click history for this contact.** If the user clicked "experience" gifts for this contact last year but ignored "flowers," boost experiences and demote flowers for this contact specifically.
4.  **Relationship affinity.** Each item's pre-set affinity score for the contact's relationship type.
5.  **Price-tier match.** Inferred from past click/purchase behavior per user per relationship type. No need to ask --- behavior reveals budget preferences.
6.  **Click history for similar contacts.** If the user clicks "food_drink" for all colleague contacts, apply that pattern to new colleagues.
7.  **Global popularity.** Across all users, which items get clicked/purchased most. Updated weekly. Cold-start fallback.
8.  **Seasonality.** Month-range flags on catalog items (beach gear for summer birthdays, hot chocolate for winter).
9.  **Repeat penalty.** Items purchased for this contact in the prior year are heavily penalized. Items shown in the 7-day reminder but not clicked are penalized in the 3-day reminder.
10. **Diversity constraint.** Post-scoring, enforce that the final 3--4 items span at least 2--3 different tags. One "obvious match," one "thoughtful surprise," one "safe fallback."

Weights are the tunable parameter. Start with the values above; adjust based on aggregate click-through data as it accumulates.

**Data Collection Schema**

Three tables support the feedback loop:

`click_events`: id, user_id, contact_id, event_id, gift_item_id, reminder_type (7_day / 3_day), clicked_at.

`gift_feedback`: id, user_id, contact_id, gift_item_id, rating (+1 / -1), note (optional text), created_at. Populated via a post-purchase follow-up email ("Did they like it? Thumbs up / thumbs down").

`reminder_log.shown_items`: JSONB column added to the existing reminder_log table, recording the full set of item IDs shown in each reminder. This captures negative signal --- items shown but not clicked.

**Feedback Loops**

-   Click data tunes scoring weights automatically (compare predicted scores vs. actual clicks).
-   Post-purchase thumbs-up/down strengthens or weakens tag associations for specific contacts.
-   "None of these feel right?" link in reminder emails captures free-text input that flows into the contact's notes field, improving future keyword-tag extraction.
-   Implicit budget calibration from purchase price history, per user, per relationship type.
-   At 1,000+ users with purchase data, a simple collaborative filter (cosine similarity on user-item click matrices) can supplement rule-based scoring for cold-start contacts. Do not build this before that threshold.

**Why Not an LLM**

An LLM could parse notes fields more flexibly and generate more creative recommendations. But for a free service with affiliate-margin economics (\~\$10/order at realistic 10% conversion), per-reminder LLM cost is a direct tax on the only revenue event. The keyword parser + scoring function achieves ~80% of LLM curation quality at zero marginal cost, is fully deterministic (same inputs always produce same outputs, making debugging trivial), and improves with data rather than prompt engineering. An LLM layer can be evaluated later if affiliate margins support it, but the scoring system should be built first regardless --- it provides the behavioral data infrastructure that any future approach (including LLM-based) would need.

**12. Appendix: Quick-Reference Checklists**

**Pre-Build Checklist**

-   Register domain name

-   Create Vercel account and link to GitHub repo

-   Create Supabase project

-   Create Resend account and verify sending domain

-   Sign up for Amazon Associates

-   Research and apply to 3--4 additional affiliate programs

-   Draft privacy policy (use a generator as a starting point, then customize)

**Launch-Day Checklist**

-   All RLS policies tested and verified

-   Account deletion flow tested (confirm data is fully removed)

-   Email deliverability tested (check spam scores with mail-tester.com)

-   SPF, DKIM, and DMARC records configured for sending domain

-   Privacy policy and terms of service published

-   Error monitoring (Sentry) configured and alerting

-   Landing page copy finalized

-   Prepared launch posts for Reddit, Twitter, Product Hunt

**Monthly Maintenance Checklist**

-   Review error logs and fix any failed email sends

-   Check affiliate program dashboards for revenue and commission changes

-   Review email open/click rates and iterate on subject lines or gift curation

-   Check Supabase usage dashboard for approaching tier limits

-   Respond to any user feedback or support requests

*Estimated monthly maintenance time: 2--4 hours.*
