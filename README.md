# DocuPeer

A 100% free, reciprocal peer-review platform for papers.

**The loop:** Review 2 papers, unlock 1 submission, receive peer reviews, improve your writing.

No paid tier. No subscriptions. No social feed. No leaderboards. Just people
helping people write better.

## Tech stack

- **Next.js 14** (App Router, TypeScript) — one full-stack codebase
- **Prisma + SQLite** — zero-config local database (swap `DATABASE_URL` for Postgres in production)
- **Custom auth** — bcrypt password hashing + signed JWT session cookies (`jose`)
- **Tailwind CSS** with a dark, panelled design system (Space Grotesk + Inter + JetBrains Mono)

## Quick start

```bash
git clone <your-repo-url> docupeer
cd docupeer
cp .env.example .env
# open .env and replace AUTH_SECRET with a long random string
npm install
npm run setup      # creates the SQLite DB and seeds demo data
npm run dev        # http://localhost:3000
```

`npm run setup` runs `prisma db push` then seeds four demo users and four
papers. Demo login: `maya@example.com` / `password123` (also `leo@`, `ana@`,
`sam@`).

Reset the database any time with `npm run db:reset`.

## Team headshots

Drop `rahul.jpeg`, `aryan.jpeg`, `akshaj.jpeg`, `pritam.jpeg` into
`public/team/`. The About page falls back to initials if a file is missing.

## How the core rules are enforced (all server-side)

| Rule | Where |
| --- | --- |
| 2 reviews to 1 submission credit | `src/lib/credits.ts` (derived from counts; no writable credit field) |
| At most 1 paper per day | `src/lib/credits.ts` (rolling 24h check) |
| Papers of 350+ words | `src/lib/validation.ts` (server) plus a live counter (client) |
| Papers anonymous to reviewers | `api/papers/[id]` and `api/papers/random` strip author fields |
| Cannot review your own paper | Enforced in `api/papers/[id]` and `api/reviews` |
| One review counts once | DB `@@unique([reviewerId, paperId])` on `Review` |
| Education/expertise matching | `src/lib/matching.ts` |
| AI-content review blocking (>10%, configurable) | `src/lib/ai-detection/*` |

## AI-content detection (pluggable)

Review text is screened before a review is accepted. The application depends
only on the `AiDetector` interface and the `screenReview()` helper in
`src/lib/ai-detection/index.ts`, never on a concrete vendor.

- **Threshold** is configuration: change `AI_CONTENT_THRESHOLD` in `.env`
  (`0.10` = block above 10%).
- **Provider** is swappable: implement `AiDetector`, register it in the
  `PROVIDERS` map, and set `AI_DETECTOR_PROVIDER`. A dependency-free
  `heuristic` provider ships by default so the flow works end to end. It is
  a placeholder, not a production-grade detector.

## Project structure

```
prisma/
  schema.prisma        # User, Paper, Review, Annotation
  seed.ts              # demo users and papers
public/
  logo.png             # brand mark (also used as favicon source)
  team/                # drop headshots here (see the folder README)
scripts/
  test-logic.ts        # 24 unit tests for the pure business logic
src/
  lib/
    auth.ts            # sessions, password hashing
    credits.ts         # submission-credit and daily-limit logic
    matching.ts        # education/expertise/specialty/strength matching
    validation.ts      # server-side field and word-count validation
    sanitize.ts        # UGC sanitization
    rate-limit.ts      # in-memory rate limiting
    highlight.ts       # selection to offsets, segment rendering
    ai-detection/      # pluggable AI-content screening
  app/
    api/               # auth, papers, reviews, dashboard route handlers
    review/            # the reviewing surface (highlight / add / remove / randomize)
    submit/            # paper submission (credit-gated, 350-word)
    dashboard/         # progress toward next submission
    history/           # feedback received and reviews completed
    about/             # founders and team
    login/ register/   # auth pages
```

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # start prod server (after build)
npm run db:push    # apply schema to the database
npm run db:seed    # (re)seed demo data
npm run db:reset   # nuke and reseed
npm run setup      # db:push + db:seed
npx tsx scripts/test-logic.ts   # run business-logic tests
```

## Security and privacy

- All credit/limit/word-count checks run server-side. The client cannot grant
  itself submissions.
- Author name, email, and identity are never sent to reviewers.
- Reviewer identity is never sent to authors.
- User content is sanitized and rendered as text (no `dangerouslySetInnerHTML`).
- Auth, submission, and review endpoints are rate-limited.

> Change `AUTH_SECRET` before deploying anywhere real. Never commit `.env`.

## License

MIT. See [LICENSE](./LICENSE).
# docupeer-website
