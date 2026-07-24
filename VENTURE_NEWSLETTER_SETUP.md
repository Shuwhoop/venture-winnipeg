# The Thursday Venture setup

## Required Vercel environment variables

```text
NEXT_PUBLIC_APP_URL=https://your-venture-domain.example
SUPABASE_SECRET_KEY=server-only Supabase service role key
RESEND_API_KEY=Resend API key
NEWSLETTER_TOKEN_SECRET=random secret at least 32 characters
VENTURE_EMAIL_FROM=The Thursday Venture <hello@your-verified-domain.example>
VENTURE_EMAIL_REPLY_TO=your reply inbox
```

Never expose `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, or `NEWSLETTER_TOKEN_SECRET` in browser code or commits.

## Required Supabase migration

Apply:

```text
supabase/migrations/20260722190000_launch_thursday_venture_double_opt_in.sql
```

The migration adds the pending-confirmation state and delivery tracking used by the new signup flow.

## Delivery sequence

1. Visitor submits the public form.
2. Supabase stores a `pending` consent record.
3. Resend sends a confirmation email valid for 48 hours.
4. Visitor confirms through `/newsletter/confirm`.
5. The record becomes `active` and Venture sends the welcome email.
6. Unsubscribe links update both Supabase and Resend.

## Resend sender

`onboarding@resend.dev` is suitable for account testing. Before inviting public subscribers, verify a sending domain in Resend and change `VENTURE_EMAIL_FROM` to an address on that domain.

## Admin review

Open:

```text
/admin/newsletter
```

The page shows active, pending, unsubscribed, and delivery-error records.
