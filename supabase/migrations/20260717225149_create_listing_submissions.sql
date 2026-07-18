-- Stores restaurant and event submissions
-- before they are reviewed and published.

create table public.listing_submissions (
  id uuid primary key
    default gen_random_uuid(),

  submission_type text not null
    check (
      submission_type in (
        'restaurant',
        'event'
      )
    ),

  status text not null
    default 'pending'
    check (
      status in (
        'pending',
        'in_review',
        'needs_changes',
        'approved',
        'rejected'
      )
    ),

  submitter_name text not null,
  submitter_email citext not null,
  submitter_phone text,
  organization_name text,

  submitter_relationship text not null
    default 'community_member'
    check (
      submitter_relationship in (
        'owner',
        'employee',
        'organizer',
        'representative',
        'community_member',
        'other'
      )
    ),

  payload jsonb not null,

  source_url text,
  submitter_notes text,

  consent_to_contact boolean
    not null
    default false,

  terms_accepted boolean
    not null,

  submitted_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_by uuid
    references auth.users(id)
    on delete set null,

  review_notes text,

  approved_entity_type text
    check (
      approved_entity_type is null
      or approved_entity_type in (
        'place',
        'event'
      )
    ),

  approved_entity_id uuid,

  submission_channel text not null
    default 'public_form'
    check (
      submission_channel in (
        'public_form',
        'admin_entry',
        'organizer_outreach',
        'business_outreach',
        'import'
      )
    ),

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  reviewed_at timestamptz,

  check (
    jsonb_typeof(payload) =
    'object'
  ),

  check (
    terms_accepted = true
  ),

  check (
    (
      approved_entity_type is null
      and approved_entity_id is null
    )
    or
    (
      approved_entity_type is not null
      and approved_entity_id is not null
    )
  )
);


create index
listing_submissions_queue_idx
on public.listing_submissions(
  status,
  created_at
);


create index
listing_submissions_type_idx
on public.listing_submissions(
  submission_type,
  status
);


create trigger
listing_submissions_set_updated_at
before update
on public.listing_submissions
for each row
execute function public.set_updated_at();


alter table
public.listing_submissions
enable row level security;


-- Public submissions will pass through
-- a trusted Next.js server endpoint.
-- Browsers never receive direct table access.

revoke all
on table public.listing_submissions
from anon, authenticated;


grant usage
on schema public
to service_role;


grant select, insert, update, delete
on table public.listing_submissions
to service_role;


notify pgrst, 'reload schema';