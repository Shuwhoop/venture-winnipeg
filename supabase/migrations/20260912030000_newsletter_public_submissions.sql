begin;

create table if not exists public.newsletter_public_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null default 'find'
    check (submission_type in ('event', 'place', 'find', 'other')),
  title text not null,
  source_url text,
  when_text text,
  where_text text,
  why_text text not null,
  submitter_name text,
  submitter_email text,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'used', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists newsletter_public_submissions_status_created_idx
  on public.newsletter_public_submissions (status, created_at desc);

alter table public.newsletter_public_submissions enable row level security;
revoke all on table public.newsletter_public_submissions from anon, authenticated;
grant all on table public.newsletter_public_submissions to service_role;

commit;

notify pgrst, 'reload schema';
