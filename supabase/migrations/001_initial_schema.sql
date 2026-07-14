-- Venture MVP schema v0.1
-- Run through the Supabase SQL editor or migration tooling.

create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists citext;

create type public.listing_status as enum ('draft','published','cancelled','expired','temporarily_closed','permanently_closed','archived');
create type public.verification_status as enum ('official_source','verified_venture','verified_business','community_reported','unverified');
create type public.place_type as enum ('restaurant','cafe','bakery_dessert','bar_pub','brewery','food_truck','fast_casual','fine_dining','late_night_food','market','event_venue','activity','attraction');
create type public.source_type as enum ('official_website','official_social','organizer_submission','business_submission','licensed_api','open_data','community_submission','manual_research');
create type public.rights_basis as enum ('direct_permission','contract','api_terms','open_licence','public_domain','link_only','unknown');
create type public.event_price_type as enum ('free','fixed','range','donation','unknown');
create type public.report_status as enum ('open','triaged','investigating','resolved','rejected');
create type public.subscriber_status as enum ('pending_double_opt_in','active','unsubscribed','bounced','complained');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_city text not null default 'Winnipeg',
  interests text[] not null default '{}',
  dietary_preferences text[] not null default '{}',
  accessibility_preferences text[] not null default '{}',
  default_budget_cad numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type public.source_type not null,
  base_url text,
  rights_basis public.rights_basis not null default 'unknown',
  terms_url text,
  attribution_text text,
  caching_limit text,
  retention_notes text,
  deletion_obligations text,
  active boolean not null default true,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  place_type public.place_type not null,
  name text not null,
  short_description text not null,
  full_description text,
  primary_category text not null,
  secondary_categories text[] not null default '{}',
  tags text[] not null default '{}',
  address_line1 text not null,
  address_line2 text,
  city text not null default 'Winnipeg',
  province text not null default 'Manitoba',
  postal_code text,
  neighbourhood text,
  location geography(point, 4326) not null,
  official_phone text,
  official_email text,
  official_website text,
  price_level smallint check (price_level between 1 and 4),
  cuisine_primary text,
  cuisine_secondary text[] not null default '{}',
  weekly_hours jsonb not null default '{}'::jsonb,
  special_hours jsonb not null default '[]'::jsonb,
  open_status text not null default 'unknown',
  menu_url text,
  reservation_url text,
  takeout_available boolean,
  delivery_available boolean,
  dietary_options text[] not null default '{}',
  atmosphere_tags text[] not null default '{}',
  good_for text[] not null default '{}',
  accessibility_notes text,
  parking_notes text,
  transit_notes text,
  google_place_id text,
  google_rating numeric(2,1) check (google_rating between 0 and 5),
  google_rating_count integer check (google_rating_count >= 0),
  google_content_checked_at timestamptz,
  status public.listing_status not null default 'draft',
  verification_status public.verification_status not null default 'unverified',
  warning_message text,
  source_checked_at timestamptz,
  last_verified_at timestamptz,
  freshness_expires_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index places_geo_idx on public.places using gist(location);
create index places_published_idx on public.places(status, verification_status, freshness_expires_at);
create index places_category_idx on public.places(primary_category);
create index places_tags_idx on public.places using gin(tags);
create index places_search_idx on public.places using gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(short_description,'') || ' ' || coalesce(primary_category,'')));

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text not null,
  full_description text,
  primary_category text not null,
  secondary_categories text[] not null default '{}',
  tags text[] not null default '{}',
  venue_id uuid references public.places(id) on delete restrict,
  organizer_name text not null,
  organizer_website text,
  start_at timestamptz not null,
  end_at timestamptz,
  doors_at timestamptz,
  timezone text not null default 'America/Winnipeg',
  recurrence_rule text,
  price_type public.event_price_type not null default 'unknown',
  minimum_price_cad numeric(10,2),
  maximum_price_cad numeric(10,2),
  fees_included boolean,
  ticket_url text,
  ticket_status text not null default 'unknown',
  age_minimum smallint check (age_minimum >= 0),
  age_label text not null default 'unknown',
  indoor_outdoor text not null default 'unknown',
  accessibility_notes text,
  parking_notes text,
  transit_notes text,
  image_url text,
  image_rights_notes text,
  status public.listing_status not null default 'draft',
  verification_status public.verification_status not null default 'unverified',
  warning_message text,
  source_checked_at timestamptz,
  cancellation_checked_at timestamptz,
  freshness_expires_at timestamptz,
  expires_at timestamptz not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at is null or end_at >= start_at),
  check (maximum_price_cad is null or minimum_price_cad is null or maximum_price_cad >= minimum_price_cad)
);

create index events_start_idx on public.events(start_at, status);
create index events_venue_idx on public.events(venue_id);
create index events_category_idx on public.events(primary_category);
create index events_tags_idx on public.events using gin(tags);
create index events_search_idx on public.events using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(short_description,'') || ' ' || coalesce(primary_category,'')));

