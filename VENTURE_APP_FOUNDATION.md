# Venture App Foundation v0.1

Venture now includes the foundations required for a stronger installable PWA:

- compact Android install prompt when supported
- iPhone Add to Home Screen instructions
- standalone-mode detection
- branded 192px, 512px, Apple, and maskable icons
- safe public-route runtime caching
- branded `/offline` route
- connection status messaging
- user-approved app update prompt
- app status and build identifier in Profile
- protected `/admin/pwa-readiness` checks

## Important behaviour

The service worker deliberately does not cache:

- `/admin` pages
- `/api` responses
- auth routes
- newsletter confirmation or unsubscribe routes

Saved listings, saved outings, and profile preferences remain local to the browser unless a future account-sync feature is added.

## Test before public promotion

Test these widths and devices:

- 320px small phone
- 390px typical modern iPhone
- 430px large phone
- Android Chrome installation
- iPhone Safari Add to Home Screen
- offline reopening after visiting Saved and Profile
- update prompt after a later deployment
