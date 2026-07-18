-- The trusted server route creates shared outings
-- and reads the generated share_code.

grant select, insert
on table public.outings
to service_role;

notify pgrst, 'reload schema';