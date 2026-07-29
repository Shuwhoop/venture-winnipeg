-- Venture listing photo editor schema safeguard.
-- Adds a reviewed media library for restaurants and events,
-- plus one optional private photo on outside listing submissions.

alter table public.places
  add column if not exists image_url text,
  add column if not exists image_alt_text text,
  add column if not exists image_rights_notes text,
  add column if not exists image_updated_at timestamptz;

alter table public.events
  add column if not exists image_url text,
  add column if not exists image_alt_text text,
  add column if not exists image_rights_notes text,
  add column if not exists image_updated_at timestamptz;

alter table public.listing_submissions
  add column if not exists photo_storage_path text,
  add column if not exists photo_original_name text,
  add column if not exists photo_mime_type text,
  add column if not exists photo_size_bytes integer,
  add column if not exists photo_alt_text text,
  add column if not exists photo_rights_confirmed boolean not null default false,
  add column if not exists photo_rights_note text;

create table if not exists public.listing_media (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('place', 'event')),
  entity_id uuid not null,
  storage_path text not null unique,
  public_url text not null,
  alt_text text not null,
  caption text,
  rights_basis text not null
    check (
      rights_basis in (
        'venture_owned',
        'business_permission',
        'organizer_permission',
        'submitter_owned',
        'licensed',
        'public_domain'
      )
    ),
  rights_notes text,
  source_submission_id uuid
    references public.listing_submissions(id)
    on delete set null,
  uploaded_by uuid
    references auth.users(id)
    on delete set null,
  is_primary boolean not null default true,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_media_entity_idx
  on public.listing_media(entity_type, entity_id, status, created_at desc);

create unique index if not exists listing_media_one_primary_idx
  on public.listing_media(entity_type, entity_id)
  where is_primary = true and status = 'active';

drop trigger if exists listing_media_set_updated_at
  on public.listing_media;

create trigger listing_media_set_updated_at
before update on public.listing_media
for each row
execute function public.set_updated_at();

alter table public.listing_media enable row level security;

revoke all on table public.listing_media from anon, authenticated;
grant select, insert, update, delete on table public.listing_media to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'listing-media',
  'listing-media',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'submission-media',
  'submission-media',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
