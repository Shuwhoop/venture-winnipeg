# Venture Production Protection V1.0

This release hardens Venture's highest-risk public mutation paths without changing the product flow.

## Protected outing APIs

The following routes now use shared mutation protection:

- generate outing
- add stop
- replace stop
- remove stop
- create a share link
- group collaboration updates

The protection layer adds:

- same-origin checks for browser mutations
- bounded request bodies before expensive work starts
- per-connection burst rate limits
- stricter group-remix limits
- dependency-free request-shape validation before the existing domain parsers
- structured request IDs and server error logs for unexpected failures

Venture's existing authenticated profile routes keep their existing user-aware limits.

## Admin protection

The existing central Supabase proxy guard remains the first line of defense for `/admin/*` and `/api/admin/*`.
The installer verifies that guard is still present before it is allowed to push this release.

## Security headers

All routes receive:

- narrow CSP protections for framing, object embedding, and base URI
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- strict referrer policy
- restrictive permissions policy while keeping same-origin geolocation available
- one-year HSTS on HTTPS

The CSP is intentionally narrow in V1.0 so it does not break MapLibre, Supabase, Google sign-in, or future media sources.

## Automated checks

A dependency-free Node test suite covers request-boundary behavior, including:

- normal outing generation envelopes
- oversized interest lists
- stop-count limits
- oversized itinerary mutation payloads
- supported group actions
- strict share-code format

The installer runs source checks, tests, full TypeScript validation, the production Next.js build, and `git diff --check` before any push.

## Rate-limit note

The current limiter is an application-level in-memory burst guard. This is useful protection against accidental loops and bursts, but it is not a globally distributed quota across every Vercel instance. A later infrastructure pass can move the counters to a shared store or Vercel Firewall without changing the API contract introduced here.
