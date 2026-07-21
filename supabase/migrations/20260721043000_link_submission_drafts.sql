-- Link moderation submissions to editable draft listings before publication.
-- This keeps the moderation queue connected to the full listing editor.

alter table public.listing_submissions
  add column if not exists linked_entity_type text,
  add column if not exists linked_entity_id uuid;

alter table public.listing_submissions
  drop constraint if exists listing_submissions_linked_entity_type_check;

alter table public.listing_submissions
  add constraint listing_submissions_linked_entity_type_check
  check (
    linked_entity_type is null
    or linked_entity_type in ('place', 'event')
  );

alter table public.listing_submissions
  drop constraint if exists listing_submissions_linked_entity_pair_check;

alter table public.listing_submissions
  add constraint listing_submissions_linked_entity_pair_check
  check (
    (
      linked_entity_type is null
      and linked_entity_id is null
    )
    or
    (
      linked_entity_type is not null
      and linked_entity_id is not null
    )
  );

update public.listing_submissions
set
  linked_entity_type = approved_entity_type,
  linked_entity_id = approved_entity_id
where linked_entity_id is null
  and approved_entity_id is not null;

create index if not exists listing_submissions_linked_entity_idx
on public.listing_submissions(
  linked_entity_type,
  linked_entity_id
)
where linked_entity_id is not null;

comment on column public.listing_submissions.linked_entity_type is
  'Draft or published Venture entity connected to this moderation submission.';

comment on column public.listing_submissions.linked_entity_id is
  'Entity ID used to reopen the full listing editor without creating duplicates.';

notify pgrst, 'reload schema';
