# Venture Catalogue + Anchor Outings v1.3

Venture is a Winnipeg discovery catalogue first. The outing builder is the planning layer that turns any restaurant, event, activity, nightlife venue, attraction, or shop into a connected plan.

## Navigation

The primary app navigation is:

- Today
- Explore
- Map
- Saved
- Profile

`Build an Outing` remains available as a floating app action. Listing detail pages use the more specific `Build around this` action instead.

## Catalogue categories

Explore supports:

- Events
- Food & Drink
- Activities
- Nightlife
- Attractions
- Shopping

Activities include experiences such as board-game cafés, axe throwing, escape rooms, bowling, arcades, mini golf, laser tag, karaoke, climbing, pottery, cooking classes, and go-karting.

Permanent venues are stored as places. A scheduled occurrence at one of those venues remains an event. For example, a board-game café is an Activity, while a Friday board-game social hosted there is an Event.

## Map behaviour

Catalogue listings and map pins are not numbered. A selected pin grows and changes emphasis, while its matching preview card becomes active. Numbering remains limited to actual outing routes where order matters.

## Build around an anchor

Any published listing can become an outing anchor. When an anchor is selected, the user can choose whether Venture should add stops:

- Before the anchor
- After the anchor
- On both sides

Fixed-time events keep their official start time. Venture works backward and forward around them while checking travel time, availability, budget, and the requested outing window.

## Suggested time

Each listing receives a suggested visit duration. Official event start/end times override estimates. Otherwise Venture uses category defaults, including:

- Board-game café: 120 minutes
- Axe throwing: 90 minutes
- Escape room: 90 minutes
- Bowling: 105 minutes
- Arcade: 90 minutes
- Mini golf: 75 minutes
- Laser tag: 75 minutes
- Karaoke: 120 minutes
- Climbing: 120 minutes
- Go-karting: 75 minutes
- Run club: 90 minutes

The user can adjust the anchor duration in 15-minute steps. The chosen duration updates later stops, total outing length, travel gaps, and schedule validation.

At launch this is labelled `Suggested time`, not an observed average. Later, anonymized completed-outing data can support Venture aggregate estimates.

## Compatibility

The existing public listing type remains `event | restaurant` so saves, visits, account sync, and existing database rows continue to work. `catalogueKind` adds the richer category layer without breaking those systems.

No Supabase migration is required for this update. Existing `places.place_type` values already support `activity` and `attraction`.
