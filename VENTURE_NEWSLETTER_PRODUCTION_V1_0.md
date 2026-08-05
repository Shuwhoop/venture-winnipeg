# Venture Newsletter Production V1.0

This update turns the working double-opt-in newsletter into a cautious production workflow. It does not send a public campaign automatically.

## Added

- Private admin campaign studio at `/admin/newsletter/studio`
- Reusable Venture email layout with no unlicensed listing photos
- Browser preview and private test-send
- Resend segment setup: `Confirmed Venture Subscribers`
- Resend topic setup: `Venture This Weekend`
- Active-subscriber synchronization in safe batches
- Resend Broadcast draft creation
- Recent Broadcast history in Venture admin
- Verified webhook handling for bounces, complaints, and suppressions
- Automatic subscriber status updates in Supabase

No Supabase migration or new npm dependency is required.

## Required environment values

Keep the newsletter variables already used by Venture, then add:

```text
VENTURE_POSTAL_ADDRESS=Your valid business mailing address
RESEND_WEBHOOK_SECRET=whsec_your_resend_signing_secret
```

`VENTURE_POSTAL_ADDRESS` is included in public campaign footers. Do not invent an address. Use a valid mailing address suitable for your business correspondence.

Keep these existing production values:

```text
RESEND_API_KEY=your Resend full-access API key
VENTURE_EMAIL_FROM=Venture by Boogie Bangers <venture@updates.boogiebangers.com>
VENTURE_EMAIL_REPLY_TO=venturebangers@gmail.com
NEXT_PUBLIC_APP_URL=https://venture.boogiebangers.com
NEWSLETTER_TOKEN_SECRET=the same secret already used locally
SUPABASE_SECRET_KEY=your server-only Supabase secret
```

Never commit `.env.local` or expose server secrets through a `NEXT_PUBLIC_` variable.

## Connect Resend webhooks

After Venture is deployed:

1. Open Resend, then Webhooks.
2. Create this endpoint:

```text
https://venture.boogiebangers.com/api/newsletter/webhooks/resend
```

3. Select these events:

```text
email.bounced
email.complained
email.suppressed
suppression.added
```

4. Copy the webhook signing secret into `RESEND_WEBHOOK_SECRET` locally and in Vercel.
5. Redeploy Venture after changing Vercel environment variables.

The webhook verifies the Resend signature before changing a subscriber. A bounce or suppression becomes `bounced`; a spam complaint becomes `complained`.

## First production workflow

1. Open `/admin/newsletter/studio` while signed in as a Venture admin.
2. Select **Prepare Resend audience**.
3. Select **Sync active subscribers** until the studio says the audience sync is complete.
4. Edit the starter issue.
5. Open the browser preview.
6. Send a private test to yourself.
7. Add and verify the physical mailing address.
8. Select **Create Resend draft**.
9. Open the draft in Resend and perform the final audience, links, footer, mobile, and unsubscribe review.
10. Schedule or send from Resend only after that review.

The Venture endpoint creates a draft only. It deliberately does not pass `send: true`.

## Production test

Before the first real issue, use a small controlled audience:

- yourself
- one Gmail address
- one Outlook address, when available
- one phone-sized email client

Check the sender name, reply address, subject, preheader, links, personalization fallback, footer address, and unsubscribe link.
