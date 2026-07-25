# Venture Listing Detail v1.0

This patch turns the public listing route into a complete mobile decision screen.

## Included

- Swipeable editorial hero gallery
- Event image support using the existing `events.image_url` column
- Original Venture cream, yellow, red, coral and dark-ink palette
- Clear current status, price, neighbourhood and venue/cuisine summary
- "Why Venture picked it" reasons grounded in available listing data
- Sticky mobile actions for Save, Share, Visited, Directions and Build Around This
- Dedicated MapLibre location map with map-error fallback
- Dietary, atmosphere, audience and format information
- Nearby and similar listings rail
- Freshness warning when verification has expired
- Existing hours, ticket, reservation, accessibility, transit, parking, source, report and claim controls retained

## Database

No migration is needed. The patch reads the existing `events.image_url` field. Restaurant/place listings continue to use Venture's branded editorial visual until a rights-safe place-image model is added.

## Acceptance checks

1. Open one restaurant and one event detail page.
2. Swipe the top gallery.
3. Test Save, Share, I Went Here and Directions in the sticky dock.
4. Tap Build Around This and confirm the listing is preselected.
5. Confirm the map centers on the listing.
6. Confirm related picks open their own detail pages.
7. Run `npm run build` before pushing.
