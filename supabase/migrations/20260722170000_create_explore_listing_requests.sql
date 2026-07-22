begin;

create table if not exists public.explore_listing_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'fulfilled', 'dismissed')),
  search_query text not null,
  requested_type text not null
    check (requested_type in ('restaurant', 'event', 'bar', 'place', 'other')),
  neighbourhood text,
  details text,
  contact_email text,
  source_page text not null default '/explore',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists explore_listing_requests_status_created_idx
on public.explore_listing_requests(status, created_at desc);

create index if not exists explore_listing_requests_search_idx
on public.explore_listing_requests using gin (
  to_tsvector(
    'simple',
    coalesce(search_query, '') || ' ' ||
    coalesce(neighbourhood, '') || ' ' ||
    coalesce(details, '')
  )
);

alter table public.explore_listing_requests enable row level security;

revoke all
on table public.explore_listing_requests
from anon, authenticated;

grant select, insert, update, delete
on table public.explore_listing_requests
to service_role;

commit;

notify pgrst, 'reload schema';
