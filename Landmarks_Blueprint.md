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

  Click-through-to-purchase rate           25--30%

  Avg. affiliate commission per purchase   \$8--12

  Monthly revenue                          \$2,000--\$3,600

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

**6.3 Revenue Projection (Conservative)**

  --------------------------------------------------------------------------------------------------------------------------
  **Month**   **Users**   **Contacts (avg 8)**   **Monthly Events**   **Click-to-Purchase (25%)**   **Revenue (\$10 avg)**
  ----------- ----------- ---------------------- -------------------- ----------------------------- ------------------------
  3           100         800                    67                   17                            \$170

  6           400         3,200                  267                  67                            \$670

  9           800         6,400                  533                  133                           \$1,330

  12          1,500       12,000                 1,000                250                           \$2,500

  18          3,000       24,000                 2,000                500                           \$5,000

  24          5,000       40,000                 3,333                833                           \$8,330
  --------------------------------------------------------------------------------------------------------------------------

The "Monthly Events" column divides total contacts by 12 (assuming birthdays are roughly evenly distributed across months). The click-to-purchase rate of 25% is conservative; curated, context-aware gift recommendations in a transactional email typically convert at 20--35%.

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

-   Build the gift link curation logic: map gift categories to affiliate URLs.

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

-   AI gift recommendations: Use contact notes ("likes dark chocolate," "into hiking") to personalize gift suggestions. Could significantly improve click-to-purchase rates.

-   Shared accounts / couples mode: Let two users manage a combined contact list so both partners are reminded and coordinated on gifts.

-   Corporate/team plans: Offer a version for managers who want to remember their team's birthdays and work anniversaries. Higher willingness to pay; expense-account pricing.

-   Automatic gift sending: Partner with a fulfillment service to let users pre-authorize a gift that auto-ships on the event date. This is the ultimate convenience play.

-   iOS / Android app: Only if email-first proves limiting. The SwiftUI skills you're building would be directly applicable here.

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
