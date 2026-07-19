# Firestore Data Model — Phase 1

## Collections

### `users/{uid}`
Written once at signup, read on every auth state change to route the user correctly.
```
{
  role: 'student' | 'club_admin',
  email: string,              // must end in the college domain
  createdAt: Timestamp,
  clubId: string | null       // set only for club_admin, after approval
}
```

### `students/{uid}` (doc id == auth uid)
```
{
  name, rollNo, className, gender, contact: string,   // rollNo/contact blank until profile completed
  profileComplete: boolean,        // false until roll no + phone collected (see ProfileCompletionGate)
  subscribedClubs: string[],       // clubIds, drives the notification feed
  bookmarkedEvents: string[],
  createdAt: Timestamp
}
```

Signup only collects name + email + password to keep friction low. Roll
number and phone are collected once, right before a student's first event
registration, via `ProfileCompletionGate.jsx` — wire it into the
registration flow so it shows only when `profileComplete` is false.

### `clubApplications/{appId}`
A pending request. A platform admin (manually, in Phase 1) flips `status` to
`approved` or `rejected`. On approval, a Cloud Function (or manual script in
Phase 1) creates the real `clubs/{clubId}` doc and sets `users/{uid}.clubId`.
```
{
  requestedByUid: string,
  clubName, description, contactEmail, contactPhone: string,
  status: 'pending' | 'approved' | 'rejected',
  createdAt: Timestamp
}
```

### `clubs/{clubId}`
```
{
  name, description, logoUrl: string,
  adminUids: string[],             // up to 3 in Phase 3, 1 in Phase 1
  subscriberCount: number,         // visible only to this club (security rule)
  createdAt: Timestamp
}
```

### `events/{eventId}`
```
{
  clubId: string,
  title: string,
  posterUrl: string,               // reused Instagram-style graphic
  description: string,
  teamSize: number,                // 1 for solo events
  price: number,                   // 0 for free
  venue: string,
  date: Timestamp,
  registrationDeadline: Timestamp,
  eligibility: string,
  contactPersonUid: string,        // for doubt resolution — not always club head
  capacity: number | null,
  registeredCount: number,
  status: 'open' | 'few_seats' | 'closed' | 'completed',
  createdAt: Timestamp
}
```

### `registrations/{registrationId}`
```
{
  eventId, studentUid, clubId: string,
  status: 'registered' | 'cancelled',
  teamId: string | null,           // links to a team-finder formed group, if any
  createdAt: Timestamp
}
```

## Security posture (Phase 1 rules, plain-language)
- A student can read any `events` or `clubs` doc, but can only write their own
  `students/{uid}` doc and their own `registrations`.
- Only a `club_admin` whose `users/{uid}.clubId` matches `events.clubId` can
  create/edit that club's events.
- `clubs.subscriberCount` and any like/share counts are readable only by that
  club's own admins — never by students or other clubs (per the brief's
  privacy-over-vanity-metrics principle).
- `clubApplications` are writable by the requester (create only) and readable/
  updatable only by a platform-admin custom claim.

Actual `firestore.rules` will be added once the Phase 1 read/write patterns are
finalized against real screens — flagging that now so it isn't forgotten before
launch.
