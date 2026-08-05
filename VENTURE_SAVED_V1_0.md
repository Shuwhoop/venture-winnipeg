# Venture Saved V1.0

Saved V1.0 completes the first useful discovery loop:

Discover → inspect → save → return → build around it.

## Public experience

- A redesigned Saved page that matches Venture's cream, yellow, red, black-outlined visual direction.
- At-a-glance counts for saved places, events, and complete outings.
- Search across listing names, categories, neighbourhoods, outing titles, and outing stops.
- Four collection views: All, Places, Events, and Outings.
- Dedicated saved listing cards with View and Build around it actions.
- Saved outing cards with dates, transportation, cost, and route previews.
- One-tap removal with a seven-second Undo action.
- A cleaner loading state and a corrected empty-state route to `/build-outing`.
- SVG interface artwork in place of emoji-based controls.
- Guest saves continue using local storage and the existing account sync system remains intact.

## Photo policy

The public Saved experience does not display copyright, permission, or photo-rights labels. It only receives the already-approved public image URL from the existing listing pipeline. When no approved image is available, Venture's category artwork is shown.

Photo-rights information and approval controls remain private to administrators.

## Files added or changed

- `app/saved/page.tsx`
- `app/saved/saved-v1.module.css`
- `components/saved/saved-listing-card.tsx`
- `components/saved-empty-state/saved-empty-state.tsx`
- `components/saved-empty-state/saved-empty-state.module.css`
- `scripts/check-saved-v1.mjs`

## Database and dependencies

No Supabase migration is required.
No package dependency changes are required.
