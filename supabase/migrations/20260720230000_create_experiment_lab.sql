-- Venture Experiment and Recommendation Lab v0.1
-- Private experiment registry plus indexes for exposure and recommendation analysis.
-- Anonymous assignments are deterministic and are only persisted when an exposure occurs.

create table if not exists public.venture_experiments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (
    slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'
  ),
  name text not null check (
    char_length(name) between 3 and 140
  ),
  hypothesis text not null check (
    char_length(hypothesis) between 5 and 1000
  ),
  status text not null default 'draft' check (
    status in ('draft', 'running', 'paused', 'archived')
  ),
  variants jsonb not null check (
    jsonb_typeof(variants) = 'array' and
    jsonb_array_length(variants) between 2 and 8
  ),
  traffic_percentage smallint not null default 100 check (
    traffic_percentage between 0 and 100
  ),
  assignment_version integer not null default 1 check (
    assignment_version between 1 and 100000
  ),
  primary_event text not null check (
    char_length(primary_event) between 2 and 60
  ),
  guardrail_events jsonb not null default '[]'::jsonb check (
    jsonb_typeof(guardrail_events) = 'array'
  ),
  minimum_sample_size integer not null default 40 check (
    minimum_sample_size between 10 and 1000000
  ),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venture_experiments_schedule check (
    ends_at is null or
    starts_at is null or
    ends_at > starts_at
  )
);

create index if not exists venture_experiments_status_idx
  on public.venture_experiments(status, updated_at desc);

create index if not exists beta_events_experiment_exposure_idx
  on public.beta_events(
    (properties ->> 'experimentSlug'),
    (properties ->> 'variant'),
    created_at desc
  )
  where event_name = 'experiment_exposure';

create index if not exists beta_events_recommendation_version_idx
  on public.beta_events(
    (properties ->> 'recommendationVersion'),
    created_at desc
  )
  where event_name in (
    'outing_generated',
    'outing_saved',
    'outing_shared',
    'outing_stop_replaced',
    'outing_stop_added'
  );

create or replace function public.set_venture_experiment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists venture_experiments_set_updated_at
  on public.venture_experiments;

create trigger venture_experiments_set_updated_at
before update on public.venture_experiments
for each row execute function public.set_venture_experiment_updated_at();

alter table public.venture_experiments enable row level security;

revoke all on table public.venture_experiments
  from anon, authenticated;

grant all on table public.venture_experiments
  to service_role;

insert into public.venture_experiments (
  slug,
  name,
  hypothesis,
  status,
  variants,
  traffic_percentage,
  assignment_version,
  primary_event,
  guardrail_events,
  minimum_sample_size,
  starts_at,
  created_by
)
values (
  'outing-results-presentation-v1',
  'Outing results presentation',
  'Showing a compact itinerary preview before the route map will help visitors understand the plan sooner and increase outing saves without increasing negative feedback.',
  'running',
  '[
    {
      "key": "control",
      "label": "Map first",
      "weight": 50
    },
    {
      "key": "summary_first",
      "label": "Itinerary preview first",
      "weight": 50
    }
  ]'::jsonb,
  100,
  1,
  'outing_saved',
  '[
    "outing_shared",
    "outing_stop_replaced",
    "feedback_submitted"
  ]'::jsonb,
  40,
  now(),
  'system_seed'
)
on conflict (slug) do nothing;
