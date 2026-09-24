# Atom — go-live checklist

Atom (student planner) lives at **atom.docupeer.org** (also `docupeer.org/atom`) on
the existing DocuPeer stack and reuses DocuPeer login. This branch is merged to
`main`, so pushing it triggers a normal Vercel production deploy.

Most setup is automated in code. What's left is adding secrets to Vercel and
GitHub — the same way DocuPeer's existing secrets (DATABASE_URL, AUTH_SECRET,
GROQ_ATOM_API_KEY) are already managed. **Secrets are never committed to git.**

## Automated already (no action needed)

- **Database migration** — `prisma/migrations/20260924170000_atom_student_planner`
  creates all `Atom*` tables and the optional `User.atom*` columns. The build
  command now runs `prisma migrate deploy`, so the migration applies to the
  production database automatically on the next deploy. It is additive only — no
  existing table is touched. If it ever fails, the build fails and production
  stays on the current version (safe), rather than deploying a half-migrated app.
- **Reminder cron** — `.github/workflows/atom-reminders.yml` pings the sweep every
  15 minutes via GitHub Actions (works on any Vercel plan). `vercel.json` also
  defines an hourly Vercel cron for Pro plans; both are safe together (the
  endpoint deduplicates).

## What you need to do (secrets only)

### 1. Vercel → Project → Settings → Environment Variables (Production)

Add these (values are in the chat message, not in this file):

- `ATOM_VAPID_PUBLIC_KEY`
- `ATOM_VAPID_PRIVATE_KEY`
- `ATOM_VAPID_SUBJECT` = `mailto:you@docupeer.org`
- `RESEND_API_KEY` = the "atom-docupeer-email" key
- `ATOM_EMAIL_FROM` = `Atom by DocuPeer <atom@docupeer.org>`
- `CRON_SECRET` = (random string, in chat)
- `ATOM_PUBLIC_URL` = `https://atom.docupeer.org`

`GROQ_ATOM_API_KEY`, `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET` are already set.

### 2. GitHub → repo → Settings → Secrets and variables → Actions

Add one repository secret:

- `CRON_SECRET` = the **same** value you used in Vercel.

That's what lets the GitHub Actions reminder job authenticate to the endpoint.

### 3. Resend → verify your sending domain

The Resend key is set. To send from `atom@docupeer.org`, verify the `docupeer.org`
domain in Resend (Domains → Add). Until then, either set
`ATOM_EMAIL_FROM="Atom <onboarding@resend.dev>"` (Resend's shared test sender,
which can only email your own account) or verify the domain. Web Push works with
no domain setup.

### 4. Confirm the `atom.docupeer.org` subdomain

It must be attached to this Vercel project (like `status.docupeer.org`). If it
already resolves, you're done. `docupeer.org/atom` works regardless.

## Notifications reference

- **Web Push:** Chrome/Edge/Firefox everywhere; iOS/iPadOS only when the app is
  added to the Home Screen (it's a PWA). Students enable it in Settings, with a
  test button.
- **Email:** off by default per student; toggled in Settings.
- Reminder offsets are per-student, per-type (7d/3d/1d/1h/mute), and every send is
  deduplicated, so overlapping cron runs never double-notify.

## Rollback

- Undo the auto-migration-on-deploy: revert the `build` line in `package.json` to
  `prisma generate && next build`.
- Disable the GitHub cron: disable the "Atom reminders" workflow in the Actions tab.
- The migration is additive; to remove Atom entirely you'd drop the `Atom*` tables
  and `User.atom*` columns.

## Per-student data & privacy

Every row is scoped by `userId`; every API route requires the session and filters
by it. Settings → Danger zone lets a student export all their data as JSON or reset
it, both gated by typing their name (reset is enforced server-side too).
Atom also follows `status.docupeer.org` maintenance mode.
