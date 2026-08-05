# Venture Google Login V1.0

Google sign-in now uses Venture's existing Supabase OAuth callback, profile onboarding, and guest-account merge flow.

## Included

- Continue with Google button on `/sign-in`
- Venture-styled Google button with accessible loading and error states
- Safe `next` redirect preservation
- Google cancellation and provider-configuration error messages
- Existing email magic-link sign-in remains available
- New Google users are sent through profile onboarding
- Google display names populate only when the Venture profile still has a generic name
- Existing saves, outings, visits, and preferences continue merging through the existing account-sync runtime
- No database migration
- No new npm dependency

## Required provider setup

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Documents\Projects\venture-production-starter-v0.1\Configure-Venture-Google-Login.ps1"
```

The helper derives the exact Supabase OAuth callback from `.env.local`, copies the setup values to the clipboard, and opens the relevant Google and Supabase pages.

### Google OAuth client

Create a **Web application** OAuth client.

Authorized origins:

- `http://localhost:3000`
- `https://venture.boogiebangers.com`

Authorized redirect URI:

- `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

Use the exact callback printed by the helper.

### Supabase

Under **Authentication → Providers → Google**:

- Enable Google
- Paste the Google Client ID
- Paste the Google Client Secret

Under **Authentication → URL Configuration**:

- Site URL: `https://venture.boogiebangers.com`
- Redirect URL: `http://localhost:3000/auth/callback`
- Redirect URL: `https://venture.boogiebangers.com/auth/callback`

The Google client secret belongs in Supabase, not in Venture's `.env.local` or Vercel environment variables.

## Test

1. Restart Venture.
2. Open `http://localhost:3000/sign-in`.
3. Select **Continue with Google**.
4. Choose a Google account.
5. Confirm a new user lands on `/profile/onboarding`.
6. Complete onboarding.
7. Sign out and use Google again.
8. Confirm the same profile, saves, and outings return.

If the Google app remains in Testing mode, the account used for testing must be added under Google Auth Platform's test users.
