# The People's Talk

The People's Talk, or TPT, is DocuPeer's public feedback wall: a curated,
permission-based collection of real comments from people using the platform.
It should feel close to the status/admin surfaces: calm, structured, readable,
and operationally clear. Not a hype feed. Not a social network. A public record
of what people are saying.

## Product Intent

TPT exists to make DocuPeer feel more trustworthy.

The page should show that people are using the platform, that many of them are
getting value from it, and that the team is willing to publish constructive
criticism instead of pretending everything is perfect. The balance can be mostly
positive, but it should not feel staged.

The internal target is roughly:

- 95% positive or strongly useful feedback
- 5% constructive criticism, friction, or "we can improve this" feedback

This ratio is an editorial guideline, not a public promise and not something to
hardcode into the app.

## Core Experience

Users can submit feedback about DocuPeer.

Required:

- Rating from 1 to 5
- Feedback body
- Consent to publish
- Display choice: name or anonymous

Optional:

- Short title
- Display name, if not anonymous
- Category suggestion

Submissions do not publish automatically. Every submission enters the admin
review queue first.

## Public Page

Route:

```txt
/tpt
```

Working title:

```txt
The People's Talk
```

Tone:

- Human
- Direct
- Trust-building
- Slightly editorial, but not dramatic

The first viewport should make TPT obvious immediately. It should not look like
a generic testimonial carousel. The page can use the same clean visual grammar
as `/status`, `/status-manage`, and `/admin`: white panels, restrained borders,
small uppercase labels, steady spacing, and clear state.

Suggested structure:

- Header band with the title, a short explanation, and aggregate count
- Category tabs or segmented controls
- Featured row for a few strong approved comments
- Full approved feed below
- Submission form either inline near the top or after the first feed section

Public cards should show:

- Rating
- Category
- Feedback body
- Display name or "Anonymous"
- Approved/public date

Public cards should not show:

- Internal user id
- Email
- Admin notes
- Rejected submissions
- Raw moderation status

## Categories

The exact names are not final. Start with three buckets that feel clear and
honest.

Strong option:

- What People Love
- What Could Be Better
- Open Notes

Alternate option:

- What's Working
- Where We Can Improve
- Still Thinking

Sharper option:

- Wins
- Friction
- Open Questions

Recommendation: use `What People Love`, `What Could Be Better`, and `Open
Notes` for the first build. They are plain, understandable, and not too
corporate.

## Submission Rules

Acceptable submissions:

- Specific feedback about DocuPeer
- Real user experience
- Clear enough to understand without private context
- No private data
- No abuse, spam, doxxing, threats, or impersonation

Not acceptable:

- Support requests that should stay private
- Personal attacks
- Fake names meant to impersonate someone
- Paper-review content from inside DocuPeer
- Anything containing emails, phone numbers, addresses, or sensitive personal
  data
- Anything the user did not consent to publish

Admin should be able to reject these quickly.

## Consent And Attribution

TPT should have an explicit consent checkbox:

```txt
I agree that DocuPeer may publish this feedback on The People's Talk.
```

If the user chooses anonymous, the public page should display:

```txt
Anonymous
```

If the user gives a display name, show only that display name. Do not publish
their account email or internal profile details.

Open question for build time:

- Should signed-in users default to their account first name?
- Should anonymous visitors be allowed to submit?

Initial recommendation: allow both signed-in and anonymous submissions, but
rate-limit the endpoint and require consent.

## Admin Workflow

TPT moderation belongs inside the existing `/admin` operations surface.

Admin should get a new section or button:

```txt
The People's Talk
```

Admin inbox states:

- Pending
- Approved
- Rejected

Admin actions:

- Approve
- Reject
- Assign category
- Mark as featured
- Clear featured

Rejecting should delete or permanently hide the submission. The current product
request says "denying means deleted." For implementation, use a status first if
we want auditability, or hard-delete if we want the simplest behavior.

Recommendation: store status as `rejected` first, then hide it everywhere.
Hard-delete can be a later admin cleanup action. This gives us a short recovery
window if someone clicks the wrong button.

Admin list should show:

