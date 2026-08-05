# Venture Reliability V1.0

This release adds a consistent reliability layer across Venture's public app.

## Included

- Branded route loading states for Explore, Saved, listings, the Outing Builder, generated outing results, and shared outing links.
- Global and route-specific error boundaries with useful retry and escape actions.
- A proper Venture 404 page.
- Reconnection feedback after the browser comes back online.
- Improved offline banner icons and accessibility announcements.
- Service-worker navigation timeout so weak connections fall back instead of hanging indefinitely.
- Safer service-worker installation when one precache item is temporarily unavailable.
- Updated runtime cache version.

## Testing

1. Open `/explore`, `/saved`, a listing, and `/build-outing/results` while throttling the network.
2. Turn the browser offline and confirm the offline banner appears.
3. Reconnect and confirm the Back online message appears.
4. Visit a fake URL such as `/this-page-does-not-exist`.
5. In DevTools, unregister the old service worker once if an older cached build keeps appearing.

No database migration or new package dependency is required.
