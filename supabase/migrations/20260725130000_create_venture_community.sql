-- Venture is Building: monthly community experience foundation.
-- This first release supports curation, RSVP, waitlists, attendance, and operations.
-- It intentionally contains no payment, checkout, fee, refund, or payout tables.

create table if not exists public.community_experiences (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  eyebrow text not null default 'VENTURE IS BUILDING',
  summary text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/Winnipeg',
  neighbourhood text,
  meeting_point text,
  meeting_instructions text,
  capacity smallint not null default 12
    check (capacity between 2 and 200),
  minimum_age smallint
    check (minimum_age is null or minimum_age between 0 and 99),
  estimated_cost_min_cad numeric(10,2)
    check (estimated_cost_min_cad is null or estimated_cost_min_cad >= 0),
  estimated_cost_max_cad numeric(10,2)
    check (estimated_cost_max_cad is null or estimated_cost_max_cad >= 0),
  social_vibe text[] not null default '{}',
  accessibility_notes text,
  dietary_notes text,
  what_to_bring text,
  host_name text,
  host_description text,
  hero_image_url text,
  status text not null default 'draft'
    check (status in ('draft','published','completed','cancelled','archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  check (
    estimated_cost_max_cad is null or
    estimated_cost_min_cad is null or
    estimated_cost_max_cad >= estimated_cost_min_cad
  )
);

create index if not exists community_experiences_public_idx
  on public.community_experiences(status, starts_at);

create table if not exists public.community_experience_stops (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null
    references public.community_experiences(id) on delete cascade,
  position integer not null default 0
    check (position >= 0),
  entity_type text
    check (entity_type is null or entity_type in ('place','event')),
  entity_id uuid,
  listing_slug text,
  listing_name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  neighbourhood text,
  notes text,
  joinable_separately boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_stops_experience_idx
  on public.community_experience_stops(experience_id, position);

create table if not exists public.community_rsvps (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null
    references public.community_experiences(id) on delete cascade,
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  attendee_count smallint not null default 1
    check (attendee_count between 1 and 2),
  status text not null default 'confirmed'
    check (status in ('confirmed','waitlisted','cancelled','attended','no_show')),
  attending_alone boolean not null default true,
  dietary_notes text not null default '',
  accessibility_notes text not null default '',
  community_guidelines_agreed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (experience_id, user_id)
);

create index if not exists community_rsvps_experience_status_idx
  on public.community_rsvps(experience_id, status, created_at);

create index if not exists community_rsvps_user_idx
  on public.community_rsvps(user_id, created_at desc);

create table if not exists public.community_check_ins (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null
    references public.community_experiences(id) on delete cascade,
  rsvp_id uuid not null
    references public.community_rsvps(id) on delete cascade,
  checked_in_by uuid references auth.users(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  notes text,
  unique (experience_id, rsvp_id)
);

drop trigger if exists community_experiences_set_updated_at
  on public.community_experiences;
create trigger community_experiences_set_updated_at
before update on public.community_experiences
for each row execute function public.set_updated_at();

drop trigger if exists community_stops_set_updated_at
  on public.community_experience_stops;
create trigger community_stops_set_updated_at
before update on public.community_experience_stops
for each row execute function public.set_updated_at();

drop trigger if exists community_rsvps_set_updated_at
  on public.community_rsvps;
create trigger community_rsvps_set_updated_at
before update on public.community_rsvps
for each row execute function public.set_updated_at();

alter table public.community_experiences enable row level security;
alter table public.community_experience_stops enable row level security;
alter table public.community_rsvps enable row level security;
alter table public.community_check_ins enable row level security;

drop policy if exists "Public community experiences are readable"
  on public.community_experiences;
create policy "Public community experiences are readable"
on public.community_experiences for select
using (status in ('published','completed'));

drop policy if exists "Public community stops are readable"
  on public.community_experience_stops;
create policy "Public community stops are readable"
on public.community_experience_stops for select
using (
  exists (
    select 1
    from public.community_experiences as experience
    where experience.id = experience_id
      and experience.status in ('published','completed')
  )
);

drop policy if exists "Users can read their own community RSVPs"
  on public.community_rsvps;
create policy "Users can read their own community RSVPs"
on public.community_rsvps for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can cancel their own community RSVPs"
  on public.community_rsvps;
create policy "Users can cancel their own community RSVPs"
on public.community_rsvps for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.rsvp_to_community_experience(
  p_experience_id uuid,
  p_attendee_count integer default 1,
  p_attending_alone boolean default true,
  p_dietary_notes text default '',
  p_accessibility_notes text default '',
  p_guidelines_agreed boolean default false
)
returns table (
  rsvp_status text,
  remaining_spots integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  experience_record public.community_experiences%rowtype;
  confirmed_people integer := 0;
  next_status text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_attendee_count < 1 or p_attendee_count > 2 then
    raise exception 'Venture currently supports one or two attendees per RSVP.';
  end if;

  if not p_guidelines_agreed then
    raise exception 'Community guidelines must be accepted.';
  end if;

  select *
  into experience_record
  from public.community_experiences
  where id = p_experience_id
  for update;

  if experience_record.id is null
     or experience_record.status <> 'published' then
    raise exception 'This community experience is not open for RSVP.';
  end if;

  if experience_record.starts_at <= now() then
    raise exception 'RSVPs are closed because this experience has started.';
  end if;

  select coalesce(sum(attendee_count), 0)::integer
  into confirmed_people
  from public.community_rsvps
  where experience_id = p_experience_id
    and status = 'confirmed'
    and user_id <> current_user_id;

  next_status :=
    case
      when confirmed_people + p_attendee_count <= experience_record.capacity
        then 'confirmed'
      else 'waitlisted'
    end;

  insert into public.community_rsvps (
    experience_id,
    user_id,
    attendee_count,
    status,
    attending_alone,
    dietary_notes,
    accessibility_notes,
    community_guidelines_agreed,
    updated_at
  )
  values (
    p_experience_id,
    current_user_id,
    p_attendee_count,
    next_status,
    p_attending_alone,
    left(coalesce(p_dietary_notes, ''), 500),
    left(coalesce(p_accessibility_notes, ''), 500),
    true,
    now()
  )
  on conflict (experience_id, user_id)
  do update set
    attendee_count = excluded.attendee_count,
    status = excluded.status,
    attending_alone = excluded.attending_alone,
    dietary_notes = excluded.dietary_notes,
    accessibility_notes = excluded.accessibility_notes,
    community_guidelines_agreed = true,
    updated_at = now();

  return query
  select
    next_status,
    greatest(
      experience_record.capacity -
      confirmed_people -
      case when next_status = 'confirmed' then p_attendee_count else 0 end,
      0
    );
end;
$$;

create or replace function public.cancel_community_rsvp(
  p_experience_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.community_rsvps
  set
    status = 'cancelled',
    updated_at = now()
  where experience_id = p_experience_id
    and user_id = auth.uid();
end;
$$;

grant select
  on table public.community_experiences,
           public.community_experience_stops
  to anon, authenticated;

grant select
  on table public.community_rsvps
  to authenticated;

grant execute
  on function public.rsvp_to_community_experience(
    uuid, integer, boolean, text, text, boolean
  )
  to authenticated;

grant execute
  on function public.cancel_community_rsvp(uuid)
  to authenticated;

comment on table public.community_experiences is
  'Monthly curated Venture is Building community experiences. No payments are processed in this release.';

comment on table public.community_rsvps is
  'Private RSVP and waitlist records for Venture community experiences.';

-- Server-side Venture admin operations need explicit table grants.
grant usage on schema public
  to service_role;

grant select, insert, update, delete
  on table public.community_experiences,
           public.community_experience_stops,
           public.community_rsvps,
           public.community_check_ins
  to service_role;

grant execute
  on function public.rsvp_to_community_experience(
    uuid, integer, boolean, text, text, boolean
  )
  to service_role;

grant execute
  on function public.cancel_community_rsvp(uuid)
  to service_role;
