# Venture Dynamic Add-Stop v0.3

This patch completes the editable outing route flow while keeping Venture app-first.

## What changes

- The route heading now reads directly from the live stops array, so 3 becomes 4 immediately after a successful add.
- Tapping Food, Event, or Drinks opens a mobile bottom sheet with up to five verified options.
- Each option shows its time, route position, estimated price, travel impact, neighbourhood, and why it fits.
- Venture inserts the selected option in the correct route position.
- Stop order, travel legs, route map, totals, requested/actual counts, status, warnings, and mix are refreshed together.
- Added and replaced stops keep the same outing identity, so an already-saved outing updates instead of creating a stale duplicate.
- Every stop now has a Remove Stop action. Removing a stop renumbers the route and recalculates the new travel connection.
- Saved and shared outing graphics now display the real number of stops instead of a hardcoded three.
- The stop-count change and option sheet use restrained motion with reduced-motion support.
- The lavender, cream, yellow, red, green, and purple palette remains in place without restoring the black panels.

## Test path

1. Build a three-stop outing.
2. Tap Choose Food, Event, or Drinks.
3. Select one of the verified options.
4. Confirm the heading changes to four stops, the new card appears in order, and the map updates.
5. Save the outing, add or replace another stop, then open Saved and confirm the edited route remains.
6. Open one stop's details and remove it. Confirm the count, numbering, map, cost, and travel rows update.
7. Share the edited outing and confirm the shared view shows the same stop count.
