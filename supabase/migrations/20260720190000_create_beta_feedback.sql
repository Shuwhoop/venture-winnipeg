-- Venture outside-beta analytics and feedback.
-- Public browser code never receives direct table access. Writes go through
-- rate-limited server routes using the Supabase service-role client.

create table if not exists public.beta_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  event_name text not null check (
    char_length(event_name) between 2 and 60
  ),
  page_path text not null check (
    char_length(page_path) between 1 and 240
  ),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists beta_events_created_at_idx
  on public.beta_events(created_at desc);

create index if not exists beta_events_session_idx
  on public.beta_events(session_id, created_at desc);

create index if not exists beta_events_name_idx
  on public.beta_events(event_name, created_at desc);

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  page_path text not null check (
    char_length(page_path) between 1 and 240
  ),
  category text not null check (
    category in (
      'bug',
      'confusing',
      'idea',
      'listing',
      'outing',
      'other'
    )
  ),
  rating smallint check (
    rating between 1 and 5
  ),
  message text not null check (
    char_length(message) between 5 and 2000
  ),
  contact_email text,
  permission_to_contact boolean not null default false,
  status text not null default 'new' check (
    status in ('new', 'reviewed', 'planned', 'resolved', 'closed')
  ),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_feedback_contact_consent check (
    contact_email is null or permission_to_contact = true
  )
);

create index if not exists beta_feedback_created_at_idx
  on public.beta_feedback(created_at desc);

create index if not exists beta_feedback_status_idx
  on public.beta_feedback(status, created_at desc);

create or replace function public.set_beta_feedback_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists beta_feedback_set_updated_at
  on public.beta_feedback;

create trigger beta_feedback_set_updated_at
before update on public.beta_feedback
for each row execute function public.set_beta_feedback_updated_at();

alter table public.beta_events enable row level security;
alter table public.beta_feedback enable row level security;

-- No browser-facing policies are intentional. The API uses service_role.
revoke all on table public.beta_events from anon, authenticated;
revoke all on table public.beta_feedback from anon, authenticated;
revoke all on sequence public.beta_events_id_seq from anon, authenticated;

grant all on table public.beta_events to service_role;
grant all on table public.beta_feedback to service_role;
grant usage, select on sequence public.beta_events_id_seq to service_role;
