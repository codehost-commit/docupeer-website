# Atom Status API Contract

This is the contract the Atom frontend expects from its backend.

## Public routes

### `GET /api/status/public`

Used by `js/status-gate.js` to decide whether the full site should redirect to `/status`.

Minimum useful response shape:

```json
{
  "status": {
    "level": 1,
    "phase": "",
    "maintenanceMode": false,
    "etaAt": null,
    "updatedAt": 1724000000000
  },
  "serverTime": 1724000000000
}
```

### `GET /api/status/public?full=1`

Used by `js/status.js` for the full public page.

Response shape:

```json
{
  "status": {
    "level": 1,
    "phase": "",
    "maintenanceMode": false,
    "etaAt": null,
    "updatedAt": 1724000000000
  },
  "history": [
    { "bucketTs": 1723913700000, "statusLevel": 1 }
  ],
  "reports24h": [
    {
      "id": "uuid",
      "statusLevel": 3,
      "phase": "identified",
      "message": "We have identified the cause and a fix is underway.",
      "createdAt": 1723999000000
    }
  ],
  "olderReports": [],
  "serverTime": 1724000000000
}
```

Notes:

- `history` is always 288 items for a full 24-hour window
- each bucket is five minutes
- `olderReports` is included on the full view

## Admin routes

### `POST /api/status-manage/login`

Request:

```json
{
  "username": "admin",
  "password": "secret"
}
```

Response:

```json
{
  "ok": true,
  "token": "signed-admin-token"
}
```

Atom returns a token for the frontend to store and also sets a cookie. For `DocuPeer`, we can simplify this by reusing the normal session cookie and only allowing a specific admin user or role to access the admin routes.

### `POST /api/status-manage/logout`

Response:

```json
{
  "ok": true
}
```

### `GET /api/status-manage/data`

Protected route returning the same full snapshot used by the admin UI:

```json
{
  "status": {
    "level": 2,
    "phase": "investigating",
    "maintenanceMode": true,
    "etaAt": 1724003600000,
    "updatedAt": 1723999900000
  },
  "history": [],
  "reports24h": [],
  "olderReports": [],
  "serverTime": 1724000000000
}
```

### `POST /api/status-manage/state`

Request:

```json
{
  "level": 4,
  "phase": "identified",
  "maintenanceMode": true,
  "etaAt": 1724003600000
}
```

Behavior:

- validate level against `1..5`
- blank phase when level is `1`
- coerce invalid phase to `investigating` for non-1 levels
- write the current five-minute bucket into status history
- update `updatedAt`

Response:

```json
{
  "ok": true,
  "data": {
    "status": {},
    "history": [],
    "reports24h": [],
    "olderReports": [],
    "serverTime": 1724000000000
  }
}
```

### `POST /api/status-manage/report`

Request:

```json
{
  "message": "We deployed a mitigation and are monitoring recovery."
}
```

Behavior:

- uses the currently active status state
- stores `statusLevel`, `phase`, `message`, `createdAt`
- returns the updated snapshot

## Data rules inferred from the worker

- history bucket size: `5 minutes`
- history window rendered publicly: `24 hours`
- history count: `288` buckets
- report message max length: `4000`
- phase only applies when status level is above `1`
- ETA is stored as a unix timestamp in milliseconds

## Suggested DocuPeer route mapping

- `src/app/status/page.tsx`
- `src/app/status-manage/page.tsx`
- `src/app/api/status/public/route.ts`
- `src/app/api/status-manage/data/route.ts`
- `src/app/api/status-manage/state/route.ts`
- `src/app/api/status-manage/report/route.ts`
- optionally `src/app/api/status-manage/login/route.ts` only if we do not reuse normal DocuPeer auth
