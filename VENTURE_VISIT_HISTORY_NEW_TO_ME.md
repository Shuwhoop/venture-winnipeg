# Venture Visit History + New to Me v0.6

Venture now remembers restaurants and event occurrences that a user confirms they attended. Viewed and saved listings do not count as visits.

## User experience

- Listing pages include **I went here**.
- Generated outings include **Mark complete** so users can confirm only the stops they reached.
- Every expanded outing stop includes a compact visit control.
- The profile page includes **My Venture**, with visit totals, places tried, events attended, neighbourhoods explored, filters, and visit removal.
- The outing builder includes:
  - Best matches
  - Only somewhere new
  - Familiar + new
- Phrases such as “somewhere I haven’t gone” automatically enable New to Me.
- Add-stop and replace-stop choices follow the same discovery preference.

## How history works

Restaurants are treated as visited after any confirmed visit. Events are tracked by occurrence date, so attending one concert or market date does not automatically hide future dates of the same event.

Guest visits are stored locally. After sign-in, visit history merges with Supabase and follows the existing cross-device account sync system. Deletions also sync.

## Required Supabase migration

After installing the patch, open:

`supabase/migrations/20260723190000_create_visit_history.sql`

Copy the entire file into the Supabase SQL Editor and run it once.

The migration creates `public.user_visits`, indexes, an updated-at trigger, Row Level Security, and owner-only policies.

## Testing

1. Open a restaurant listing and tap **I went here**.
2. Open Profile and confirm it appears under **My Venture**.
3. Build an outing and choose **Only somewhere new**.
4. Confirm the visited restaurant is excluded.
5. Mark an outing complete and uncheck one skipped stop.
6. Confirm only selected stops appear in My Venture.
7. Sign in and run account sync.
8. Refresh on another signed-in browser and confirm the visits appear.
9. Remove a visit and sync again to confirm the deletion follows the account.

## Privacy rule

Venture does not infer attendance from page views or saves. A visit exists only after an explicit user action. Location-assisted confirmation is not included in this version.
