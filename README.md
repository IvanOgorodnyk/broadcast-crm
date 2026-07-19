# Broadcast CRM & Calendar

Internal CRM / calendar for managing esports & media broadcasts — events, production
shifts, and staff assignments. Built from the technical specification as a working MVP.

Stack: **Next.js 14 (App Router) · TypeScript · PostgreSQL · Prisma · Tailwind CSS**.
Auth is a lightweight JWT-cookie session (no external auth provider needed).

---

## Quick start

> Requires Node 18+ and a PostgreSQL database (local, Neon, Supabase, Railway…).

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Configure environment
cp .env.example .env
#   then edit .env and set DATABASE_URL + AUTH_SECRET (openssl rand -base64 32)

# 3. Create the schema and seed demo data
npm run db:push
npm run db:seed

# 4. Run
npm run dev
# open http://localhost:3000
```

### Demo accounts (password: `password123`)

| Email | Role | Can |
|---|---|---|
| `admin@maincast.com` | Admin / Producer | Create/edit/delete events, assign staff, manage users |
| `caster1@maincast.com` | Staff | View calendar & own assignments, edit own profile |
| `viewer@maincast.com` | Viewer | Read-only calendar |

---

## Features (MVP scope from the spec)

- **Login** — centered email/password form, show/hide password, forgot-password flow.
  Registration is admin-invite only.
- **Daily calendar** — color-coded horizontal rows with the spec columns: Discipline,
  Event, Time, Segment, Studio, Casters & Analysts, Staff, Channel, Main & Media.
  Day / Week / Month view switch, Today / prev / next, month date-picker popup.
- **Event create/edit** (admin) — full field set (title, discipline, time, segment,
  studio, setup, channel, stream links, status, color, notes, internal comment).
- **Staff assignment** — multiple people per event with roles (caster, analyst,
  director, producer, observer, replay operator, technical staff, media rep, host,
  guest); shown as avatars/initials with name+role on hover.
- **Filters** — multi-select dropdowns (discipline, studio, channel, setup, casters,
  analysts, staff, participants, media) with live updates and a Clear button.
- **Internal notifications** — generated on assign / update / time change / studio
  change / staff change / status change / delete; notification center with unread
  markers and "Mark all as read".
- **Profile** — avatar, username, name, surname; locked email/company/role/disciplines
  (admin-managed); change password; integration connections.
- **Google Calendar integration** — OAuth connect from profile; assigned events sync
  to the user's primary calendar; updates/deletes propagate. *(Enable by setting
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; no-op until configured.)*
- **Telegram bot integration** — link via one-time code / deep link; pushes assignment
  and change notifications. *(Enable by setting `TELEGRAM_BOT_TOKEN`; no-op until
  configured.)*
- **Admin panel** — invite users by email, change roles, deactivate/reactivate
  (historical assignments preserved — users are never hard-deleted).

---

## Project structure

```
prisma/
  schema.prisma      # data model (users, events, assignments, notifications, …)
  seed.ts            # demo data
src/
  middleware.ts      # route protection (JWT cookie check)
  lib/
    auth.ts          # session create/verify, password hashing
    guards.ts        # requireUser / requireAdmin for API routes
    prisma.ts        # Prisma client singleton
    events.ts        # event include, serialization, zod input schema
    notifications.ts # notification fan-out (+ Telegram push)
    labels.ts        # enum → display label/color maps
    integrations/
      google.ts      # Google Calendar OAuth + sync
      telegram.ts    # Telegram send + enable check
  app/
    login/ invite/ forgot-password/   # public auth pages
    (app)/                            # authenticated area (top nav)
      calendar/  profile/  notifications/  admin/users/
    api/
      auth/         # login, logout, accept-invite, forgot-password
      events/       # list/create + [id] get/update/delete
      meta/         # lookup data for forms & filters
      notifications/
      profile/
      admin/users/
      integrations/ # google + telegram endpoints
  components/        # TopBar, Avatar, ProfileForm, AdminUsers, NotificationsList
    calendar/        # Calendar, FilterPanel, EventRow, EventModal, DatePicker, MultiSelect
```

---

## Enabling integrations

### Google Calendar
1. Create OAuth credentials (Web app) in Google Cloud Console.
2. Add redirect URI `${APP_URL}/api/integrations/google/callback`.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
4. An **admin** clicks **Connect** on their profile. From then on every event is
   mirrored to that admin's Google Calendar with all assigned staff as
   attendees — Google emails each person an invitation the moment an admin
   assigns them (or they self-assign), and sends update/cancellation emails on
   changes. Staff don't need to connect anything to get these emails.
5. Staff can still click **Connect** themselves; that per-user sync is the
   fallback used when no admin account is connected (silent, no emails).

### Telegram
1. Create a bot via @BotFather, set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_BOT_USERNAME`.
2. Register the webhook:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/integrations/telegram/webhook`
3. Users click **Connect Telegram Bot** and send `/start <code>` to the bot.

---

## Deployment

Deploys cleanly to Vercel (or any Node host):
- Set all `.env` values as project environment variables.
- Point `DATABASE_URL` at a managed Postgres.
- Run `npm run db:push` (and optionally `db:seed`) against the production DB once.

---

## Not yet implemented (future per spec §16)

Payroll, Excel export, weekly reports, double-booking conflict detection, availability
system, shift confirmation, automatic reminders (cron), event templates, dark mode,
public schedule page, Discord/Notion/Airtable integrations.
