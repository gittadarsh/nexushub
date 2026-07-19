# NexusHub — Phase 1 build

## What's built so far
1. **Auth** — student signup (college email required), club signup (creates a
   pending `clubApplications` doc — no fake clubs go live), shared login that
   routes each role to the right place, route guards.
2. **Event posting** — club admins upload their existing poster + fill
   structured fields (team size, price, venue, dates, eligibility, doubt
   contact). Status is *derived*, not hand-set, from deadline/capacity so it
   can't go stale.

Not yet built (next, in this order): Explore/Home feed, registration flow,
subscribe + notifications, team-finder, likes/share + doubt resolution +
event status surfacing to students.

## Setup
```bash
npm install
cp .env.example .env      # fill in your Firebase project's web config
npm run dev
```

Get the Firebase config values from Firebase Console → Project Settings →
General → "Your apps" → Web app. You'll need Firestore, Authentication
(Email/Password provider), and Storage enabled on the project.

## Approving a club application (manual, Phase 1)
There's no admin UI yet — item 2 only requires that fake clubs can't
self-approve. For now, approve a pending club by hand in the Firebase console:
1. Find the doc in `clubApplications` with `status: 'pending'`.
2. Create a `clubs/{newClubId}` doc with that club's name/description and
   `adminUids: [requestedByUid]`.
3. Set `status: 'approved'` on the application.
4. Set `clubId: newClubId` on `users/{requestedByUid}`.

A small script or a one-page internal admin tool to do this in one click is a
good candidate for the next pass once the student-facing features are done.

## Firestore schema
See `FIRESTORE_SCHEMA.md` for the full collection layout and the security
posture each collection needs (rules file itself still to be written once the
read/write patterns are locked in against the Explore feed and registration
flow).

## Design tokens
Ink (#14171A) / paper (#FAF9F6) background pairing, Space Grotesk for
display type, Inter for body, a single signal-orange (#FF5A36) accent
reserved for live status and urgent states — deliberately not spent on
decoration so "Few Seats Left" and deadline warnings actually stand out.
