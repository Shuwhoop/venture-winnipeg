-- Venture public accounts and cross-device sync.
-- Anonymous browsing remains available. Signed-in users can only access their own rows.

alter table public.profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb,
  add column if not exists last_synced_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_preferences_object_check;

alter table public.profiles
  add constraint profiles_preferences_object_check
  check (jsonb_typeof(preferences) = 'object');

create table if not exists public.user_saved_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  listing_type text not null
    check (listing_type in ('event', 'restaurant')),
  listing_id text not null,
  listing_slug text not null,
  listing_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(listing_snapshot) = 'object'),
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, listing_type, listing_id)
);

create index if not exists user_saved_listings_user_saved_idx
  on public.user_saved_listings(user_id, saved_at desc);

create table if not exists public.user_saved_outings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  plan_id text not null,
  plan_snapshot jsonb not null
    check (jsonb_typeof(plan_snapshot) = 'object'),
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_id)
);

create index if not exists user_saved_outings_user_saved_idx
  on public.user_saved_outings(user_id, saved_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_saved_listings_set_updated_at
  on public.user_saved_listings;
create trigger user_saved_listings_set_updated_at
before update on public.user_saved_listings
for each row execute function public.set_updated_at();

drop trigger if exists user_saved_outings_set_updated_at
  on public.user_saved_outings;
create trigger user_saved_outings_set_updated_at
before update on public.user_saved_outings
for each row execute function public.set_updated_at();

alter table public.user_saved_listings enable row level security;
alter table public.user_saved_outings enable row level security;

-- Profiles are created automatically, but this policy also makes client upserts safe.
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

-- Saved listings.
drop policy if exists "Users can read their synced listings" on public.user_saved_listings;
create policy "Users can read their synced listings"
on public.user_saved_listings for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their synced listings" on public.user_saved_listings;
create policy "Users can create their synced listings"
on public.user_saved_listings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their synced listings" on public.user_saved_listings;
create policy "Users can update their synced listings"
on public.user_saved_listings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their synced listings" on public.user_saved_listings;
create policy "Users can delete their synced listings"
on public.user_saved_listings for delete
to authenticated
using (auth.uid() = user_id);

-- Saved outings.
drop policy if exists "Users can read their synced outings" on public.user_saved_outings;
create policy "Users can read their synced outings"
on public.user_saved_outings for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their synced outings" on public.user_saved_outings;
create policy "Users can create their synced outings"
on public.user_saved_outings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their synced outings" on public.user_saved_outings;
create policy "Users can update their synced outings"
on public.user_saved_outings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their synced outings" on public.user_saved_outings;
create policy "Users can delete their synced outings"
on public.user_saved_outings for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete
  on table public.user_saved_listings
  to authenticated;

grant select, insert, update, delete
  on table public.user_saved_outings
  to authenticated;

grant select, insert, update
  on table public.profiles
  to authenticated;

-- Create a profile when a new public account is created.
create or replace function public.handle_new_venture_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    preferences
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Guest'
    ),
    '{}'::jsonb
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_venture_profile
  on auth.users;
create trigger on_auth_user_created_venture_profile
after insert on auth.users
for each row execute function public.handle_new_venture_user();

-- Backfill profiles for accounts that already exist.
insert into public.profiles (
  id,
  display_name,
  preferences
)
select
  user_record.id,
  coalesce(
    nullif(user_record.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(coalesce(user_record.email, ''), '@', 1), ''),
    'Guest'
  ),
  '{}'::jsonb
from auth.users as user_record
on conflict (id) do nothing;

-- Carry any older listing saves into the new sync table. Snapshots are hydrated by Venture.
insert into public.user_saved_listings (
  user_id,
  listing_type,
  listing_id,
  listing_slug,
  listing_snapshot,
  saved_at,
  updated_at
)
select
  save_record.user_id,
  'restaurant',
  save_record.entity_id::text,
  place_record.slug,
  '{}'::jsonb,
  save_record.created_at,
  save_record.created_at
from public.saves as save_record
join public.places as place_record
  on save_record.entity_type = 'place'
  and place_record.id = save_record.entity_id
on conflict (user_id, listing_type, listing_id) do nothing;

insert into public.user_saved_listings (
  user_id,
  listing_type,
  listing_id,
  listing_slug,
  listing_snapshot,
  saved_at,
  updated_at
)
select
  save_record.user_id,
  'event',
  save_record.entity_id::text,
  event_record.slug,
  '{}'::jsonb,
  save_record.created_at,
  save_record.created_at
from public.saves as save_record
join public.events as event_record
  on save_record.entity_type = 'event'
  and event_record.id = save_record.entity_id
on conflict (user_id, listing_type, listing_id) do nothing;

comment on table public.user_saved_listings is
  'Private cross-device copies of listings saved by Venture users.';

comment on table public.user_saved_outings is
  'Private cross-device copies of complete generated Venture outings.';
