-- Track automatically imported Overture places
-- without publishing unreviewed records.

alter table public.places
add column if not exists overture_place_id text;

alter table public.places
add column if not exists import_source text;

alter table public.places
add column if not exists imported_at timestamptz;

alter table public.places
add column if not exists source_refreshed_at timestamptz;

alter table public.places
add column if not exists review_status text
not null
default 'not_required';

alter table public.places
add constraint places_review_status_check
check (
  review_status in (
    'not_required',
    'needs_review',
    'approved',
    'rejected'
  )
);

create unique index if not exists
places_overture_place_id_unique
on public.places(overture_place_id)
where overture_place_id is not null;

create index if not exists
places_review_status_idx
on public.places(review_status, status);

grant select, insert, update
on table public.places
to service_role;

notify pgrst, 'reload schema';