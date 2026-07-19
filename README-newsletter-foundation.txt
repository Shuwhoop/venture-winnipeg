VENTURE BY BOOGIE BANGERS NEWSLETTER FOUNDATION

This package adds the first complete newsletter layer:

BRANDING
- Updates the main metadata to Venture by Boogie Bangers.
- Updates the visible header endorsement to by Boogie Bangers.
- Keeps Venture as the short, recognizable product name.

PUBLIC SUBSCRIPTION
- Adds /newsletter.
- Adds warm signup cards to Home and Profile.
- Collects first name and email only.
- Requires an explicit consent checkbox.
- Includes a honeypot and basic rate limiting.

DATABASE
- Adds newsletter_subscribers in Supabase.
- Stores the exact consent wording and consent source.
- Tracks active and unsubscribed subscribers.
- Tracks welcome email delivery IDs and errors.

WELCOME EMAIL
- Warm Venture yellow/red design.
- Food, event, and memory graphics.
- Includes Prince Malimbiza only inside the welcome email.
- Explains the vision of bringing people together, creating more
  memories, and supporting local.
- Links to Explore and Build an Outing.
- Includes an unsubscribe link and the business reply email.

EMAIL ADDRESS
- Replies go to venturebangers@gmail.com.
- Gmail can be the Reply-To address.
- To send newsletters to the public through Resend, you will eventually
  need a domain you own and verify. Until then, onboarding@resend.dev can
  only send test messages to the email attached to your Resend account.

INSTALL

1. Extract this ZIP into any folder.
2. From the Venture project root, run the installer using its extracted
   path, or copy the package into the project and run:

node .\install-newsletter-foundation.mjs

3. Run:

node .\check-newsletter-foundation.mjs

4. Push the migration:

npx supabase db push

5. Add these values to .env.local:

RESEND_API_KEY=
VENTURE_EMAIL_FROM=Venture by Boogie Bangers <onboarding@resend.dev>
VENTURE_EMAIL_REPLY_TO=venturebangers@gmail.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEWSLETTER_TOKEN_SECRET=

Generate a token secret in PowerShell:

$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)

6. Build:

npm run build

7. Run:

npm run dev

8. Test with the email attached to your Resend account:

http://localhost:3000/newsletter

PRODUCTION SENDER

After buying a domain, verify a sending subdomain in Resend, then change:

VENTURE_EMAIL_FROM=Venture by Boogie Bangers <hello@updates.yourdomain.com>

Keep:

VENTURE_EMAIL_REPLY_TO=venturebangers@gmail.com

The next package will add the protected Thursday newsletter studio for
selecting Venture listings, composing a newsletter, sending a test, and
sending or scheduling a broadcast.
