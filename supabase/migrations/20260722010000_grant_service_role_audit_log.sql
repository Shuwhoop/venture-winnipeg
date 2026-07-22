grant usage
on schema public
to service_role;

grant select, insert
on table public.audit_log
to service_role;

grant usage, select
on sequence public.audit_log_id_seq
to service_role;

notify pgrst, 'reload schema';
