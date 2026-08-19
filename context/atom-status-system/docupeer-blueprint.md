# DocuPeer Status Blueprint

This is the concrete plan for implementing an Atom-like status system in `DocuPeer`.

## Recommended feature parity target

Ship all of these in the first version:

- public `/status` page
- protected `/status-manage` page
- five status levels
- incident phases
- optional ETA countdown
- 24-hour history strip
- recent and older status reports
- maintenance mode redirect
- admin preview

## Best-fit implementation for this repo

`DocuPeer` already has cookie auth and Prisma, so the cleanest version is:

- keep persistence in the main database
- protect admin endpoints with the existing session system
- add an admin authorization rule
- implement maintenance redirects in Next middleware

## Database additions

Add Prisma models similar to:

```prisma
model SiteStatusState {
  id              Int      @id @default(1)
  level           Int
  phase           String?
  maintenanceMode Boolean  @default(false)
  etaAt           DateTime?
  updatedAt       DateTime @updatedAt
}

model SiteStatusHistory {
  bucketTs    DateTime @id
  statusLevel Int
}

model SiteStatusReport {
  id          String   @id @default(cuid())
  statusLevel Int
  phase       String?
  message     String
  createdAt   DateTime @default(now())

  @@index([createdAt])
}
```

Notes:

- `SiteStatusState` should stay singleton
- history should be bucketed at five minutes
- use `DateTime` in Prisma even though the Atom worker uses millisecond numbers

## Auth and authorization

Current repo state:

- session cookie exists in `src/lib/auth.ts`
- authenticated routes already use `requireUser()`

Add one of these:

1. A boolean admin flag on `User`
2. A hardcoded admin email list in env for the first pass

Recommendation:

- start with an env allowlist for speed
- move to a DB role field when we need multiple admins

## Backend modules to add

Suggested server helpers:

- `src/lib/status.ts`
  - status level metadata
  - phase normalization
  - history bucket helpers
  - snapshot building
  - recent/older report splitting
- `src/lib/status-auth.ts`
  - admin authorization helper if we want to keep it separate

Suggested API routes:

- `src/app/api/status/public/route.ts`
- `src/app/api/status-manage/data/route.ts`
- `src/app/api/status-manage/state/route.ts`
- `src/app/api/status-manage/report/route.ts`

## Frontend routes to add

- `src/app/status/page.tsx`
- `src/app/status-manage/page.tsx`

Suggested supporting components:

- `src/app/components/status/StatusCircle.tsx`
- `src/app/components/status/StatusHistory.tsx`
- `src/app/components/status/StatusReports.tsx`
- `src/app/components/status/StatusAdminForm.tsx`

## Maintenance redirect strategy

Atom uses a client-side gate in `js/status-gate.js`.

For `DocuPeer`, server-side middleware is better:

- create `middleware.ts`
- fetch or read the current status state
- if `maintenanceMode` is `true`, redirect all public routes to `/status`
- exempt:
  - `/status`
  - `/status-manage`
  - `/api/status/public`
  - static assets
  - favicon and metadata routes

Why middleware is better here:

- avoids flash-of-content before redirect
- centralizes control
- fits Next.js routing better than adding a script to every page

## UI behavior to preserve from Atom

- large central status indicator with color and icon
- visible current phase pill
- live ETA countdown
- explanatory maintenance banner
- recent reports shown first
- older reports tucked into a disclosure section
- admin page preview updates before save

## Implementation order

1. Add Prisma models and migrate
2. Add server helpers for snapshot building and validation
3. Add public status API route
4. Add admin auth guard
5. Add admin data, state, and report routes
6. Add `/status` page
7. Add `/status-manage` page
8. Add `middleware.ts` maintenance redirect
9. Test recent history generation and report rollover

## Risks and differences from Atom

- Atom stores history in five-minute integer buckets; Prisma will need a clear bucketing convention to avoid duplicate rows
- middleware cannot safely hit the database on every request if we later deploy to an edge-only environment without planning for it
- if the status page itself depends on auth-protected layout code, maintenance redirects can loop unless exemptions are explicit
- if we keep no admin role concept, any logged-in user could control global site status

## Practical first-pass defaults

- levels: `1..5`
- phases: `investigating | identified | monitoring | resolved`
- recent reports limit: `500`
- older reports limit: `500`
- history retention in DB: at least `30 days`
- public graph window: exactly `24 hours`
- client refresh cadence: `60 seconds`
- ETA countdown refresh cadence: `1 second`

## What is different in DocuPeer today

- no middleware file exists yet
- no status models exist in Prisma yet
- auth already exists, so we should not copy Atom's separate login form unless we explicitly want a detached admin surface

## Recommendation

Build the Atom feature set, but adapt the internals to `DocuPeer`:

- keep the features
- keep the public/admin split
- keep maintenance mode
- do not copy the Cloudflare worker setup
- do not copy the separate bearer-token login unless it proves necessary
