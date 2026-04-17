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
  const contacts = {
    list(userId) {
      return get(KEYS.contacts).filter(c => c.user_id === userId);
    },
    get(id) {
      return get(KEYS.contacts).find(c => c.id === id) || null;
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
    delete(id) {
      const all = get(KEYS.contacts).filter(c => c.id !== id);
      set(KEYS.contacts, all);
      // cascade delete events
      const evts = get(KEYS.events).filter(e => e.contact_id !== id);
      set(KEYS.events, evts);
      return { success: true };
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
        flowers: '🌸 Flowers',
        wine: '🍷 Wine',
        treats: '🍫 Treats',
        gift_card: '🎁 Gift Card',
        experiences: '✨ Experience',
        donation: '❤️ Donation',
      }[cat] || cat;
    },
    /** Accepts a single string, an array, or a contact object with gift_categories */
    giftLabel(catOrArr, other) {
      if (!catOrArr) return '🎁 Not set';
      const arr = Array.isArray(catOrArr) ? catOrArr : [catOrArr];
      const labels = arr.map(c => utils.giftLabelSingle(c));
      if (other) labels.push(other);
      return labels.length === 0 ? '🎁 Not set' : labels.join(', ');
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
      return { low: '💵', mid: '💳', high: '💎' }[tier] || null;
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

  return { auth, profile, contacts, events, reminders, scheduler, conversion, admin, adminQueue, seed, utils, calendar, KEYS };
})();
