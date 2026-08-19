# Atom Status System Context

This folder captures how the status system in `atom-website-main` works so we can build the same capability in `DocuPeer` with less guesswork.

## Source files reviewed

- `../atom-website-main/status/index.html`
- `../atom-website-main/status-manage/index.html`
- `../atom-website-main/js/status.js`
- `../atom-website-main/js/status-manage.js`
- `../atom-website-main/js/status-gate.js`
- `../atom-website-main/css/status.css`
- `../atom-website-main/cloudflare-worker/worker.js`
- `../atom-website-main/scripts/status-public-auth.sh`

## What Atom ships

Atom has three connected pieces:

1. A public status page at `/status`
2. A protected admin page at `/status-manage`
3. A site-wide maintenance gate that can redirect the rest of the site to `/status`

## Feature inventory

- Five public status levels
  - `1`: Operational
  - `2`: Degraded Performance
  - `3`: Partial/Temporary Outage
  - `4`: Major Outage
  - `5`: Complete Server Outage
- Incident phases for non-operational states
  - `investigating`
  - `identified`
  - `monitoring`
  - `resolved`
- Optional ETA timestamp with a live countdown
- 24-hour service history rendered as 288 five-minute bars
- Public incident reports split into:
  - reports from the last 24 hours
  - older archived reports
- Admin live preview that mirrors the public page
- Admin posting flow for new status reports
- Admin toggle for maintenance mode
- Site-wide redirect when maintenance mode is on
- Session-based admin auth with both cookie and bearer-token support

## High-level architecture

- The public page fetches a full snapshot from `GET /api/status/public?full=1`
- The maintenance gate fetches a lightweight snapshot from `GET /api/status/public`
- The admin page:
  - logs in through `POST /api/status-manage/login`
  - stores a returned token in `sessionStorage`
  - sends that token in `Authorization: Bearer ...`
  - also relies on an auth cookie for server-side checks
- The backend is responsible for:
  - normalizing the current status state
  - backfilling five-minute history buckets
  - splitting reports into recent vs older
  - validating levels, phases, and ETA values

## Key behavior details

- Status level `1` suppresses incident phase and displays `Operating Normally`
- Phases only matter for status levels `2` through `5`
- Every saved status change writes into the current five-minute history bucket
- History is backfilled so the 24-hour graph always has continuous coverage
- The ETA countdown updates every second on the client
- The public snapshot refreshes every 60 seconds
- The maintenance gate caches the public check in `sessionStorage` for 30 seconds
- `/status` and `/status-manage` are exempt from maintenance redirects

## What this means for DocuPeer

We do not need to copy Atom's exact stack. `DocuPeer` already has:

- Next.js App Router
- custom cookie auth in `src/lib/auth.ts`
- Prisma models and API routes

So the right adaptation is:

- public Next routes for `/status` and `/status-manage`
- Next API routes for the status endpoints
- Prisma tables for state history and reports
- Next middleware for the maintenance redirect
- reuse the existing DocuPeer auth style instead of Atom's custom worker auth flow

See:

- `api-contract.md` for the payload shapes and route behavior
- `docupeer-blueprint.md` for the concrete implementation plan in this repo
