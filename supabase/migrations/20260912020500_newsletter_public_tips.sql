begin;

create table if not exists public.newsletter_public_tips (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'other'
    check (kind in ('event', 'food', 'nightlife', 'culture', 'community', 'place', 'other')),
  title text not null,
  source_url text,
  note text,
  submitter_name text not null,
  submitter_email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'used', 'passed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_public_tips_status_created_idx
  on public.newsletter_public_tips (status, created_at desc);

alter table public.newsletter_public_tips enable row level security;
revoke all on table public.newsletter_public_tips from anon, authenticated;
grant all on table public.newsletter_public_tips to service_role;

drop trigger if exists newsletter_public_tips_set_updated_at
  on public.newsletter_public_tips;

create trigger newsletter_public_tips_set_updated_at
before update on public.newsletter_public_tips
for each row execute function public.set_updated_at();

commit;

notify pgrst, 'reload schema';