create table public.listing_sources (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('place','event')),
  entity_id uuid not null,
  source_id uuid not null references public.sources(id) on delete restrict,
  source_url text not null,
  is_primary boolean not null default false,
  field_coverage jsonb not null default '{}'::jsonb,
  extracted_at timestamptz,
  last_checked_at timestamptz,
  legal_notes text,
  created_at timestamptz not null default now()
);
create index listing_sources_entity_idx on public.listing_sources(entity_type, entity_id);

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('place','event')),
  entity_id uuid not null,
  status public.verification_status not null,
  method text not null,
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz not null default now(),
  expires_at timestamptz,
  notes text
);
create index verifications_entity_idx on public.verifications(entity_type, entity_id, checked_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  entity_type text not null check (entity_type in ('place','event')),
  entity_id uuid not null,
  reason text not null,
  details text,
  source_url text,
  status public.report_status not null default 'open',
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_queue_idx on public.reports(status, created_at);

create table public.saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('place','event','itinerary')),
  entity_id uuid not null,
  collection_name text not null default 'Saved',
  created_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

create table public.business_claims (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  claimant_id uuid not null references auth.users(id) on delete cascade,
  verification_method text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','revoked')),
  evidence jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(place_id, claimant_id)
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  interests text[] not null default '{}',
  preferred_neighbourhoods text[] not null default '{}',
  dietary_preferences text[] not null default '{}',
  frequency text not null default 'weekly' check (frequency = 'weekly'),
  status public.subscriber_status not null default 'pending_double_opt_in',
  consented_at timestamptz not null,
  consent_text_version text not null,
  consent_source text not null,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  source text,
  created_at timestamptz not null default now()
);
create index audit_entity_idx on public.audit_log(entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger sources_set_updated_at before update on public.sources for each row execute function public.set_updated_at();
create trigger places_set_updated_at before update on public.places for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger newsletter_set_updated_at before update on public.newsletter_subscribers for each row execute function public.set_updated_at();

create or replace function public.search_nearby_places(
  user_lat double precision,
  user_lng double precision,
  radius_metres integer default 10000,
  result_limit integer default 50
)
returns table (
  id uuid,
  slug text,
  name text,
  place_type public.place_type,
  distance_metres double precision,
  verification_status public.verification_status,
  freshness_expires_at timestamptz
)
language sql
stable
security invoker
as $$
  select
    p.id,
    p.slug,
    p.name,
    p.place_type,
    st_distance(p.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) as distance_metres,
    p.verification_status,
    p.freshness_expires_at
  from public.places p
  where p.status = 'published'
    and st_dwithin(p.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, radius_metres)
  order by p.location <-> st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
  limit greatest(1, least(result_limit, 100));
$$;

-- Row-level security. Public users can read published listings, but cannot mutate core data.
alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.places enable row level security;
alter table public.events enable row level security;
alter table public.listing_sources enable row level security;
alter table public.verifications enable row level security;
alter table public.reports enable row level security;
alter table public.saves enable row level security;
alter table public.business_claims enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.audit_log enable row level security;

create policy "Published places are publicly readable"
on public.places for select
using (status = 'published');

create policy "Published events are publicly readable"
on public.events for select
using (status = 'published' and expires_at > now());

create policy "Active source summaries are publicly readable"
on public.sources for select
using (active = true);

create policy "Listing sources for published content are readable"
on public.listing_sources for select
using (
  (entity_type = 'place' and exists (select 1 from public.places p where p.id = entity_id and p.status = 'published'))
  or
  (entity_type = 'event' and exists (select 1 from public.events e where e.id = entity_id and e.status = 'published' and e.expires_at > now()))
);

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can insert their own saves"
on public.saves for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can read their own saves"
on public.saves for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own saves"
on public.saves for delete
to authenticated
using (auth.uid() = user_id);

create policy "Authenticated users can submit reports"
on public.reports for insert
to authenticated
with check (auth.uid() = reporter_id);

create policy "Users can read their own reports"
on public.reports for select
to authenticated
using (auth.uid() = reporter_id);

create policy "Authenticated users can submit business claims"
on public.business_claims for insert
to authenticated
with check (auth.uid() = claimant_id);

create policy "Users can read their own business claims"
on public.business_claims for select
to authenticated
using (auth.uid() = claimant_id);

-- Newsletter writes must go through a trusted server route using the service-role key.
-- There is intentionally no public policy for newsletter_subscribers or audit_log.
-- Explicit Data API privileges.
-- Required because automatic exposure of new tables is disabled.

grant usage on schema public to anon, authenticated;

-- Public listing discovery.
grant select on table public.places to anon, authenticated;
grant select on table public.events to anon, authenticated;

-- Nearby place search.
grant execute on function public.search_nearby_places(
  double precision,
  double precision,
  integer,
  integer
) to anon, authenticated;

-- Signed-in user features.
grant select, update on table public.profiles to authenticated;

grant select, insert, delete
on table public.saves
to authenticated;

grant select, insert
on table public.reports
to authenticated;

grant select, insert
on table public.business_claims
to authenticated;

-- Keep sensitive and internal tables inaccessible from client applications.
revoke all on table public.newsletter_subscribers from anon, authenticated;
revoke all on table public.audit_log from anon, authenticated;
revoke all on table public.verifications from anon, authenticated;
revoke all on table public.sources from anon, authenticated;
revoke all on table public.listing_sources from anon, authenticated;