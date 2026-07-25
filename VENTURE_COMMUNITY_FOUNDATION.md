# Venture is Building: Community Experience Foundation v1.5

This release adds the first monthly Venture community experience layer.

## Product boundary

This version is intentionally experience-only.

It includes:
- A public monthly experience page
- A full itinerary made from existing Venture places and events
- RSVP for one or two people
- Automatic confirmed or waitlisted status
- Private dietary and accessibility notes
- Community guidelines
- Profile RSVP history
- Admin creation, publishing, itinerary ordering, RSVP operations, and attendance status

It does not include:
- Checkout
- Coordination fees
- Payment collection
- Refunds
- Discount codes
- Venue or host payouts
- Public attendee lists
- Stranger-to-stranger messaging

Any estimated spend shown is informational. Users pay venues directly when an experience contains optional venue costs.

## Public routes

- `/community`
- `/community/[slug]`
- `/community/guidelines`

## Admin route

- `/admin/community`

## Supabase migration

Run:

`supabase/migrations/20260725130000_create_venture_community.sql`

The app handles a missing migration gracefully, but RSVP and admin creation remain unavailable until the SQL is applied.

## First setup

1. Run the migration in Supabase.
2. Open `/admin/community`.
3. Create a draft monthly experience.
4. Add existing Venture places or events as itinerary stops.
5. Confirm the public page.
6. Set the experience to Published.
7. Test RSVP with a signed-in non-admin account.
8. Test confirmation, waitlist, cancellation, and Profile display.

## Suggested first beta

Keep the first experience:
- At public venues
- Capped around 10 to 16 people
- Clearly hosted
- Free to RSVP
- Simple enough to operate manually
- Easy to cancel or adjust
