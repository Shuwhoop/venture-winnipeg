# Venture Home Functionality V2.5

Date: August 2, 2026

## What changed

- Replaced the decorative Home ranking with a transparent quality score based on verification, source checks, photos, usable hours, pricing, coordinates, description completeness, and whether a listing is currently active.
- Venture Pick now uses that quality score and describes itself as chosen for quality and freshness.
- Happening Now now contains only restaurants that are open and events that are actually marked Today, Happening, or Live. Unrelated filler listings are no longer inserted.
- Renamed Trending This Week to Worth Checking Out until Venture has enough real interaction data to support a truthful trending label.
- Prevented avoidable duplicates between Venture Pick, Happening Now, and Worth Checking Out.
- Added interaction analytics for Home search, quick filters, Venture Pick/listing opens, the Outing Builder banner, Explore searches, nearby-location outcomes, and zero-result searches.
- Replaced the Home quick-filter character icons with inline SVG controls.

## Near Me flow

- Location permission is requested only after the user taps Near me.
- Coordinates are stored only in sessionStorage for the current browser tab.
- Exact coordinates are not placed in the URL.
- Explore loads a larger candidate pool for a nearby request, sorts the loaded listings by distance in the browser, and updates each card with a distance label.
- Near Me stays active when users search, apply filters, or load more results.
- If the location is missing or denied, Explore shows a clear fallback and lets the user browse by neighbourhood.
- The Explore map receives the same location, so map distance and list distance stay synchronized.

## Files changed

- `components/today-discovery.tsx`
- `components/today-discovery.module.css`
- `components/explore-search-form.tsx` (new)
- `components/explore-experience.tsx`
- `components/discovery-filter-sheet.tsx`
- `app/explore/page.tsx`
- `app/explore/explore.module.css`
- `lib/explore-map-utils.ts`

## Backup

Original versions are stored in:

`venture-backups/home-functionality-v2.5-20260802-2337/`

## Validation completed here

- All changed TypeScript and TSX files passed a TypeScript syntax transpilation check.
- A targeted local type check found no errors in the changed Venture logic after external-library shims were applied. Remaining check errors came only from incomplete MapLibre shims, not the changed files.
- A full `npm ci` and production build could not run in the workspace because the internal package mirror returned a 404 for `zod-validation-error@4.0.2`.

## Test locally

```powershell
cd "C:\Users\ppmal\Documents\Projects\venture-production-starter-v0.1"
npm install
npm run dev
```

Test these journeys:

1. Home search opens Explore with the correct query.
2. Open now, Cheap, Date ideas, More, and both See all links open the correct Explore state.
3. Near me asks for permission only after tapping it.
4. Granting permission opens Explore, shows the privacy note, displays nearest listings first, and shows distance labels.
5. Denying permission leaves a clear neighbourhood fallback.
6. Applying filters or loading more keeps Near Me active.
7. Happening Now never fills itself with unrelated listings.
8. Venture Pick, Happening Now, and Worth Checking Out do not repeat the same listing.
