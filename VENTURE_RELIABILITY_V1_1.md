# Venture Reliability V1.1

This patch makes expected offline Supabase failures quiet and non-disruptive.

## Changes

- Detects transient DNS, fetch, connection, timeout, and socket failures.
- Prevents those expected offline failures from being sent through `console.error`, which avoids the Next.js development error overlay.
- Keeps unexpected database and schema errors visible for debugging.
- Skips client analytics while the browser reports offline.
- Treats server analytics as non-critical during transient network failure and returns an accepted response instead of a 503.
- Stops listing-detail fallback queries early when the database is unreachable.

## Expected development output while offline

You may see compact terminal messages beginning with `[Venture offline]`. These are informational and should not trigger the browser error overlay.
