-- Venture Profiles V1.0
-- Private-first profiles, richer preferences, notification controls, and avatar storage.

begin;

alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists avatar_path text,
  add column if not exists home_neighbourhood text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists profile_visibility text not null default 'private',
  add column if not exists profile_completed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_username_format_check,
  drop constraint if exists profiles_bio_length_check,
  drop constraint if exists profiles_visibility_check;

alter table public.profiles
  add constraint profiles_username_format_check
  check (
    username is null
    or username ~ '^[a-z0-9_]{3,24}$'
  ),
  add constraint profiles_bio_length_check
  check (bio is null or char_length(bio) <= 180),
  add constraint profiles_visibility_check
  check (profile_visibility in ('private', 'public'));

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

create table if not exists public.user_preferences (
  user_id uuid primary key default auth.uid()
    references auth.users(id) on delete cascade,
  interests text[] not null default '{}',
  cuisines text[] not null default '{}',
  dietary_needs text[] not null default '{}',
  accessibility_needs text[] not null default '{}',
  preferred_neighbourhoods text[] not null default '{}',
  outing_styles text[] not null default '{}',
  default_budget text not null default 'under-80'
    check (default_budget in ('free', 'under-40', 'under-80', 'flexible')),
  default_transport text not null default 'any'
    check (default_transport in ('any', 'walk', 'transit', 'bike', 'drive', 'rideshare')),
  default_group_size smallint not null default 2
    check (default_group_size between 1 and 20),
  alcohol_free boolean not null default false,
  likes_free_events boolean not null default true,
  likes_nightlife boolean not null default false,
  likes_outdoors boolean not null default false,
  likes_date_ideas boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key default auth.uid()
    references auth.users(id) on delete cascade,
  weekend_digest boolean not null default false,
  saved_event_reminders boolean not null default false,
  outing_reminders boolean not null default false,
  product_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_venture_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_preferences_set_updated_at
  on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_venture_profile_updated_at();

drop trigger if exists notification_preferences_set_updated_at
  on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_venture_profile_updated_at();

alter table public.user_preferences enable row level security;
alter table public.notification_preferences enable row level security;

-- Profiles stay private in V1.0, even though the schema reserves a later public option.
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can read their preferences" on public.user_preferences;
create policy "Users can read their preferences"
on public.user_preferences for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their preferences" on public.user_preferences;
create policy "Users can create their preferences"
on public.user_preferences for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their preferences" on public.user_preferences;
create policy "Users can update their preferences"
on public.user_preferences for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their preferences" on public.user_preferences;
create policy "Users can delete their preferences"
on public.user_preferences for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read notification preferences" on public.notification_preferences;
create policy "Users can read notification preferences"
on public.notification_preferences for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create notification preferences" on public.notification_preferences;
create policy "Users can create notification preferences"
on public.notification_preferences for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update notification preferences" on public.notification_preferences;
create policy "Users can update notification preferences"
on public.notification_preferences for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete notification preferences" on public.notification_preferences;
create policy "Users can delete notification preferences"
on public.notification_preferences for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update
  on table public.profiles
  to authenticated;

grant select, insert, update, delete
  on table public.user_preferences
  to authenticated;

grant select, insert, update, delete
  on table public.notification_preferences
  to authenticated;

-- Migrate the useful parts of the existing local-sync profile JSON.
insert into public.user_preferences (
  user_id,
  interests,
  preferred_neighbourhoods,
  outing_styles,
  default_budget,
  alcohol_free
)
select
  profile.id,
  coalesce(profile.interests, '{}'),
  case
    when jsonb_typeof(profile.preferences -> 'neighbourhoods') = 'array'
      then array(select jsonb_array_elements_text(profile.preferences -> 'neighbourhoods'))
    else '{}'
  end,
  case
    when jsonb_typeof(profile.preferences -> 'outingStyles') = 'array'
      then array(select jsonb_array_elements_text(profile.preferences -> 'outingStyles'))
    else '{}'
  end,
  case profile.preferences ->> 'budget'
    when 'free' then 'free'
    when 'under-40' then 'under-40'
    when 'under-80' then 'under-80'
    when 'flexible' then 'flexible'
    else 'under-80'
  end,
  case lower(coalesce(profile.preferences ->> 'alcoholFree', 'false'))
    when 'true' then true
    else false
  end
from public.profiles as profile
on conflict (user_id) do nothing;

insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- New accounts receive all three private records in one transaction.
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

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_venture_profile
  on auth.users;
create trigger on_auth_user_created_venture_profile
after insert on auth.users
for each row execute function public.handle_new_venture_user();

-- Backfill any auth accounts created before this migration.
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

insert into public.user_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Private avatar bucket. Users can only work inside avatars/{their-user-id}/.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own avatar" on storage.objects;
create policy "Users can read their own avatar"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

comment on table public.user_preferences is
  'Private Venture personalization settings owned by one authenticated user.';

comment on table public.notification_preferences is
  'Private non-email notification choices owned by one authenticated user.';

commit;

notify pgrst, 'reload schema';
