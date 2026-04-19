/**
 * Landmarks – Local Data Store
 * Simulates the Supabase/Postgres backend using localStorage.
 * When migrating to production, swap these functions for Supabase client calls.
 */

const Store = (() => {
  const KEYS = {
    users: 'lm_users',
    currentUser: 'lm_current_user',
    profiles: 'lm_profiles',
    contacts: 'lm_contacts',
    events: 'lm_events',
    reminderLog: 'lm_reminder_log',
    conversion: 'lm_conversion_events',
    shownGifts: 'lm_shown_gifts',
  };

  const get = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch { return []; }
  };
  const getObj = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || null;
    } catch { return null; }
  };
  const set = (key, val) => localStorage.setItem(key, JSON.stringify(val));

  const uuid = () => crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });

  const now = () => new Date().toISOString();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const auth = {
    signUp(email, password, displayName) {
      const users = get(KEYS.users);
      if (users.find(u => u.email === email)) {
        return { error: 'An account with this email already exists.' };
      }
      const user = { id: uuid(), email, password, created_at: now() };
      users.push(user);
      set(KEYS.users, users);

      const profiles = get(KEYS.profiles);
      profiles.push({
        id: user.id,
        display_name: displayName || email.split('@')[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
        preferred_send_hour: 8,  // 0-23, local TZ. Default: 8 AM.
        reminder_days_before: [7, 3],
        default_gift_categories: ['gift_card'],
        monthly_digest_enabled: true,
        email_reminders_enabled: true,
        gift_suggestions_enabled: true,
        product_updates_enabled: true,
        partner_offers_enabled: true,
        email_pause_until: null,
        created_at: now(),
        updated_at: now(),
      });
      set(KEYS.profiles, profiles);
      set(KEYS.currentUser, user);
      return { user };
    },

    signIn(email, password) {
      const users = get(KEYS.users);
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) return { error: 'Invalid email or password.' };
      set(KEYS.currentUser, user);
      return { user };
    },

    signOut() {
      localStorage.removeItem(KEYS.currentUser);
    },

    currentUser() {
      return getObj(KEYS.currentUser);
    },

    isAuthenticated() {
      return !!getObj(KEYS.currentUser);
    },
  };

  // ── Profile ─────────────────────────────────────────────────────────────────
  const profile = {
    get(userId) {
      return get(KEYS.profiles).find(p => p.id === userId) || null;
    },
    update(userId, data) {
      const profiles = get(KEYS.profiles);
      const idx = profiles.findIndex(p => p.id === userId);
      if (idx === -1) return { error: 'Profile not found.' };
      profiles[idx] = { ...profiles[idx], ...data, updated_at: now() };
      set(KEYS.profiles, profiles);
      return { profile: profiles[idx] };
    },
  };

  // ── Contacts ─────────────────────────────────────────────────────────────────
  //
  // Soft-delete: trashing a contact sets `deleted_at` timestamp instead of
  // removing the row. Trashed contacts are hidden from list() and all
  // reminder logic. After 7 days they can be purged, or a user can restore
  // or permanently delete them from the recycling bin in Settings.
  //
  // In production: same pattern — a `deleted_at` nullable TIMESTAMPTZ column
  // on the contacts table, with RLS filtering trashed rows from normal queries.
  //
  const TRASH_HOLD_DAYS = 7;

  const contacts = {
    /** List active (non-trashed) contacts for a user. */
    list(userId) {
      return get(KEYS.contacts).filter(c => c.user_id === userId && !c.deleted_at);
    },
    /** Get a single contact by ID (active only). */
    get(id) {
      const c = get(KEYS.contacts).find(c => c.id === id) || null;
      return (c && !c.deleted_at) ? c : null;
    },
    create(userId, data) {
      const all = get(KEYS.contacts);
      const contact = {
        id: uuid(),
        user_id: userId,
        first_name: data.first_name,
        last_name: data.last_name || '',
        relationship: data.relationship || 'friend',
        gift_categories: Array.isArray(data.gift_categories) ? data.gift_categories : [],
        gift_other: data.gift_other || '',
        high_importance: !!data.high_importance,
        budget_tier: data.budget_tier || null,  // null = any budget
        notes: data.notes || '',
        deleted_at: null,
        created_at: now(),
      };
      all.push(contact);
      set(KEYS.contacts, all);
      return { contact };
    },
    update(id, data) {
      const all = get(KEYS.contacts);
      const idx = all.findIndex(c => c.id === id);
      if (idx === -1) return { error: 'Contact not found.' };
      all[idx] = { ...all[idx], ...data };
      set(KEYS.contacts, all);
      return { contact: all[idx] };
    },

    // ── Soft delete (recycling bin) ──────────────────────────
    /** Move a contact to the recycling bin. */
    trash(id) {
      const all = get(KEYS.contacts);
      const idx = all.findIndex(c => c.id === id);
      if (idx === -1) return { error: 'Contact not found.' };
      all[idx].deleted_at = now();
      set(KEYS.contacts, all);
      return { contact: all[idx] };
    },

    /** Restore a trashed contact. */
    restore(id) {
      const all = get(KEYS.contacts);
      const idx = all.findIndex(c => c.id === id);
      if (idx === -1) return { error: 'Contact not found.' };
      all[idx].deleted_at = null;
      set(KEYS.contacts, all);
      return { contact: all[idx] };
    },

    /** List trashed contacts for a user, with days remaining before auto-purge. */
    listTrashed(userId) {
      const now_ = new Date();
      return get(KEYS.contacts)
        .filter(c => c.user_id === userId && c.deleted_at)
        .map(c => {
          const deletedAt = new Date(c.deleted_at);
          const expiresAt = new Date(deletedAt.getTime() + TRASH_HOLD_DAYS * 24 * 60 * 60 * 1000);
          const daysLeft = Math.max(0, Math.ceil((expiresAt - now_) / (1000 * 60 * 60 * 24)));
          return { ...c, days_left: daysLeft, expires_at: expiresAt.toISOString() };
        })
        .sort((a, b) => a.days_left - b.days_left);
    },

    /** Permanently delete a contact and all associated data. */
    permanentDelete(id) {
      const all = get(KEYS.contacts).filter(c => c.id !== id);
      set(KEYS.contacts, all);
      // cascade delete events
      const evts = get(KEYS.events).filter(e => e.contact_id !== id);
      set(KEYS.events, evts);
      // cascade delete shown-gift history
      const gifts = get(KEYS.shownGifts).filter(r => r.contact_id !== id);
      set(KEYS.shownGifts, gifts);
      return { success: true };
    },

    /** Purge all trashed contacts past the 7-day hold. Called on app load. */
    purgeExpired(userId) {
      const trashed = contacts.listTrashed(userId);
      let purged = 0;
      for (const c of trashed) {
        if (c.days_left === 0) {
          contacts.permanentDelete(c.id);
          purged++;
        }
      }
      return { purged };
    },

    // Legacy alias — kept so existing callers don't break, but now maps to trash.
    delete(id) {
      return contacts.trash(id);
    },
  };

  // ── Events ───────────────────────────────────────────────────────────────────
  const events = {
    list(userId) {
      return get(KEYS.events).filter(e => e.user_id === userId);
    },
    listForContact(contactId) {
      return get(KEYS.events).filter(e => e.contact_id === contactId);
    },
    get(id) {
      return get(KEYS.events).find(e => e.id === id) || null;
    },
    create(userId, contactId, data) {
      const all = get(KEYS.events);
      const event = {
        id: uuid(),
        contact_id: contactId,
        user_id: userId,
        event_type: data.event_type || 'birthday',
        event_label: data.event_label || '',
        month: parseInt(data.month),
        day: parseInt(data.day),
        year_started: data.year_started ? parseInt(data.year_started) : null,
        one_time: !!data.one_time,   // true = don't repeat (e.g. graduation)
        event_year: data.event_year ? parseInt(data.event_year) : null,  // the specific year for one-time events
        high_importance: !!data.high_importance,  // extra early reminder for this event
        suppress_gifts: !!data.suppress_gifts,   // skip gift suggestions for this event
        created_at: now(),
      };
      all.push(event);
      set(KEYS.events, all);
      return { event };
    },
    update(id, data) {
      const all = get(KEYS.events);
      const idx = all.findIndex(e => e.id === id);
      if (idx === -1) return { error: 'Event not found.' };
      all[idx] = { ...all[idx], ...data };
      set(KEYS.events, all);
      return { event: all[idx] };
    },
    delete(id) {
      const all = get(KEYS.events).filter(e => e.id !== id);
      set(KEYS.events, all);
      return { success: true };
    },
  };

  // ── Reminder helpers ──────────────────────────────────────────────────────────
  const reminders = {
    /** Returns upcoming events within `days` days for a user, sorted by proximity */
    upcoming(userId, days = 60) {
      const today = new Date();
      const evtList = events.list(userId);
      const contactList = contacts.list(userId);

      return evtList
        .map(evt => {
          const contact = contactList.find(c => c.id === evt.contact_id);
          if (!contact) return null;

          const thisYear = today.getFullYear();

          // One-time events: only show if the specific year hasn't passed
          if (evt.one_time) {
            const eventYear = evt.event_year || thisYear;
            const next = new Date(eventYear, evt.month - 1, evt.day);
            if (next < today) return null; // already happened, don't repeat
            const daysUntil = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
            if (daysUntil > days) return null;
            return { event: evt, contact, next_date: next.toISOString().split('T')[0], days_until: daysUntil };
          }

          // Repeating events: find the next annual occurrence
          let next = new Date(thisYear, evt.month - 1, evt.day);
          if (next < today) next = new Date(thisYear + 1, evt.month - 1, evt.day);

          const daysUntil = Math.ceil((next - today) / (1000 * 60 * 60 * 24));

          if (daysUntil > days) return null;

          return {
            event: evt,
            contact,
            next_date: next.toISOString().split('T')[0],
            days_until: daysUntil,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.days_until - b.days_until);
    },
  };

  // ── Seed demo data ────────────────────────────────────────────────────────────
  const seed = {
    run() {
      // Only seed if no users exist
      if (get(KEYS.users).length > 0) return;

      const result = auth.signUp('demo@landmarks.app', 'demo1234', 'Alex Chen');
      if (result.error) return;
      const userId = result.user.id;

      // Sign back out after seeding so user has to log in
      auth.signOut();

      // Demo contacts
      const demoContacts = [
        { first_name: 'Sarah', last_name: 'Chen', relationship: 'family', gift_categories: ['flowers', 'treats'], high_importance: true, notes: 'Loves tulips and lavender' },
        { first_name: 'Marcus', last_name: 'Webb', relationship: 'friend', gift_categories: ['wine', 'experiences'], high_importance: false, notes: 'Prefers red wine, big Cab Sauv fan' },
        { first_name: 'Priya', last_name: 'Sharma', relationship: 'colleague', gift_categories: ['experiences'], high_importance: false, notes: '' },
        { first_name: 'James', last_name: 'O\'Brien', relationship: 'friend', gift_categories: ['gift_card'], high_importance: false, notes: 'Hard to shop for, gift cards always work' },
        { first_name: 'Lily', last_name: 'Park', relationship: 'family', gift_categories: ['treats'], gift_other: 'Board games, puzzles', high_importance: true, notes: 'Loves chocolate, allergic to nuts' },
      ];

      const createdContacts = demoContacts.map(c => contacts.create(userId, c).contact);

      // Today's date for realistic upcoming events
      const today = new Date();
      const m = today.getMonth() + 1;
      const d = today.getDate();

      // Helper to get a date N days from now
      const addDays = (n) => {
        const dt = new Date(today);
        dt.setDate(dt.getDate() + n);
        return { month: dt.getMonth() + 1, day: dt.getDate() };
      };

      // Seed events spread around the near future
      const demoEvents = [
        { contactIdx: 0, type: 'birthday', offset: 5 },    // Sarah's bday in 5 days
        { contactIdx: 1, type: 'birthday', offset: 12 },   // Marcus in 12 days
        { contactIdx: 2, type: 'anniversary', offset: 3 }, // Priya anniversary in 3 days
        { contactIdx: 3, type: 'birthday', offset: 28 },   // James in 28 days
        { contactIdx: 4, type: 'birthday', offset: 45 },   // Lily in 45 days
        { contactIdx: 1, type: 'anniversary', offset: 60 },
      ];

      demoEvents.forEach(({ contactIdx, type, offset }) => {
        const date = addDays(offset);
        events.create(userId, createdContacts[contactIdx].id, {
          event_type: type,
          month: date.month,
          day: date.day,
          year_started: type === 'anniversary' ? 2021 : null,
        });
      });

      // Seed shown-gift history for last year's events (Sarah and Marcus)
      const lastYear = today.getFullYear() - 1;
      const sarahDate = addDays(5);  // Sarah's event offset
      const marcusDate = addDays(12); // Marcus's event offset
      giftHistory.log(userId, createdContacts[0].id, '', sarahDate.month, sarahDate.day, lastYear, [
        { name: 'a tulip bouquet', category: 'flowers', partner: 'Bouqs' },
        { name: 'an artisan chocolate box', category: 'treats', partner: 'Vosges' },
        { name: 'a spa experience', category: 'experiences', partner: 'Uncommon Goods' },
      ]);
      giftHistory.log(userId, createdContacts[1].id, '', marcusDate.month, marcusDate.day, lastYear, [
        { name: 'a reserve cabernet', category: 'wine', partner: 'Wine.com' },
        { name: 'Broadway tickets', category: 'experiences', partner: 'TodayTix' },
        { name: 'a curated wine trio', category: 'wine', partner: 'Winc' },
      ]);
    },
  };

  // ── Utils ────────────────────────────────────────────────────────────────────
  const utils = {
    formatDate(month, day) {
      const d = new Date(2024, month - 1, day);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    },
    monthName(month) {
      return new Date(2024, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
    },
    relationshipLabel(rel) {
      return { family: 'Family', friend: 'Friend', colleague: 'Colleague', other: 'Other' }[rel] || rel;
    },
    giftLabelSingle(cat) {
      return {
        flowers: 'Flowers',
        wine: 'Wine',
        treats: 'Treats',
        gift_card: 'Gift Card',
        experiences: 'Experience',
        donation: 'Donation',
      }[cat] || cat;
    },
    /** Accepts a single string, an array, or a contact object with gift_categories */
    giftLabel(catOrArr, other) {
      if (!catOrArr) return 'Not set';
      const arr = Array.isArray(catOrArr) ? catOrArr : [catOrArr];
      const labels = arr.map(c => utils.giftLabelSingle(c));
      if (other) labels.push(other);
      return labels.length === 0 ? 'Not set' : labels.join(', ');
    },
    /** Convenience: pass a contact and optional profile, get a display string */
    giftLabelsForContact(contact, profile) {
      const cats = contact?.gift_categories || [];
      const defaults = profile?.default_gift_categories || [];
      const useCats = cats.length > 0 ? cats : defaults;
      const otherText = contact?.gift_other || '';
      return utils.giftLabel(useCats, otherText);
    },
    eventTypeLabel(type) {
      return { birthday: 'Birthday', anniversary: 'Anniversary', custom: 'Custom Event' }[type] || type;
    },
    budgetLabel(tier) {
      return { low: 'Under $30', mid: '$30–75', high: '$75+' }[tier] || null;
    },
    budgetEmoji(tier) {
      return { low: '$', mid: '$$', high: '$$$' }[tier] || null;
    },
    /**
     * Reminder schedule using the user's saved preference (from Settings),
     * with an extra 21-day lead added for high-importance events.
     * Falls back to [7, 3] if no profile preference is stored.
     *
     * @param {object} event   – event object
     * @param {object} contact – contact object
     * @param {object} [prof]  – profile object (optional; avoids extra lookup if caller already has it)
     */
    reminderDaysForEvent(event, contact, prof) {
      const baseDays = (prof?.reminder_days_before?.length > 0)
        ? [...prof.reminder_days_before]
        : [7, 3];
      const important = event?.high_importance || contact?.high_importance;
      if (important && !baseDays.includes(21)) baseDays.push(21);
      return baseDays.sort((a, b) => b - a);
    },
    daysUntilLabel(days) {
      if (days === 0) return 'Today!';
      if (days === 1) return 'Tomorrow';
      return `In ${days} days`;
    },
    urgencyClass(days) {
      if (days <= 3) return 'urgent';
      if (days <= 7) return 'soon';
      return 'upcoming';
    },
  };

  // ── Timezone-aware reminder scheduling ────────────────────────────────────
  const scheduler = {
    /**
     * Returns the scheduled send time for a single reminder in the user's local TZ.
     * In production this drives the Vercel Cron job; here it's used by the dashboard
     * and admin panel to show when emails *would* fire.
     *
     * @param {string} userId
     * @param {object} event     – event object (month, day, one_time, event_year)
     * @param {number} daysBefore – how many days before the event to send
     * @returns {object|null}     – null if send date is in the past
     */
    getScheduledSendTime(userId, event, daysBefore) {
      const prof = profile.get(userId);
      const tz = prof?.timezone || 'America/New_York';
      const sendHour = prof?.preferred_send_hour ?? 8; // 0-23, default 8 AM

      // Resolve next occurrence of the event
      const today = new Date();
      const thisYear = today.getFullYear();
      let eventDate;
      if (event.one_time) {
        eventDate = new Date(event.event_year || thisYear, event.month - 1, event.day);
        if (eventDate < today) return null;
      } else {
        eventDate = new Date(thisYear, event.month - 1, event.day);
        if (eventDate < today) eventDate = new Date(thisYear + 1, event.month - 1, event.day);
      }

      // Send date = event date minus N days
      const sendDate = new Date(eventDate);
      sendDate.setDate(sendDate.getDate() - daysBefore);

      // Skip if send date is already past
      if (sendDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return null;

      // Format the send time in user's local timezone
      const dateOpts = { weekday: 'short', month: 'short', day: 'numeric', timeZone: tz };
      const tzLabel = tz.split('/').pop().replace(/_/g, ' ');
      const hour12 = sendHour === 0 ? '12:00 AM' : sendHour < 12 ? `${sendHour}:00 AM` : sendHour === 12 ? '12:00 PM' : `${sendHour - 12}:00 PM`;

      return {
        eventDate: eventDate.toISOString().split('T')[0],
        sendDate: sendDate.toISOString().split('T')[0],
        sendHour,
        timezone: tz,
        tzLabel,
        sendTimeFormatted: `${sendDate.toLocaleDateString('en-US', dateOpts)} at ${hour12} ${tzLabel}`,
      };
    },

    /**
     * Full reminder schedule for a user: every upcoming event × every reminder cadence.
     * Sorted by send date (soonest first). Used by the admin dashboard.
     */
    getFullSchedule(userId, days = 90) {
      const prof = profile.get(userId);
      const upcoming = reminders.upcoming(userId, days);
      const schedule = [];

      for (const item of upcoming) {
        const reminderDays = utils.reminderDaysForEvent(item.event, item.contact, prof);
        for (const db of reminderDays) {
          const sendInfo = scheduler.getScheduledSendTime(userId, item.event, db);
          if (!sendInfo) continue;
          schedule.push({ ...item, days_before: db, ...sendInfo });
        }
      }

      schedule.sort((a, b) => a.sendDate.localeCompare(b.sendDate));
      return schedule;
    },
  };

  // ── Conversion tracking (admin dashboard) ─────────────────────────────────
  //
  // In production: rows in a `conversion_events` Postgres table populated by
  // Resend webhooks (open/click) and affiliate postback endpoints (purchase).
  // Here: localStorage with seeded demo data so the admin dashboard has
  // something to show.
  //
  const conversion = {
    KEY: KEYS.conversion,

    getAll() {
      return get(KEYS.conversion);
    },

    /** Aggregate funnel metrics for the admin dashboard. */
    getFunnelMetrics(daysBack = 30) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysBack);
      const all = get(KEYS.conversion).filter(e => new Date(e.timestamp) >= cutoff);

      const sent     = all.filter(e => e.type === 'sent').length;
      const opened   = all.filter(e => e.type === 'opened').length;
      const clicked  = all.filter(e => e.type === 'clicked').length;
      const purchased = all.filter(e => e.type === 'purchased').length;

      const revenue  = all.filter(e => e.type === 'purchased')
                          .reduce((sum, e) => sum + (e.commission || 0), 0);

      return { sent, opened, clicked, purchased, revenue };
    },

    /** Breakdown by a given key (partner, gift_category, reminder_lead). */
    getBreakdown(groupKey, daysBack = 30) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysBack);
      const all = get(KEYS.conversion).filter(e => new Date(e.timestamp) >= cutoff);

      const groups = {};
      for (const evt of all) {
        const key = evt[groupKey] || 'unknown';
        if (!groups[key]) groups[key] = { sent: 0, opened: 0, clicked: 0, purchased: 0, revenue: 0 };
        groups[key][evt.type] = (groups[key][evt.type] || 0) + 1;
        if (evt.type === 'purchased') groups[key].revenue += (evt.commission || 0);
      }
      return groups;
    },

    /** Daily time-series for a given event type over the last N days. */
    getTimeSeries(daysBack = 30) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysBack);
      const all = get(KEYS.conversion).filter(e => new Date(e.timestamp) >= cutoff);

      const series = {};
      for (let i = daysBack; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        series[key] = { sent: 0, opened: 0, clicked: 0, purchased: 0 };
      }
      for (const evt of all) {
        const day = evt.timestamp.split('T')[0];
        if (series[day]) series[day][evt.type] = (series[day][evt.type] || 0) + 1;
      }
      return Object.entries(series).map(([date, counts]) => ({ date, ...counts }));
    },

    /** Seed realistic demo data for the admin dashboard preview. */
    seedDemo() {
      if (get(KEYS.conversion).length > 0) return; // already seeded

      const partners  = ['Bouqs', '1-800-Flowers', 'Wine.com', 'Amazon', 'Sugarfina', 'TodayTix', 'Nordstrom', 'Starbucks'];
      const categories = ['flowers', 'wine', 'treats', 'gift_card', 'experiences'];
      const leads     = [3, 7, 21];
      const commissions = { flowers: 9.50, wine: 7.20, treats: 6.80, gift_card: 4.00, experiences: 11.00 };

      const events = [];

      for (let i = 59; i >= 0; i--) {
        const day = new Date();
        day.setDate(day.getDate() - i);
        const dayStr = day.toISOString();

        // 8–15 sends per day
        const sendCount = 8 + Math.floor(Math.random() * 8);
        for (let s = 0; s < sendCount; s++) {
          const cat = categories[Math.floor(Math.random() * categories.length)];
          const partner = partners[Math.floor(Math.random() * partners.length)];
          const lead = leads[Math.floor(Math.random() * leads.length)];
          const reminderIdRef = uuid();

          events.push({ id: uuid(), timestamp: dayStr, type: 'sent', partner, gift_category: cat, reminder_lead: lead, reminder_id: reminderIdRef });

          // 55–70% open rate
          if (Math.random() < 0.55 + Math.random() * 0.15) {
            events.push({ id: uuid(), timestamp: dayStr, type: 'opened', partner, gift_category: cat, reminder_lead: lead, reminder_id: reminderIdRef });

            // 35–50% of opens → click
            if (Math.random() < 0.35 + Math.random() * 0.15) {
              events.push({ id: uuid(), timestamp: dayStr, type: 'clicked', partner, gift_category: cat, reminder_lead: lead, reminder_id: reminderIdRef });

              // 25–40% of clicks → purchase (= ~8-12% overall click-to-purchase)
              if (Math.random() < 0.25 + Math.random() * 0.15) {
                const commission = commissions[cat] * (0.8 + Math.random() * 0.4);
                events.push({ id: uuid(), timestamp: dayStr, type: 'purchased', partner, gift_category: cat, reminder_lead: lead, reminder_id: reminderIdRef, commission: Math.round(commission * 100) / 100 });
              }
            }
          }
        }
      }

      set(KEYS.conversion, events);
    },
  };

  // ── Admin gift overrides ───────────────────────────────────────────────────
  // Stores admin-chosen gift replacements for specific upcoming emails.
  // Key format: `${userId}::${eventId}::${daysBefore}`
  // Value: array of gift objects that replace the auto-selected ones.
  const OVERRIDE_KEY = 'lm_admin_gift_overrides';

  const adminQueue = {
    /**
     * Returns every pending reminder email across ALL users for the next N days.
     * Each item includes user, profile, contact, event, send info, and gift data.
     * Sorted by sendDate ascending.
     */
    getPendingEmails(days = 7) {
      const allUsers = get(KEYS.users);
      const pending = [];

      for (const user of allUsers) {
        const prof = profile.get(user.id);
        const schedule = scheduler.getFullSchedule(user.id, days + 30);

        // Filter to emails whose send date is within the next N days
        const today = new Date();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + days);
        const todayStr = today.toISOString().split('T')[0];
        const cutoffStr = cutoff.toISOString().split('T')[0];

        for (const item of schedule) {
          if (item.sendDate >= todayStr && item.sendDate <= cutoffStr) {
            const overrideKey = `${user.id}::${item.event.id}::${item.days_before}`;
            const override = adminQueue.getOverride(overrideKey);
            pending.push({
              ...item,
              user,
              profile: prof,
              overrideKey,
              hasOverride: !!override,
              overriddenGifts: override,
            });
          }
        }
      }

      pending.sort((a, b) => a.sendDate.localeCompare(b.sendDate));
      return pending;
    },

    /** Get all overrides */
    getAllOverrides() {
      try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY)) || {}; } catch { return {}; }
    },

    /** Get override for a specific email */
    getOverride(key) {
      const all = adminQueue.getAllOverrides();
      return all[key] || null;
    },

    /** Set override for a specific email */
    setOverride(key, gifts) {
      const all = adminQueue.getAllOverrides();
      all[key] = gifts;
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(all));
    },

    /** Remove override for a specific email */
    removeOverride(key) {
      const all = adminQueue.getAllOverrides();
      delete all[key];
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(all));
    },
  };

  // ── Admin auth ──────────────────────────────────────────────────────────────
  // Separate from user auth. In production: role flag on the user row + RLS.
  // Here: a simple hardcoded credential check that returns a session token.
  const ADMIN_EMAIL = 'admin@landmarks.app';
  const ADMIN_PASS  = 'LM-admin-2026!';
  const ADMIN_KEY   = 'lm_admin_session';

  const admin = {
    signIn(email, password) {
      if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
        const session = { email, authenticated: true, ts: now() };
        localStorage.setItem(ADMIN_KEY, JSON.stringify(session));
        return { session };
      }
      return { error: 'Invalid admin credentials.' };
    },

    signOut() {
      localStorage.removeItem(ADMIN_KEY);
    },

    isAuthenticated() {
      try {
        const s = JSON.parse(localStorage.getItem(ADMIN_KEY));
        return s?.authenticated === true;
      } catch (e) { return false; }
    },

    getSession() {
      try {
        return JSON.parse(localStorage.getItem(ADMIN_KEY));
      } catch (e) { return null; }
    },
  };

  // ── Calendar feed (.ics) ────────────────────────────────────────────────────
  const calendar = {
    /**
     * Generates an iCalendar (.ics) string for all of a user's events.
     * In production this would be served at a per-user URL endpoint.
     * Here it generates the text for download or data-URL subscription.
     */
    generateICS(userId) {
      const userEvents = events.list(userId);
      const contactList = contacts.list(userId);

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Landmarks//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Landmarks Dates',
        'X-WR-CALDESC:Birthdays and important dates from Landmarks',
      ];

      for (const evt of userEvents) {
        const contact = contactList.find(c => c.id === evt.contact_id);
        if (!contact) continue;

        const name = contact.first_name + (contact.last_name ? ' ' + contact.last_name : '');
        const typeLabel = utils.eventTypeLabel(evt.event_type);
        const label = evt.event_type === 'custom' && evt.event_label ? evt.event_label : typeLabel;
        const summary = `${name} — ${label}`;

        // Format month/day as MMDD
        const mm = String(evt.month).padStart(2, '0');
        const dd = String(evt.day).padStart(2, '0');

        if (evt.one_time && evt.event_year) {
          // One-time event: single occurrence
          const yyyy = String(evt.event_year);
          lines.push('BEGIN:VEVENT');
          lines.push(`DTSTART;VALUE=DATE:${yyyy}${mm}${dd}`);
          lines.push(`DTEND;VALUE=DATE:${yyyy}${mm}${dd}`);
          lines.push(`SUMMARY:${summary}`);
          lines.push(`UID:${evt.id}@landmarks.app`);
          lines.push('END:VEVENT');
        } else {
          // Recurring annual event
          lines.push('BEGIN:VEVENT');
          lines.push(`DTSTART;VALUE=DATE:${new Date().getFullYear()}${mm}${dd}`);
          lines.push(`DTEND;VALUE=DATE:${new Date().getFullYear()}${mm}${dd}`);
          lines.push(`RRULE:FREQ=YEARLY`);
          lines.push(`SUMMARY:${summary}`);
          lines.push(`UID:${evt.id}@landmarks.app`);
          lines.push('END:VEVENT');
        }
      }

      lines.push('END:VCALENDAR');
      return lines.join('\r\n');
    },
  };

  // ── Re-engagement drip ───────────────────────────────────────────────────
  //
  // In production: a Vercel Cron job checks user activation state and queues
  // emails via Resend at D+3, D+10, D+30 after signup for users with zero
  // contacts. Here: localStorage-based simulation for the email-preview tool.
  //
  const REENGAGEMENT_KEY = 'lm_reengagement_log';

  const reengagement = {
    /** Drip schedule: days after signup → email template key */
    DRIP_SCHEDULE: [
      { day: 3,  key: 'import_nudge',     label: 'D+3 — Contact Import Nudge' },
      { day: 10, key: 'sample_reminder',   label: 'D+10 — Sample Reminder Preview' },
      { day: 30, key: 'concierge_add',     label: 'D+30 — Reply-to-Add Concierge' },
    ],

    /** Get the log of which drip emails have been "sent" for a user. */
    getLog(userId) {
      try {
        const all = JSON.parse(localStorage.getItem(REENGAGEMENT_KEY)) || {};
        return all[userId] || {};
      } catch { return {}; }
    },

    /** Mark a drip email as sent for a user. */
    markSent(userId, dripKey) {
      try {
        const all = JSON.parse(localStorage.getItem(REENGAGEMENT_KEY)) || {};
        if (!all[userId]) all[userId] = {};
        all[userId][dripKey] = now();
        localStorage.setItem(REENGAGEMENT_KEY, JSON.stringify(all));
      } catch { /* silent */ }
    },

    /**
     * Compute activation state for a user.
     * Returns { daysSinceSignup, contactCount, isLapsed, dueDrip }.
     * `dueDrip` is the next unsent drip that's past its trigger day, or null.
     */
    getActivationState(userId) {
      const prof = profile.get(userId);
      const user = get(KEYS.users).find(u => u.id === userId);
      if (!user || !prof) return null;

      const created = new Date(user.created_at || prof.created_at);
      const daysSinceSignup = Math.floor((new Date() - created) / (1000 * 60 * 60 * 24));
      const contactCount = contacts.list(userId).length;
      const isLapsed = contactCount === 0 && daysSinceSignup >= 3;

      const log = reengagement.getLog(userId);
      let dueDrip = null;
      for (const drip of reengagement.DRIP_SCHEDULE) {
        if (daysSinceSignup >= drip.day && !log[drip.key]) {
          dueDrip = drip;
          break;
        }
      }

      return { daysSinceSignup, contactCount, isLapsed, dueDrip, log };
    },

    /**
     * Get all three drip email templates with personalized content.
     * Used by email-preview.html to render the re-engagement tab.
     */
    getEmailTemplates(userId) {
      const prof = profile.get(userId);
      const user = get(KEYS.users).find(u => u.id === userId);
      const firstName = prof?.display_name?.split(' ')[0] || 'there';

      return [
        {
          key: 'import_nudge',
          label: 'D+3 — Contact Import Nudge',
          day: 3,
          subject: `${firstName}, add your first birthday in 60 seconds`,
          headline: 'Never miss a birthday again',
          body: `Hi ${firstName},\n\nYou signed up for Landmarks a few days ago — great call. But right now your account is empty, which means we can't help you yet.\n\nAdding your first contact takes about 60 seconds: a name, a date, and optionally a note about what they like. That's it.\n\nOnce you do, we'll send you a reminder before their next birthday with a handful of curated gift ideas you can order in one click. No more last-minute gas station flowers.`,
          ctaText: 'Add your first contact →',
          ctaUrl: 'contacts.html',
        },
        {
          key: 'sample_reminder',
          label: 'D+10 — Sample Reminder Preview',
          day: 10,
          subject: `Here's what a Landmarks reminder actually looks like`,
          headline: 'This is what you\'ll get',
          body: `Hi ${firstName},\n\nWe noticed you haven't added anyone to Landmarks yet. Fair enough — maybe you weren't sure what to expect.\n\nBelow is an example of the reminder email you'd receive a week before a friend's birthday. It includes a few curated gift ideas based on what you tell us they like, with one-click ordering. No scrolling through endless product pages.\n\nThe whole point is to make you the person who always remembers — without any effort on your part.`,
          ctaText: 'Try it — add someone now →',
          ctaUrl: 'contacts.html',
          showSampleReminder: true,
        },
        {
          key: 'concierge_add',
          label: 'D+30 — Reply-to-Add Concierge',
          day: 30,
          subject: `One last thing — let us add your first contact for you`,
          headline: 'Let us set it up for you',
          body: `Hi ${firstName},\n\nWe get it — life is busy, and setting up yet another app isn't always at the top of the list.\n\nSo here's an easy way to try Landmarks out: just hit reply to this email and type a person's name, the event type (birthday, anniversary, etc.), and the date. Our team will add them to your account so you can see how it works.\n\nThis is just to help you get started — once you see your first reminder, you'll have a feel for whether Landmarks is useful for you. No pressure either way.`,
          ctaText: 'Just hit reply — we\'ll take it from here',
          ctaUrl: null, // reply action, no link
          isReplyAction: true,
        },
      ];
    },
  };

  // ── Gift History (shown suggestions) ──────────────────────────────────────
  //
  // Tracks what gift items Landmarks *showed* in reminder emails, not what
  // the user clicked or bought. Displayed as: "Last year we suggested
  // flowers, cookies, and a necklace." — honest, non-invasive, privacy-safe.
  //
  // In production: a `shown_gifts` Postgres table with the same shape,
  // RLS-protected, cascade-deleted with the contact.
  //
  const giftHistory = {
    /**
     * Log the items shown in a reminder email.
     * @param {string} userId
     * @param {string} contactId
     * @param {string} eventId
     * @param {number} eventMonth
     * @param {number} eventDay
     * @param {number} year      – the year this reminder was for
     * @param {Array}  items     – array of { name, category, partner }
     */
    log(userId, contactId, eventId, eventMonth, eventDay, year, items) {
      const all = get(KEYS.shownGifts);
      all.push({
        id: uuid(),
        user_id: userId,
        contact_id: contactId,
        event_id: eventId,
        event_month: eventMonth,
        event_day: eventDay,
        year,
        items: items.map(i => ({ name: i.name, category: i.category || null, partner: i.partner || null })),
        created_at: now(),
      });
      set(KEYS.shownGifts, all);
    },

    /**
     * Get all shown-gift records for a contact, sorted newest first.
     */
    getForContact(contactId) {
      return get(KEYS.shownGifts)
        .filter(r => r.contact_id === contactId)
        .sort((a, b) => (b.year || 0) - (a.year || 0));
    },

    /**
     * Get the shown-gift record for a specific contact + event + year.
     * Returns null if none found.
     */
    getForEvent(contactId, eventMonth, eventDay, year) {
      return get(KEYS.shownGifts).find(r =>
        r.contact_id === contactId &&
        r.event_month === eventMonth &&
        r.event_day === eventDay &&
        r.year === year
      ) || null;
    },

    /**
     * Build the "Last year we suggested..." sentence for a contact + event.
     * Returns null if no history exists.
     */
    getLastYearSummary(contactId, eventMonth, eventDay) {
      const lastYear = new Date().getFullYear() - 1;
      const record = giftHistory.getForEvent(contactId, eventMonth, eventDay, lastYear);
      if (!record || !record.items || record.items.length === 0) return null;

      const names = record.items.map(i => i.name);
      if (names.length === 1) return `Last year we suggested ${names[0]}.`;
      if (names.length === 2) return `Last year we suggested ${names[0]} and ${names[1]}.`;
      return `Last year we suggested ${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}.`;
    },

    /** Delete all shown-gift records for a contact (called on contact delete). */
    deleteForContact(contactId) {
      const filtered = get(KEYS.shownGifts).filter(r => r.contact_id !== contactId);
      set(KEYS.shownGifts, filtered);
    },
  };

  return { auth, profile, contacts, events, reminders, scheduler, conversion, admin, adminQueue, seed, utils, calendar, reengagement, giftHistory, KEYS };
})();
