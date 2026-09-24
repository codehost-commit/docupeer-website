# Atom — connect & deploy checklist

Atom is the student time-management app served at **atom.docupeer.org** (also
reachable at `docupeer.org/atom`). It runs on the existing DocuPeer stack
(Next.js 14 + Prisma/Postgres + Vercel) and reuses DocuPeer login — a student
signs in with a DocuPeer account and lands in an onboarding flow.

Everything below is what you connect. Only **step 1 (database)** is required for
the app to run; steps 3–5 turn on notifications.

---

## 1. Database migration (required)

New tables were added to `prisma/schema.prisma` (all prefixed `Atom*`, plus a few
optional `atom*` columns on `User`). Nothing was changed on existing tables, so
this is additive and safe.

Create and apply the migration from a machine that can reach your database
(pull the connection string first with `vercel env pull .env` if needed):

```bash
# Preferred — creates a tracked migration and applies it:
npx prisma migrate dev --name atom_student_planner

# …or, for a quick sync without a migration file:
npx prisma db push
```

Then commit the generated `prisma/migrations/*` folder. Vercel already runs
`prisma generate` during the build (`"build": "prisma generate && next build"`),
so no build change is needed.

> Note: the Prisma engine host (`binaries.prisma.sh`) is firewalled inside the
> environment this was built in, so `prisma generate`/`migrate` could not be run
> here. They run normally on your machine and on Vercel.

## 2. Groq (already connected)

Grade import and label cleanup reuse the existing **`GROQ_ATOM_API_KEY`**
(model `openai/gpt-oss-120b`). If it's set, pasted grades / CSVs are standardized
by AI before you review them. If it's missing, a built-in basic parser is used
instead — the app still works, just without AI cleanup.

## 3. Web Push (browser / PWA notifications)

1. Generate a VAPID keypair:
   ```bash
   node -e "console.log(require('web-push').generateVAPIDKeys())"
   ```
2. Set in Vercel (and local `.env`):
   - `ATOM_VAPID_PUBLIC_KEY`
   - `ATOM_VAPID_PRIVATE_KEY`
   - `ATOM_VAPID_SUBJECT` (e.g. `mailto:you@docupeer.org`)

Students turn push on in **Settings → Notifications**, which registers the
service worker (`/atom-sw.js`) and subscribes the browser. A **Send test
notification** button is provided.

## 4. Email reminders (Resend)

1. Create an API key at https://resend.com and verify your sending domain.
2. Set:
   - `RESEND_API_KEY`
   - `ATOM_EMAIL_FROM` (e.g. `Atom by DocuPeer <atom@docupeer.org>`)

Email is off by default per student; they enable it in Settings. If the key is
missing, email is simply skipped.

## 5. Scheduled reminders (Vercel Cron)

`vercel.json` adds a cron hitting `/api/atom/cron/reminders` hourly. Set:

- `CRON_SECRET` — a random string. Vercel Cron automatically sends it as
  `Authorization: Bearer <CRON_SECRET>`; the endpoint refuses to run without it.
- `ATOM_PUBLIC_URL` — `https://atom.docupeer.org` (used in deep links).

Timing notes:
- The cron **window** (`ATOM_CRON_WINDOW_MINUTES`, default 75) should be ≥ the
  cron interval so no reminder is missed. Hourly cron → keep 75.
- **Vercel plan limits:** Hobby allows only daily crons; **Pro** allows up to
  every minute. For accurate "1 hour before" reminders you need at least hourly
  (Pro). On a coarser schedule, a 1-hour reminder may fire late — everything is
  deduplicated so it's never sent twice.
- Reminder offsets are per-student and per-type (7d / 3d / 1d / 1h / muted),
  configurable in Settings.

---

## Environment variables (summary)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | yes | Postgres (already set) |
| `AUTH_SECRET` | yes | Session JWT signing (already set) |
| `GROQ_ATOM_API_KEY` | optional | AI grade-import standardization |
| `ATOM_VAPID_PUBLIC_KEY` / `ATOM_VAPID_PRIVATE_KEY` / `ATOM_VAPID_SUBJECT` | for push | Web Push |
| `RESEND_API_KEY` / `ATOM_EMAIL_FROM` | for email | Email reminders |
| `CRON_SECRET` | for reminders | Protects the cron endpoint |
| `ATOM_PUBLIC_URL` | recommended | Notification deep links |
| `ATOM_CRON_WINDOW_MINUTES` | optional | Cron sweep window (default 75) |

## Browser notification limitations (by design)

- Web Push works on Chrome, Edge, Firefox, and — **only when installed to the
  home screen** — iOS/iPadOS Safari 16.4+. A plain iOS Safari tab cannot receive
  background push; the app is a PWA so students can "Add to Home Screen".
- Notifications fire on a schedule (the cron), not in real time — a reminder set
  for "1 hour before" arrives within the cron window of that moment.
- If a student clears site data or revokes notification permission, their push
  subscription is dropped and silently recreated next time they enable it.

## What's stored per student (multi-user isolation)

Every Atom row is scoped by `userId` and every API route requires the session and
filters by it. **Settings → Danger zone** lets a student export **all** of their
data as JSON, or reset it — both gated by typing their full name (enforced on the
server too for reset).

## The status page

Atom follows `status.docupeer.org`: when maintenance mode is on, the Atom app
redirects to the status page just like the main site (wired in `middleware.ts`).
