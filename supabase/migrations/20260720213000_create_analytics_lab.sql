-- Venture Analytics Lab v0.1
-- Adds durable visitor-level analytics fields and private reporting views.
-- Public browser code still has no direct table access.

alter table public.beta_events
  add column if not exists visitor_id uuid,
  add column if not exists event_version smallint not null default 1,
  add column if not exists client_created_at timestamptz;

create index if not exists beta_events_visitor_created_idx
  on public.beta_events(visitor_id, created_at desc)
  where visitor_id is not null;

create index if not exists beta_events_page_created_idx
  on public.beta_events(page_path, created_at desc);

create index if not exists beta_events_event_version_idx
  on public.beta_events(event_version, created_at desc);

comment on column public.beta_events.visitor_id is
  'Anonymous browser-level identifier. It is not an account ID and must not be joined to advertising profiles.';

comment on column public.beta_events.session_id is
  'Anonymous 30-minute browser session identifier.';

comment on column public.beta_events.client_created_at is
  'Browser timestamp used only for diagnostics. Server created_at remains the source of truth.';

create or replace view public.venture_analytics_sessions
with (security_invoker = true)
as
select
  session_id,
  (
    array_agg(visitor_id order by created_at)
      filter (where visitor_id is not null)
  )[1] as visitor_id,
  min(created_at) as session_started_at,
  max(created_at) as session_ended_at,
  count(*) as event_count,
  count(*) filter (
    where event_name = 'page_view'
  ) as page_view_count,
  (
    array_agg(
      page_path
      order by created_at
    ) filter (
      where event_name in ('session_started', 'page_view')
    )
  )[1] as entry_path,
  max(properties ->> 'deviceClass') as device_class,
  max(properties ->> 'referrerHost') as referrer_host,
  bool_or(event_name = 'outing_generated') as generated_outing,
  bool_or(event_name = 'outing_shared') as shared_outing,
  bool_or(event_name = 'feedback_submitted') as submitted_feedback
from public.beta_events
group by session_id;

create or replace view public.venture_analytics_daily
with (security_invoker = true)
as
select
  date_trunc(
    'day',
    created_at at time zone 'America/Winnipeg'
  )::date as activity_date,
  count(*) filter (
    where event_name = 'page_view'
  ) as page_views,
  count(distinct session_id) as sessions,
  count(
    distinct coalesce(
      visitor_id::text,
      session_id::text
    )
  ) as visitors,
  count(*) filter (
    where event_name = 'listing_detail_opened'
  ) as listing_views,
  count(*) filter (
    where event_name = 'outing_generated'
  ) as outings_generated,
  count(*) filter (
    where event_name = 'outing_shared'
  ) as outings_shared,
  count(*) filter (
    where event_name = 'newsletter_signup'
  ) as newsletter_signups,
  count(*) filter (
    where event_name = 'feedback_submitted'
  ) as feedback_submissions
from public.beta_events
group by 1
order by 1 desc;

revoke all on public.venture_analytics_sessions
  from anon, authenticated;

revoke all on public.venture_analytics_daily
  from anon, authenticated;

grant select on public.venture_analytics_sessions
  to service_role;

grant select on public.venture_analytics_daily
  to service_role;
