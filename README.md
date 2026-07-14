# Venture Production Starter v0.1

Venture is a mobile-first Winnipeg discovery product for trustworthy events, restaurants, and complete outings.

This repository is the first production-oriented scaffold. It is not yet a public-launch application.

## Included

- Next.js App Router and TypeScript
- Mobile-first Venture UI baseline
- PWA manifest and service worker shell
- Home, Explore, Tonight, Saved, Profile, and listing-detail routes
- MapLibre component with safe missing-configuration behaviour
- Supabase client and server-only admin helpers
- Newsletter consent endpoint scaffold
- PostgreSQL/PostGIS schema with verification, sources, reports, saves, business claims, newsletter consent, and audit history
- Architecture, build plan, and decision log

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Create a Supabase project.
3. Apply `supabase/migrations/001_initial_schema.sql`.
4. Add the public Supabase URL and anonymous key.
5. Add the service-role key only to server-side environment settings.
6. Choose a licensed MapLibre-compatible map style provider and add the style URL.
7. Run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production cautions

- Sample listings are fictionalized prototype data, not a production feed.
- Do not turn on Google place content until the exact implementation has been reviewed against current Google terms.
- Places UI Kit is optional and should remain behind a feature flag while it is pre-GA.
- Do not use public OpenStreetMap tile servers as a production tile backend.
- Newsletter signup should use double opt-in and a real unsubscribe workflow before collecting subscribers.
- High-risk business edits must pass review rather than publishing directly.
- Obtain qualified Canadian legal advice before public launch.
