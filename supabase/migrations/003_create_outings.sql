-- Persistent Venture outings.
-- Supports:
-- 1. Solo and Group planning modes
-- 2. Saving generated plans
-- 3. Private owner access
-- 4. Public read-only sharing through a secure share code

create table public.outings (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid
    default auth.uid()
    references auth.users(id)
    on delete set null,

  share_code text
    not null
    unique
    default lower(
      substr(
        encode(
          extensions.gen_random_bytes(10),
          'hex'
        ),
        1,
        12
      )
    ),

  planning_mode text
    not null
    default 'solo'
    check (
      planning_mode in (
        'solo',
        'group'
      )
    ),

  title text
    not null
    default 'My Venture outing',

  city text
    not null
    default 'Winnipeg',

  timezone text
    not null
    default 'America/Winnipeg',

  scheduled_for timestamptz,

  duration_minutes integer
    check (
      duration_minutes is null
      or (
        duration_minutes >= 30
        and duration_minutes <= 1440
      )
    ),

  budget_cad numeric(10, 2)
    check (
      budget_cad is null
      or budget_cad >= 0
    ),

  builder_answers jsonb
    not null
    default '{}'::jsonb
    check (
      jsonb_typeof(builder_answers)
      = 'object'
    ),

  generated_plan jsonb
    not null
    default '{}'::jsonb
    check (
      jsonb_typeof(generated_plan)
      = 'object'
    ),

  generator_version text
    not null
    default 'v1',

  visibility text
    not null
    default 'private'
    check (
      visibility in (
        'private',
        'shared'
      )
    ),

  status text
    not null
    default 'draft'
    check (
      status in (
        'draft',
        'ready',
        'archived'
      )
    ),

  shared_at timestamptz,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create index outings_owner_idx
on public.outings(
  owner_id,
  created_at desc
);


create index outings_shared_idx
on public.outings(
  visibility,
  status,
  updated_at desc
);


create index outings_planning_mode_idx
on public.outings(
  planning_mode,
  created_at desc
);


create trigger outings_set_updated_at
before update
on public.outings
for each row
execute function public.set_updated_at();


alter table public.outings
enable row level security;


-- Signed-in users can create outings
-- belonging to their own account.

create policy "Users can create their own outings"
on public.outings
for insert
to authenticated
with check (
  auth.uid() = owner_id
);


-- Owners can read all of their outings,
-- including private ones.

create policy "Users can read their own outings"
on public.outings
for select
to authenticated
using (
  auth.uid() = owner_id
);


-- Owners can update their outings.

create policy "Users can update their own outings"
on public.outings
for update
to authenticated
using (
  auth.uid() = owner_id
)
with check (
  auth.uid() = owner_id
);


-- Owners can delete their outings.

create policy "Users can delete their own outings"
on public.outings
for delete
to authenticated
using (
  auth.uid() = owner_id
);


-- Do not expose the full outings table publicly.
-- Shared outings are accessed through the
-- safe function below.

revoke all
on table public.outings
from anon,
authenticated;


grant select,
insert,
update,
delete
on table public.outings
to authenticated;


-- Public read-only function for shared links.
-- This deliberately does not expose owner_id.

create or replace function public.get_shared_outing(
  requested_share_code text
)
returns table (
  id uuid,
  share_code text,
  planning_mode text,
  title text,
  city text,
  timezone text,
  scheduled_for timestamptz,
  duration_minutes integer,
  budget_cad numeric,
  builder_answers jsonb,
  generated_plan jsonb,
  generator_version text,
  status text,
  shared_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    outing.id,
    outing.share_code,
    outing.planning_mode,
    outing.title,
    outing.city,
    outing.timezone,
    outing.scheduled_for,
    outing.duration_minutes,
    outing.budget_cad,
    outing.builder_answers,
    outing.generated_plan,
    outing.generator_version,
    outing.status,
    outing.shared_at,
    outing.created_at,
    outing.updated_at
  from public.outings as outing
  where outing.share_code =
    requested_share_code

    and outing.visibility =
      'shared'

    and outing.status =
      'ready'

  limit 1;
$$;


revoke all
on function public.get_shared_outing(text)
from public;


grant execute
on function public.get_shared_outing(text)
to anon,
authenticated;


comment on table public.outings is
  'Generated Solo and Group Venture outing plans.';


comment on column public.outings.builder_answers is
  'Answers submitted through the Build an Outing wizard.';


comment on column public.outings.generated_plan is
  'The complete generated itinerary used by the results and shared outing pages.';


comment on column public.outings.share_code is
  'Random code used for public read-only shared outing links.';