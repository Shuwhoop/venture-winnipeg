# Venture Stop Editor + Smart Timing v0.5

This patch completes the first version of the generated-outing editor.

## What it adds

- A compact `•••` menu on every outing stop.
- A mobile replacement sheet with several verified alternatives.
- Remove stop with stop-count, route, travel, timing, saved-data and share-data updates.
- Open directions for an individual stop.
- A shortcut into route reordering.
- Smart checks for:
  - impossible travel gaps,
  - fixed event start and end times,
  - restaurant opening and closing hours when structured hours are available,
  - travel legs above the user’s preference,
  - outings that run past the requested duration.
- `Fix the timing` and `Keep this order` controls.
- Automatic schedule repair after a stop is removed.

## Data behaviour

Edits continue to use the current generated outing as the source of truth. If the outing is already saved, the saved copy is updated. Local generated-outing storage is also updated so refreshes preserve the edit.

## Test path

1. Generate an outing with at least three stops.
2. Open the `•••` menu on a stop.
3. Replace it and select an option from the mobile sheet.
4. Remove another stop and confirm the stop count changes.
5. Enter Edit order and place an event in a difficult time slot.
6. Confirm Venture shows a smart route warning.
7. Tap Fix the timing and confirm the itinerary times update.
8. Save, refresh, and confirm the edited route remains.
