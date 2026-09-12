begin;

alter table public.newsletter_issue_items
  add column if not exists event_date date,
  add column if not exists start_time time without time zone,
  add column if not exists end_time time without time zone,
  add column if not exists venue_name text;

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'newsletter-images',
  'newsletter-images',
  true
)
on conflict (id) do update
set public = excluded.public;

commit;

notify pgrst, 'reload schema';
