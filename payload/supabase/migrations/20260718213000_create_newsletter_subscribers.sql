create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  email text not null,
  email_normalized text not null unique,
  status text not null default 'active'
    check (
      status in (
        'active',
        'unsubscribed',
        'bounced',
        'complained'
      )
    ),
  consent_source text not null,
  consent_version text not null,
  consent_text text not null,
  consented_at timestamptz not null default now(),
  last_signup_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  welcome_sent_at timestamptz,
  welcome_email_id text,
  welcome_error text,
  resend_contact_id text,
  signup_ip text,
  signup_user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_subscribers_status_idx
  on public.newsletter_subscribers (status);

create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

alter table public.newsletter_subscribers
  enable row level security;

revoke all on public.newsletter_subscribers
  from anon, authenticated;

grant select, insert, update
  on public.newsletter_subscribers
  to service_role;

comment on table public.newsletter_subscribers is
  'Express-consent newsletter subscribers for Venture by Boogie Bangers.';

comment on column public.newsletter_subscribers.consent_text is
  'Exact newsletter consent language shown when the subscriber opted in.';
