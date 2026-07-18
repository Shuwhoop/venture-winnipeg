VENTURE FORGOT-PASSWORD FIX

This replacement fixes two development issues:

1. Browser autofill could visually fill the email field without updating
   React state, causing "Password recovery requires an email."

2. Expected Supabase Auth errors were logged with console.error, causing
   the Next.js development overlay to cover the page.

INSTALL

Extract this ZIP into the Venture project root. It replaces:

app/admin/forgot-password/page.tsx

Then restart:

npm run dev

RATE LIMIT

When Supabase reports "email rate limit exceeded", wait about one hour
before requesting another link. Press the reset button only once and use
only the newest recovery email.
