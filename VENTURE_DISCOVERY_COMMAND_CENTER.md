# Venture Discovery Command Center v0.7

This release finishes the first major discovery pass for Venture's app-first experience.

## Today

- Replaces the old marketing-style home content with a mobile Today screen.
- Adds time-of-day messaging for Winnipeg.
- Adds natural-language search.
- Adds quick paths for Tonight, New to Me, Under $40, Events, and Food.
- Adds horizontal Tonight, New to You, and Open Now rails.
- Adds a compact My Venture progress card when visit history exists.
- Keeps Build an Outing as the primary action.

## Explore

- Understands phrases such as:
  - free events tonight
  - cheap food somewhere new
  - a restaurant I have never been to
  - open now
  - something this weekend
- Removes instruction words before text matching so natural requests do not create false empty results.
- Adds a mobile filter sheet for category, time, budget, neighbourhood, and New to Me.
- Applies visit-history filtering to both list and map results.
- Keeps event attendance occurrence-specific.
- Adds clearer empty states when all matching places have already been visited.

## No migration

This release uses the visit-history system from v0.6. No new Supabase migration is required.
