# Venture Profiles + Onboarding V1.0

Private-first accounts and personalization for Venture.

## Included

- Private profile dashboard at `/profile`
- Four-step first-run onboarding at `/profile/onboarding`
- Editable display name, optional username, short bio, and Winnipeg home neighbourhood
- Private avatar uploads through the Supabase `avatars` bucket
- Interests, cuisines, dietary needs, accessibility needs, outing styles, budget, transport, and group-size defaults
- Notification settings and The Thursday Venture status controls
- Cross-device guest-data merging through the existing account-sync runtime
- Data export, global sign-out, email-change initiation, and permanent account deletion
- Private administrator account overview at `/admin/users`
- Central protection for `/admin/*` and `/api/admin/*` in `proxy.ts`
- Same-origin checks and in-memory abuse protection for profile/account writes
- Profile route loading and error states
- Cleanup of old source-level `.bak` and `.backup-*` files

## Required Supabase migration

Run this file in the Supabase SQL editor before testing Profiles:

`supabase/migrations/20260805193000_create_private_profile_system.sql`

It adds:

- New private profile fields
- `user_preferences`
- `notification_preferences`
- Row Level Security policies
- Private avatar storage and ownership policies
- New-account and existing-account backfills

The migration is designed to be safe to run once after the earlier Venture migrations.

## Privacy model

Profiles remain private in V1.0. Other users cannot read profile details, preferences, saved items, visit history, newsletter status, or precise location. The database reserves a future visibility field, but the active Row Level Security policies only permit self-access.

## Rate-limit note

This release uses an in-memory limiter so profile endpoints are protected immediately without adding a dependency. On Vercel, counters are isolated per serverless instance and reset when an instance restarts. Replace this with a shared Redis-backed limiter before a large public launch.

## Test path

1. Apply the Supabase migration.
2. Start Venture and open `/profile` while signed out.
3. Sign in through the profile call-to-action.
4. Complete or skip onboarding.
5. Edit the profile and upload a JPEG, PNG, or WebP avatar under 2 MB.
6. Save preferences and refresh the browser.
7. Confirm guest saves and outings appear after account sync.
8. Change newsletter status in `/profile/settings`.
9. Download the data export.
10. Open `/admin/users` while signed in as an address listed in `VENTURE_ADMIN_EMAILS`.
11. Confirm a non-admin account cannot open admin pages or admin APIs.

## Next engineering sprint

The next structural sprint should protect the outing generator with shared rate limiting, add Vitest coverage around scoring and time logic, then begin splitting the oversized generation route without changing its behaviour.
