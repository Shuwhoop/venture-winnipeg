alter table public.places
  add column if not exists longitude double precision
    generated always as (
      st_x(location::geometry)
    ) stored,

  add column if not exists latitude double precision
    generated always as (
      st_y(location::geometry)
    ) stored;

comment on column public.places.longitude is
  'Longitude generated from the PostGIS location point.';

comment on column public.places.latitude is
  'Latitude generated from the PostGIS location point.';