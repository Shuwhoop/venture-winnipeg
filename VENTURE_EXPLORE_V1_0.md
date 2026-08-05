# Venture Explore V1.0

Explore V1.0 turns the discovery page into a clearer end-to-end path from a homepage idea to a useful Winnipeg result.

## What changed

- Added a real `occasion=date` discovery mode.
- Updated the homepage Date ideas button to use the new occasion filter.
- Added visible Near me and Date ideas chips to Explore.
- Added Attractions to the quick and full filter controls.
- Added Near me and Date ideas controls inside the filter sheet.
- Search now preserves the filters already selected by the user.
- Added recent-search storage and useful search suggestions through the browser search suggestion list.
- Improved natural-language parsing for searches such as:
  - `date ideas`
  - `cheap food downtown`
  - `free things this weekend`
  - `coffee near university`
  - `live music tonight`
- Added result sorting:
  - Recommended
  - Nearest when Near me is active
  - Open first
  - Name A-Z
- Added analytics for sort changes.
- Added clearer no-result recovery actions.
- Kept list and map selection synchronization, Search this area, distance labels and map-result cards intact.
- Replaced the Explore search symbol with an SVG icon.

## Files changed

- `app/explore/page.tsx`
- `app/explore/explore.module.css`
- `components/discovery-filter-sheet.tsx`
- `components/discovery-filter-sheet.module.css`
- `components/explore-experience.tsx`
- `components/explore-search-form.tsx`
- `components/today-discovery.tsx`
- `lib/discovery-intent.ts`
- `lib/explore-search.ts`

## Test checklist

1. Open `/explore` and confirm the page loads with Recommended sorting.
2. Search `cheap food downtown` and confirm Venture shows the interpreted filters.
3. Search `free things this weekend` and confirm the search phrase is cleaned instead of searching for the word `things`.
4. Tap Date ideas from the homepage and confirm Explore opens with Date ideas active.
5. Tap Date ideas again in Explore and confirm it toggles off.
6. Tap Near me, grant location permission and confirm Nearest becomes the active sorting mode with distance labels.
7. Deny location permission and confirm normal neighbourhood browsing still works.
8. Change sorting to Open first and Name A-Z.
9. Switch between List and Map and confirm the selected card and pin stay synchronized.
10. Move the map, tap Search this area and confirm both the map and result rail update.
11. Apply filters, submit a new search and confirm the active filters are preserved.
12. Search for a phrase with no matches and test the three recovery buttons.
13. Test at approximately 360 px, 390 px, regular phone width and desktop width.

## Validation completed before packaging

- All changed TypeScript and TSX files passed TypeScript syntax transpilation.
- Discovery-intent functional checks passed for date, budget, event, timing, nearby-word cleanup and repeated searches.
- `package.json` and `package-lock.json` were unchanged, so the installer preserves the existing `node_modules` folder.

A full dependency install could not be completed in the packaging environment because its npm mirror was missing one unrelated package. Run the local app after installation to complete the normal Next.js build validation on your machine.
