create extension if not exists pgcrypto;

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid()
);

alter table public.newsletter_subscribers
  add column if not exists id uuid,
  add column if not exists first_name text,
  add column if not exists email text,
  add column if not exists email_normalized text,
  add column if not exists status text,
  add column if not exists consent_source text,
  add column if not exists consent_version text,
  add column if not exists consent_text text,
  add column if not exists consented_at timestamptz,
  add column if not exists last_signup_at timestamptz,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists welcome_sent_at timestamptz,
  add column if not exists welcome_email_id text,
  add column if not exists welcome_error text,
  add column if not exists resend_contact_id text,
  add column if not exists signup_ip text,
  add column if not exists signup_user_agent text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.newsletter_subscribers
  alter column id
    set default gen_random_uuid(),
  alter column status
    set default 'active',
  alter column consented_at
    set default now(),
  alter column last_signup_at
    set default now(),
  alter column created_at
    set default now(),
  alter column updated_at
    set default now();

update public.newsletter_subscribers
set
  id =
    coalesce(
      id,
      gen_random_uuid()
    ),
  first_name =
    coalesce(
      nullif(
        btrim(first_name),
        ''
      ),
      'Subscriber'
    ),
  email_normalized =
    coalesce(
      nullif(
        btrim(
          lower(
            email_normalized
          )
        ),
        ''
      ),
      nullif(
        btrim(
          lower(email)
        ),
        ''
      )
    ),
  status =
    case
      when status in (
        'active',
        'unsubscribed',
        'bounced',
        'complained'
      )
        then status
      else 'active'
    end,
  consent_source =
    coalesce(
      nullif(
        btrim(consent_source),
        ''
      ),
      'legacy-migration'
    ),
  consent_version =
    coalesce(
      nullif(
        btrim(consent_version),
        ''
      ),
      'legacy'
    ),
  consent_text =
    coalesce(
      nullif(
        btrim(consent_text),
        ''
      ),
      'Legacy subscriber record migrated before consent-text tracking was added.'
    ),
  consented_at =
    coalesce(
      consented_at,
      created_at,
      now()
    ),
  last_signup_at =
    coalesce(
      last_signup_at,
      consented_at,
      created_at,
      now()
    ),
  created_at =
    coalesce(
      created_at,
      now()
    ),
  updated_at =
    coalesce(
      updated_at,
      created_at,
      now()
    );

alter table public.newsletter_subscribers
  alter column id
    set not null,
  alter column first_name
    set not null,
  alter column status
    set not null,
  alter column consent_source
    set not null,
  alter column consent_version
    set not null,
  alter column consent_text
    set not null,
  alter column consented_at
    set not null,
  alter column last_signup_at
    set not null,
  alter column created_at
    set not null,
  alter column updated_at
    set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.newsletter_subscribers'::regclass
      and contype = 'p'
  ) then
    alter table public.newsletter_subscribers
      add constraint newsletter_subscribers_pkey
      primary key (id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.newsletter_subscribers'::regclass
      and conname =
        'newsletter_subscribers_status_check'
  ) then
    alter table public.newsletter_subscribers
      add constraint newsletter_subscribers_status_check
      check (
        status in (
          'active',
          'unsubscribed',
          'bounced',
          'complained'
        )
      );
  end if;
end
$$;

create unique index if not exists
  newsletter_subscribers_email_normalized_uidx
  on public.newsletter_subscribers (
    email_normalized
  )
  where email_normalized is not null;

create index if not exists
  newsletter_subscribers_status_idx
  on public.newsletter_subscribers (
    status
  );

create index if not exists
  newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (
    created_at desc
  );

alter table public.newsletter_subscribers
  enable row level security;

revoke all
  on public.newsletter_subscribers
  from anon, authenticated;

grant select, insert, update
  on public.newsletter_subscribers
  to service_role;

comment on table
  public.newsletter_subscribers is
  'Express-consent newsletter subscribers for Venture by Boogie Bangers.';

comment on column
  public.newsletter_subscribers.first_name is
  'Subscriber first name used for email personalization.';

comment on column
  public.newsletter_subscribers.email_normalized is
  'Lowercase trimmed email used for matching and duplicate prevention.';

comment on column
  public.newsletter_subscribers.consent_text is
  'Exact newsletter consent language shown when the subscriber opted in.';

comment on column
  public.newsletter_subscribers.welcome_sent_at is
  'Time the Venture welcome email was successfully accepted for delivery.';
