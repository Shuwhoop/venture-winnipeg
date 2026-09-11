begin;

alter table public.newsletter_subscribers
  add column if not exists confirmation_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists newsletter_subscribers_confirmation_token_key
  on public.newsletter_subscribers (confirmation_token);

create unique index if not exists newsletter_subscribers_unsubscribe_token_key
  on public.newsletter_subscribers (unsubscribe_token);

create table if not exists public.newsletter_signup_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  email_normalized text not null,
  source text not null,
  event_type text not null
    check (event_type in ('subscribe', 'resubscribe', 'unsubscribe', 'confirm')),
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_signup_events_email_created_idx
  on public.newsletter_signup_events (email_normalized, created_at desc);

create table if not exists public.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  subject text not null,
  preheader text,
  intro text,
  closing_note text,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  resend_broadcast_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.newsletter_issues
  add column if not exists closing_note text;

create table if not exists public.newsletter_issue_items (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.newsletter_issues(id) on delete cascade,
  section text not null default 'this_weekend'
    check (section in (
      'this_weekend',
      'the_move',
      'new_on_venture',
      'lowkey',
      'next_week',
      'boogie_bangers',
      'custom'
    )),
  event_id uuid references public.events(id) on delete set null,
  place_id uuid references public.places(id) on delete set null,
  custom_title text,
  custom_description text,
  custom_url text,
  custom_image_url text,
  editor_note text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_issue_items_content_check check (
    event_id is not null or place_id is not null or custom_title is not null
  )
);

create index if not exists newsletter_issue_items_issue_sort_idx
  on public.newsletter_issue_items (issue_id, section, sort_order, created_at);

alter table public.newsletter_signup_events enable row level security;
alter table public.newsletter_issues enable row level security;
alter table public.newsletter_issue_items enable row level security;

revoke all on table public.newsletter_signup_events from anon, authenticated;
revoke all on table public.newsletter_issues from anon, authenticated;
revoke all on table public.newsletter_issue_items from anon, authenticated;

grant all on table public.newsletter_signup_events to service_role;
grant all on table public.newsletter_issues to service_role;
grant all on table public.newsletter_issue_items to service_role;

drop trigger if exists newsletter_issues_set_updated_at
  on public.newsletter_issues;

create trigger newsletter_issues_set_updated_at
before update on public.newsletter_issues
for each row execute function public.set_updated_at();

drop trigger if exists newsletter_issue_items_set_updated_at
  on public.newsletter_issue_items;

create trigger newsletter_issue_items_set_updated_at
before update on public.newsletter_issue_items
for each row execute function public.set_updated_at();

commit;

notify pgrst, 'reload schema';
