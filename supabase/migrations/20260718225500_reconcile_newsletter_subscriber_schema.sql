/*
 * Reconcile Venture's original newsletter schema with the
 * Venture by Boogie Bangers welcome-email subscriber fields.
 *
 * The original table already has consent_text_version as a
 * required column. The newer signup flow uses consent_version.
 * Both are kept so old and new code remain compatible.
 */

alter table public.newsletter_subscribers
  add column if not exists first_name text,
  add column if not exists email_normalized text,
  add column if not exists consent_version text,
  add column if not exists consent_text text,
  add column if not exists last_signup_at timestamptz,
  add column if not exists welcome_sent_at timestamptz,
  add column if not exists welcome_email_id text,
  add column if not exists welcome_error text,
  add column if not exists resend_contact_id text,
  add column if not exists signup_ip text,
  add column if not exists signup_user_agent text;

update public.newsletter_subscribers
set
  first_name = coalesce(
    nullif(btrim(first_name), ''),
    'Subscriber'
  ),
  email_normalized = coalesce(
    nullif(btrim(lower(email_normalized)), ''),
    btrim(lower(email::text))
  ),
  consent_version = coalesce(
    nullif(btrim(consent_version), ''),
    nullif(btrim(consent_text_version), ''),
    'legacy'
  ),
  consent_text_version = coalesce(
    nullif(btrim(consent_text_version), ''),
    nullif(btrim(consent_version), ''),
    'legacy'
  ),
  consent_text = coalesce(
    nullif(btrim(consent_text), ''),
    'Legacy Venture newsletter consent record.'
  ),
  last_signup_at = coalesce(
    last_signup_at,
    consented_at,
    created_at,
    now()
  );

alter table public.newsletter_subscribers
  alter column first_name set default 'Subscriber',
  alter column first_name set not null,
  alter column consent_version set default 'legacy',
  alter column consent_version set not null,
  alter column consent_text_version set default 'legacy',
  alter column consent_text_version set not null,
  alter column consent_text set default 'Legacy Venture newsletter consent record.',
  alter column consent_text set not null,
  alter column last_signup_at set default now(),
  alter column last_signup_at set not null;

create unique index if not exists
  newsletter_subscribers_email_normalized_uidx
  on public.newsletter_subscribers (email_normalized)
  where email_normalized is not null;

grant select, insert, update
  on public.newsletter_subscribers
  to service_role;

comment on column public.newsletter_subscribers.consent_text_version is
  'Consent wording version retained from the original Venture schema.';

comment on column public.newsletter_subscribers.consent_version is
  'Compatibility alias used by the Venture by Boogie Bangers newsletter flow.';
