grant execute
on function public.get_shared_outing(text)
to service_role;

notify pgrst, 'reload schema';