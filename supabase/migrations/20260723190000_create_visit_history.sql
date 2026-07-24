-- Venture private visit history and New to Me personalization.
-- Guests keep visits locally. Signed-in users can only access their own rows.

create table if not exists public.user_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  visit_id text not null,
  listing_type text not null
    check (listing_type in ('event', 'restaurant')),
  listing_id text not null,
  listing_slug text not null,
  listing_key text not null,
  listing_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(listing_snapshot) = 'object'),
  event_occurrence_key text,
  visited_at timestamptz not null default now(),
  source text not null default 'manual'
    check (source in ('manual', 'outing_complete', 'imported')),
  outing_id text,
  would_return boolean,
  personal_rating smallint
    check (
      personal_rating is null or
      personal_rating between 1 and 5
    ),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, visit_id)
);

create index if not exists user_visits_user_visited_idx
  on public.user_visits(user_id, visited_at desc);

create index if not exists user_visits_user_listing_idx
  on public.user_visits(user_id, listing_key);

create index if not exists user_visits_user_occurrence_idx
  on public.user_visits(user_id, event_occurrence_key)
  where event_occurrence_key is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_visits_set_updated_at
  on public.user_visits;
create trigger user_visits_set_updated_at
before update on public.user_visits
for each row execute function public.set_updated_at();

alter table public.user_visits enable row level security;

drop policy if exists "Users can read their visit history" on public.user_visits;
create policy "Users can read their visit history"
on public.user_visits for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their visit history" on public.user_visits;
create policy "Users can create their visit history"
on public.user_visits for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their visit history" on public.user_visits;
create policy "Users can update their visit history"
on public.user_visits for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their visit history" on public.user_visits;
create policy "Users can delete their visit history"
on public.user_visits for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete
  on table public.user_visits
  to authenticated;

comment on table public.user_visits is
  'Private restaurants and event occurrences Venture users confirm they attended.';
