# Venture Accounts and Cross-Device Sync v0.1

This build keeps Venture guest-friendly while adding optional email accounts for people who want their saved listings, complete outings, and preferences on another device.

## Included

- Passwordless email sign-in at `/sign-in`
- Supabase auth callback at `/auth/callback`
- Automatic local-to-cloud merge after sign-in
- Cloud copies of saved listings and full outing payloads
- Preference sync through `profiles.preferences`
- Deletion queue so removed saves are also removed from the account
- Sync status, manual sync, and sign-out controls on Profile
- Sync state banner on Saved
- Offline-only saved-data page at `/offline/saved`
- Service-worker exclusions for auth, account, admin, and API routes
- Row Level Security for every account-owned table


## App-first direction

This build also locks in Venture as an app-first product. The browser is only the delivery and installation layer. The public marketing footer is removed from the app shell, the first navigation destination is labelled **Today**, and the persistent bottom navigation remains the primary way through Venture.

## Product behaviour

- Explore and Build an Outing remain open without an account.
- Signing in merges local and cloud data. It does not wipe either copy.
- Local data is retained after sign-out so the current device remains useful.
- Removing an item creates a local tombstone. The next successful sync removes its cloud copy.
- Account pages and authenticated responses are not cached by the service worker.

## Supabase setup

Run this migration in the Supabase SQL editor or through the project migration workflow:

`supabase/migrations/20260723013000_create_account_sync.sql`

In Supabase Authentication URL Configuration, include the correct project URLs:

- Local development: `http://localhost:3000/auth/callback`
- Production: `https://YOUR-VENTURE-DOMAIN/auth/callback`
- Add preview callback patterns only when preview sign-in is genuinely needed.

Email authentication must remain enabled in Supabase.

## Test path

1. Save one listing and one complete outing while signed out.
2. Open `/profile` and choose **Sign in to sync**.
3. Open the secure link delivered by Supabase on the same device.
4. Confirm Profile reports a successful sync.
5. Sign into Venture in a second browser or device.
6. Confirm the listing, outing, and preferences arrive.
7. Remove one item, sync, and confirm it disappears on the other device after its next sync.
8. Switch offline and open `/offline/saved`.

## Security notes

- Browser code uses only the Supabase publishable key.
- The service-role key is never used for public account sync.
- RLS checks `auth.uid() = user_id` for every cloud save operation.
- Auth callbacks, account pages, API routes, and admin pages are excluded from service-worker caching.
