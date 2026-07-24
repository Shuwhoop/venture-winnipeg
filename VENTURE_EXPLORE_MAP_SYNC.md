# Venture Explore Map Sync v0.9

This patch completes the first interactive map-and-list discovery pass for Venture.

## Included

- Numbered map markers that match map cards and Explore list cards.
- Marker-to-card and card-to-marker synchronization.
- Swipe-driven marker selection on mobile.
- A user-triggered **Search this area** workflow.
- **Show all Winnipeg** reset after an area search.
- Optional browser location permission.
- A visible user-location marker.
- Straight-line distance and lightweight travel-time estimates.
- Native listing sharing with clipboard fallback.
- Save, Share, I Went Here, Details, and Build Around This actions.
- Direct builder seeding through the listing anchor query.
- Mobile-safe controls, cards, empty states, and map-error handling.
- Venture's cream, yellow, red, coral, and dark-ink visual system.

## Important behaviour

- Venture does not request location automatically. The user must tap **Use my location**.
- Travel estimates are approximate and are not turn-by-turn route calculations.
- **Search this area** only applies after the user moves or zooms the map and taps the button.
- Map-area filtering continues into List view until **Show all Winnipeg** is selected.
- **Build around this** opens the outing builder with the listing preserved as the requested anchor.

## Test route

Open `/explore`, switch to Map, move the map, tap **Search this area**, swipe cards, use location, share a listing, and open **Build around this**.