- Rating
- Body preview
- Name/anonymous state
- Submitted time
- Suggested category
- Current status
- Action buttons

Admin detail/preview should show:

- Full body
- Public card preview
- Category selector
- Feature toggle
- Approve/reject controls

## Data Model Sketch

Likely Prisma model:

```prisma
model TalkSubmission {
  id                String   @id @default(cuid())
  userId            String?
  rating            Int
  title             String?
  body              String
  displayName       String?
  isAnonymous       Boolean  @default(true)
  consentToPublish  Boolean  @default(false)
  suggestedCategory String?
  category          String?
  status            String   @default("pending")
  featured          Boolean  @default(false)
  adminNotes        String?
  approvedAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([status, createdAt])
  @@index([category, status])
  @@index([featured, status])
}
```

Status values:

```txt
pending
approved
rejected
```

Category values:

```txt
love
improve
open-notes
```

## API Sketch

Public:

```txt
GET  /api/tpt/public
POST /api/tpt/submit
```

Admin:

```txt
GET  /api/admin/tpt
POST /api/admin/tpt/[id]/approve
POST /api/admin/tpt/[id]/reject
POST /api/admin/tpt/[id]/feature
```

The admin routes should use the existing admin session from `src/lib/admin-auth.ts`.

The public submit route should:

- Sanitize text
- Validate rating range
- Require consent
- Apply rate limiting
- Avoid exposing moderation details

## Validation

Rating:

- Integer
- Minimum 1
- Maximum 5

Body:

- Required
- Suggested minimum: 20 characters
- Suggested maximum: 1,200 characters

Title:

- Optional
- Suggested maximum: 120 characters

Display name:

- Optional
- Suggested maximum: 80 characters
- Ignored publicly when `isAnonymous` is true

Consent:

- Must be true

## Public UI Direction

Use the existing DocuPeer visual language, but let TPT feel a little more
editorial than the admin pages.

Keep:

- Warm off-white page background
- Thin borders
- White cards
- Small uppercase metadata labels
- Deep ink text
- Controlled spacing
- 8px or smaller radii

Avoid:

- Social feed chrome
- Like buttons
- Leaderboards
- Overly glossy testimonial cards
- Fake "wall of love" energy

Good card anatomy:

```txt
Rating  Category
"Feedback body..."
Name or Anonymous
```

## Admin UI Direction

Admin should match `/admin`, `/status-manage`, and `/live-manage`.

Recommended layout:

- Header: "The People's Talk"
- Left/main: submission queue
- Right/aside: filters and public preview
- Buttons: Approve, Reject, Feature
- Filters: Pending, Approved, Rejected, Featured

Use quiet, operational copy:

- "Pending submissions"
- "Public preview"
- "Approve"
- "Reject"
- "Featured"

## Homepage Integration

Initial build can skip homepage integration.

Later:

- Show 3 approved featured TPT entries on the homepage
- Link to `/tpt`
- Keep it below the product explanation and before FAQ/team content

## Privacy And Trust

TPT should never publish anything the user did not explicitly submit for public
use. It should not scrape product reviews from private support messages or
paper-review text.

Before launch, update legal/privacy language if needed to mention public
feedback submissions.

## Build Phases

Phase 1:

- Prisma model and migration
- Public submit form
- Public TPT page
- Admin moderation queue
- Approve/reject/category/feature

Phase 2:

- Homepage featured preview
- Admin search and filters
- Better empty states
- Basic TPT metrics in admin

Phase 3:

- User removal request flow
- Spam heuristics
- Export/moderation audit
- Optional "edited for clarity" flag if admin editing is introduced

## Open Decisions

- Final category names
- Whether anonymous visitors can submit
- Whether admin can edit body text before publishing
- Whether rejecting hard-deletes immediately or stores `rejected`
- Whether homepage integration ships with Phase 1 or later
- Whether TPT appears in the main nav immediately

## Recommended First Build

Build the simplest trustworthy version first:

- `/tpt` public page
- public feedback form
- three categories
- rating 1-5
- anonymous/name choice
- consent checkbox
- admin moderation inside `/admin`
- approved entries only on public page

Then decide on homepage placement once the page has real approved feedback.
