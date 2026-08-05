# Venture Accessibility + Analytics V1.0

Released: August 4, 2026

## Accessibility work

- Added a keyboard-visible “Skip to main content” link.
- Added route-change focus management and screen-reader page announcements.
- Added global reduced-motion handling and forced-colour support.
- Increased touch targets on coarse-pointer devices.
- Added arrow-key scrolling to the Today carousels and Explore map result rail.
- Rebuilt the Explore list/map selector as a keyboard-operable tab interface.
- Added a text alternative for the interactive map and removed essential map animation when reduced motion is requested.
- Added polite save/remove announcements for screen-reader users.
- Updated the public accessibility statement with the features now implemented.

## Analytics work

- Added explicit discovery events for searches, filters, sorting, view changes, result sets, and zero-result searches.
- Added primary-navigation tracking.
- Separated listing-card selections from actual listing-detail page loads to stop inflated listing-view counts.
- Added rich listing-detail analytics from the detail page itself.
- Added a 900 ms duplicate-event guard for development and fast repeated renders.
- Added query-state context to page views without storing the full query in page-view events.
- Redacted email- and phone-like text from search analytics and capped event strings before sending.
- Added journey metrics to Analytics Lab: search demand, zero-result rate, listing save rate, and outing-generation rate.
- Added top search phrases and most-used discovery filters to Analytics Lab.
- Added a screen-reader alternative for the daily analytics chart.
- Counted both listing and outing shares in the overview.

## Database and dependencies

- No Supabase migration is required.
- No package dependency changed.
- Existing analytics rows remain supported through legacy-interaction fallbacks.
