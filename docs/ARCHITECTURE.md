# Venture Architecture v0.1

## Recommended production stack

- Frontend: Next.js App Router, React, TypeScript, responsive CSS
- Delivery: mobile-first web app with Progressive Web App support
- Hosting: Vercel
- Database, auth, storage: Supabase/PostgreSQL
- Geospatial queries: PostGIS
- Maps: MapLibre GL JS with a properly licensed tile/style provider
- External Google place content: optional Google Places UI Kit, visually separated and feature-flagged
- Email: Resend after a Venture-owned sending domain, consent records, double opt-in, unsubscribe handling, and suppression lists are configured
- Monitoring: add Sentry or another error-monitoring provider before public beta
- Source control and CI: GitHub with protected main branch and preview deployments

## Why this stack

This architecture keeps the first version understandable for a small team while preserving a path to scale. PostgreSQL remains the source of truth. PostGIS supports distance and city-boundary queries. Next.js serves both public pages and server endpoints. Supabase removes the need to build authentication, file storage, and a database API from scratch.

## Legal data boundary

Venture-owned and directly licensed data remains in PostgreSQL. Third-party content is never assumed to be freely reusable.

Google Maps Platform content must follow the exact product-specific terms in force at implementation time. The ordinary Places API must not be combined with a non-Google map. If Venture keeps MapLibre, Google rating or review display should use Places UI Kit only where the current terms allow it, and the content must remain clearly attributed and visually separated. Because Places UI Kit is still pre-GA, Venture's core restaurant data must not depend on it.

## High-level flow

1. An official source, business, organizer, or community member submits raw information.
2. The raw source and legal basis are recorded.
3. Normalization standardizes titles, addresses, categories, times, prices, and links.
4. Duplicate and conflict checks run.
5. High-risk fields enter human review.
6. The listing receives a verification and freshness status.
7. Published data is exposed through read-only application queries.
8. Scheduled jobs recheck freshness, cancellations, closures, broken links, and expiry.
9. User reports enter a moderation queue and all changes are written to the audit log.

## Security rules

- Never expose the Supabase service-role key to the browser.
- Enable Row Level Security on every exposed table.
- Guests can read only published data.
- Users can mutate only their own saves, preferences, reports, and claims.
- Business edits should write to a proposed-change table or moderation queue before high-risk fields are published.
- Store minimal personal data.
- Hash or avoid collecting unnecessary network identifiers.
- Keep newsletter consent records and unsubscribe state.
- Maintain backups and test restoration before public launch.
