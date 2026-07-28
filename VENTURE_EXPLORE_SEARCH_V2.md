# Venture Explore Search v2

Explore no longer searches only the newest fixed batch of listings.

## What changed

- Search terms are applied directly to Supabase before result limits.
- Older listings remain searchable regardless of their catalogue position.
- Explore initially shows 24 results.
- `Show 24 more` expands the current search without clearing filters.
- Search covers listing names, descriptions, categories, neighbourhoods, cuisine and addresses.
- Events and places are queried separately, then combined into a balanced result feed.
- Activities, nightlife and attractions are now valid Explore categories.
- Activity and attraction place types are no longer silently omitted from Explore.
- The map and list continue to use the same loaded result set.

## Why this fixes the import problem

The old Explore page loaded a fixed number of the newest published rows and searched only inside that batch. Importing newer listings pushed older listings such as Tommy's Pizzeria and The Forks Market outside the batch even though their database rows still existed.

Explore Search v2 filters in Supabase first, so searching for an older listing returns it before pagination is applied.

## Capacity

The database may contain thousands of listings. A search is run against the full matching database set, while the browser receives only a controlled result batch. Up to 480 results may be expanded into one view to protect map and mobile performance. More specific searches can find listings regardless of their position in the overall catalogue.

## Database changes

No migration is required. Existing listing rows, photos, edits and publication statuses are untouched.
