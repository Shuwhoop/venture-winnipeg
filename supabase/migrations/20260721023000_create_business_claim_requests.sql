create table if not exists public.business_claim_requests (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  claimant_name text not null,
  claimant_role text not null check (
    claimant_role in (
      'owner',
      'manager',
      'marketing',
      'authorized_representative',
      'other'
    )
  ),
  business_email citext not null,
  business_phone text,
  official_website text not null,
  evidence text not null,
  source text not null default 'public_listing',
  status text not null default 'pending' check (
    status in (
      'pending',
      'approved',
      'rejected',
      'withdrawn'
    )
  ),
  reviewed_by uuid references auth.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists business_claim_requests_queue_idx
  on public.business_claim_requests(status, created_at desc);

create unique index if not exists business_claim_requests_pending_email_idx
  on public.business_claim_requests(place_id, lower(business_email::text))
  where status = 'pending';

alter table public.business_claim_requests enable row level security;

revoke all on table public.business_claim_requests
  from anon, authenticated;

comment on table public.business_claim_requests is
  'Unverified public claim requests. Approval verifies a relationship but does not affect organic ranking.';
