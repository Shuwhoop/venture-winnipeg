grant usage
on schema public
to service_role;

grant select, insert, update
on table public.places
to service_role;

grant select, insert, update
on table public.sources
to service_role;

grant select, insert, update, delete
on table public.listing_sources
to service_role;

notify pgrst, 'reload schema';