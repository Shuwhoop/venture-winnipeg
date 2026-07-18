VENTURE ADMIN PASSWORD RESET

FILES

app/admin/forgot-password/page.tsx
app/admin/forgot-password/page.module.css
app/admin/reset-password/page.tsx
app/admin/reset-password/page.module.css
app/admin/login/page.tsx
app/admin/login/page.module.css

INSTALL

Extract this ZIP into the Venture project root.

SUPABASE REDIRECT CONFIGURATION

In Supabase:

Authentication
URL Configuration
Redirect URLs

Add:

http://localhost:3000/admin/reset-password
https://venture-winnipeg-two.vercel.app/admin/reset-password

Set the main Site URL to:

https://venture-winnipeg-two.vercel.app

You may keep localhost as an additional Redirect URL for local testing.

TEST

1. Restart:

npm run dev

2. Open:

http://localhost:3000/admin/forgot-password

3. Enter the exact administrator email.

4. Use only the NEW email link.

5. The link should open:

/admin/reset-password

6. Enter a new password of at least 12 characters.

7. After the update, Venture signs out the recovery session and sends
   you back to /admin/login.

SECURITY

Do not reuse the recovery link visible in the earlier screenshot.
It contained a recovery access token in the URL fragment.
Request a new email after the routes and redirect URLs are installed.
