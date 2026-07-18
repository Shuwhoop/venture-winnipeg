-- Publish reviewed restaurant and event submissions atomically.
-- These functions are callable only by the trusted service-role client.

create or replace function public.venture_normalize_slug(value text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(
        both '-'
        from regexp_replace(
          lower(coalesce(value, '')),
          '[^a-z0-9]+',
          '-',
          'g'
        )
      ),
      ''
    ),
    'venture-listing'
  );
$$;


create or replace function public.venture_unique_slug(
  target_table text,
  requested_value text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  base_slug text;
  candidate text;
  suffix_number integer := 2;
  already_exists boolean;
begin
  if target_table not in ('places', 'events') then
    raise exception 'Unsupported slug table';
  end if;

  base_slug := left(
    public.venture_normalize_slug(requested_value),
    80
  );

  candidate := base_slug;

  loop
    if target_table = 'places' then
      select exists(
        select 1
        from public.places
        where slug = candidate
      )
      into already_exists;
    else
      select exists(
        select 1
        from public.events
        where slug = candidate
      )
      into already_exists;
    end if;

    if not already_exists then
      return candidate;
    end if;

    candidate :=
      left(base_slug, 70)
      || '-'
      || suffix_number::text;

    suffix_number :=
      suffix_number + 1;

    if suffix_number > 10000 then
      raise exception 'Could not generate a unique slug';
    end if;
  end loop;
end;
$$;


create or replace function public.venture_submission_source_type(
  relationship_value text
)
returns public.source_type
language sql
immutable
as $$
  select case
    when relationship_value = 'organizer'
      then 'organizer_submission'::public.source_type
    when relationship_value in (
      'owner',
      'employee',
      'representative'
    )
      then 'business_submission'::public.source_type
    else 'community_submission'::public.source_type
  end;
$$;


create or replace function public.publish_restaurant_submission(
  p_submission_id uuid,
  p_payload jsonb,
  p_place_type public.place_type,
  p_latitude double precision,
  p_longitude double precision,
  p_review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  submission_record public.listing_submissions%rowtype;
  created_place_id uuid;
  created_source_id uuid;
  created_slug text;
  source_link text;
  now_value timestamptz := now();
  restaurant_name text;
  restaurant_address text;
  restaurant_description text;
  restaurant_category text;
begin
  if p_place_type not in (
    'restaurant',
    'cafe',
    'bakery_dessert',
    'bar_pub',
    'brewery',
    'food_truck',
    'fast_casual',
    'fine_dining',
    'late_night_food',
    'market'
  ) then
    raise exception 'Invalid restaurant place type';
  end if;

  if p_latitude < 49.65
     or p_latitude > 50.15
     or p_longitude < -97.50
     or p_longitude > -96.70 then
    raise exception 'Coordinates must be within the Winnipeg area';
  end if;

  select *
  into submission_record
  from public.listing_submissions
  where id = p_submission_id
    and submission_type = 'restaurant'
    and status in (
      'pending',
      'in_review',
      'needs_changes'
    )
  for update;

  if not found then
    raise exception 'Pending restaurant submission not found';
  end if;

  restaurant_name :=
    nullif(trim(p_payload->>'name'), '');

  restaurant_address :=
    nullif(trim(p_payload->>'addressLine1'), '');

  restaurant_description :=
    nullif(trim(p_payload->>'description'), '');

  restaurant_category :=
    nullif(trim(p_payload->>'category'), '');

  if restaurant_name is null
     or restaurant_address is null
     or restaurant_description is null
     or restaurant_category is null then
    raise exception 'Restaurant name, address, category, and description are required';
  end if;

  if exists(
    select 1
    from public.places
    where lower(trim(name)) =
          lower(restaurant_name)
      and lower(trim(address_line1)) =
          lower(restaurant_address)
      and status <> 'archived'
  ) then
    raise exception 'A matching place already exists';
  end if;

  created_slug :=
    public.venture_unique_slug(
      'places',
      restaurant_name
    );

  insert into public.places (
    slug,
    place_type,
    name,
    short_description,
    full_description,
    primary_category,
    secondary_categories,
    tags,
    address_line1,
    city,
    province,
    neighbourhood,
    location,
    official_phone,
    official_website,
    cuisine_primary,
    cuisine_secondary,
    weekly_hours,
    special_hours,
    open_status,
    dietary_options,
    atmosphere_tags,
    good_for,
    status,
    verification_status,
    warning_message,
    source_checked_at,
    freshness_expires_at,
    published_at,
    review_status
  )
  values (
    created_slug,
    p_place_type,
    restaurant_name,
    restaurant_description,
    null,
    restaurant_category,
    '{}'::text[],
    '{}'::text[],
    restaurant_address,
    'Winnipeg',
    'Manitoba',
    nullif(trim(p_payload->>'neighbourhood'), ''),
    st_setsrid(
      st_makepoint(
        p_longitude,
        p_latitude
      ),
      4326
    )::geography,
    nullif(trim(p_payload->>'phone'), ''),
    nullif(trim(p_payload->>'website'), ''),
    nullif(trim(p_payload->>'cuisine'), ''),
    '{}'::text[],
    '{}'::jsonb,
    '[]'::jsonb,
    'unknown',
    '{}'::text[],
    '{}'::text[],
    '{}'::text[],
    'published',
    'unverified',
    'Basic identity and location were reviewed from a public submission. Hours, pricing, dietary information, accessibility, and current operating status may still require confirmation.',
    now_value,
    now_value + interval '30 days',
    now_value,
    'approved'
  )
  returning id
  into created_place_id;

  source_link :=
    coalesce(
      nullif(trim(submission_record.source_url), ''),
      nullif(trim(p_payload->>'website'), ''),
      'https://venture-winnipeg-two.vercel.app/submit'
    );

  insert into public.sources (
    name,
    source_type,
    base_url,
    rights_basis,
    attribution_text,
    caching_limit,
    retention_notes,
    deletion_obligations,
    active,
    reviewed_at
  )
  values (
    'Venture submission '
      || upper(
        left(
          replace(
            submission_record.id::text,
            '-',
            ''
          ),
          8
        )
      ),
    public.venture_submission_source_type(
      submission_record.submitter_relationship
    ),
    source_link,
    'direct_permission',
    'Submitted directly to Venture and manually reviewed',
    'Store factual listing information and reviewer-approved descriptions.',
    'Retain while the listing remains active or is required for duplicate and audit history.',
    'Process legitimate correction or removal requests.',
    true,
    now_value
  )
  returning id
  into created_source_id;

  insert into public.listing_sources (
    entity_type,
    entity_id,
    source_id,
    source_url,
    is_primary,
    field_coverage,
    extracted_at,
    last_checked_at,
    legal_notes
  )
  values (
    'place',
    created_place_id,
    created_source_id,
    source_link,
    true,
    jsonb_build_object(
      'identity', true,
      'address', true,
      'category', true,
      'description', true,
      'coordinates_reviewed', true
    ),
    now_value,
    now_value,
    'Information was submitted directly to Venture and reviewed before publication.'
  );

  update public.listing_submissions
  set
    payload = p_payload,
    status = 'approved',
    review_notes = p_review_notes,
    approved_entity_type = 'place',
    approved_entity_id = created_place_id,
    reviewed_at = now_value
  where id = submission_record.id;

  insert into public.audit_log (
    entity_type,
    entity_id,
    action,
    new_value,
    source
  )
  values (
    'place',
    created_place_id,
    'published_from_submission',
    jsonb_build_object(
      'submission_id',
      submission_record.id,
      'verification_status',
      'unverified'
    ),
    'admin_submission_review'
  );

  return created_place_id;
end;
$$;


create or replace function public.publish_event_submission(
  p_submission_id uuid,
  p_payload jsonb,
  p_existing_venue_id uuid default null,
  p_venue_latitude double precision default null,
  p_venue_longitude double precision default null,
  p_review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  submission_record public.listing_submissions%rowtype;
  venue_record public.places%rowtype;
  created_venue_id uuid;
  created_event_id uuid;
  created_source_id uuid;
  event_slug text;
  venue_slug text;
  source_link text;
  now_value timestamptz := now();
  event_title text;
  event_description text;
  event_category text;
  event_start timestamptz;
  event_end timestamptz;
  event_expiry timestamptz;
  venue_name_value text;
  venue_address_value text;
  minimum_price numeric(10,2);
  maximum_price numeric(10,2);
  event_price_type public.event_price_type;
begin
  select *
  into submission_record
  from public.listing_submissions
  where id = p_submission_id
    and submission_type = 'event'
    and status in (
      'pending',
      'in_review',
      'needs_changes'
    )
  for update;

  if not found then
    raise exception 'Pending event submission not found';
  end if;

  event_title :=
    nullif(trim(p_payload->>'title'), '');

  event_description :=
    nullif(trim(p_payload->>'description'), '');

  event_category :=
    nullif(trim(p_payload->>'category'), '');

  venue_name_value :=
    nullif(trim(p_payload->>'venueName'), '');

  venue_address_value :=
    nullif(trim(p_payload->>'venueAddress'), '');

  event_start :=
    nullif(trim(p_payload->>'startAt'), '')::timestamptz;

  event_end :=
    nullif(trim(p_payload->>'endAt'), '')::timestamptz;

  minimum_price :=
    nullif(trim(p_payload->>'minimumPriceCad'), '')::numeric;

  maximum_price :=
    nullif(trim(p_payload->>'maximumPriceCad'), '')::numeric;

  if event_title is null
     or event_description is null
     or event_category is null
     or venue_name_value is null
     or venue_address_value is null
     or event_start is null then
    raise exception 'Event title, description, category, venue, address, and start time are required';
  end if;

  if event_end is not null
     and event_end < event_start then
    raise exception 'Event end time cannot be before its start time';
  end if;

  if maximum_price is not null
     and minimum_price is not null
     and maximum_price < minimum_price then
    raise exception 'Maximum event price cannot be below minimum price';
  end if;

  event_expiry :=
    coalesce(
      event_end,
      event_start + interval '6 hours'
    ) + interval '1 day';

  if event_expiry <= now_value then
    raise exception 'The event has already expired';
  end if;

  if p_existing_venue_id is not null then
    select *
    into venue_record
    from public.places
    where id = p_existing_venue_id
      and status in (
        'draft',
        'published'
      );

    if not found then
      raise exception 'Selected venue was not found';
    end if;

    created_venue_id :=
      venue_record.id;
  else
    select *
    into venue_record
    from public.places
    where lower(trim(name)) =
          lower(venue_name_value)
      and lower(trim(address_line1)) =
          lower(venue_address_value)
      and status in (
        'draft',
        'published'
      )
    limit 1;

    if found then
      created_venue_id :=
        venue_record.id;
    else
      if p_venue_latitude is null
         or p_venue_longitude is null
         or p_venue_latitude < 49.65
         or p_venue_latitude > 50.15
         or p_venue_longitude < -97.50
         or p_venue_longitude > -96.70 then
        raise exception 'Valid Winnipeg coordinates are required for a new venue';
      end if;

      venue_slug :=
        public.venture_unique_slug(
          'places',
          venue_name_value
        );

      insert into public.places (
        slug,
        place_type,
        name,
        short_description,
        primary_category,
        secondary_categories,
        tags,
        address_line1,
        city,
        province,
        neighbourhood,
        location,
        official_website,
        cuisine_secondary,
        weekly_hours,
        special_hours,
        open_status,
        dietary_options,
        atmosphere_tags,
        good_for,
        accessibility_notes,
        status,
        verification_status,
        warning_message,
        source_checked_at,
        freshness_expires_at,
        published_at,
        review_status
      )
      values (
        venue_slug,
        'event_venue',
        venue_name_value,
        venue_name_value
          || ' is a Winnipeg event venue added through a reviewed Venture event submission.',
        'Event venue',
        '{}'::text[],
        '{}'::text[],
        venue_address_value,
        'Winnipeg',
        'Manitoba',
        nullif(trim(p_payload->>'neighbourhood'), ''),
        st_setsrid(
          st_makepoint(
            p_venue_longitude,
            p_venue_latitude
          ),
          4326
        )::geography,
        nullif(trim(p_payload->>'organizerWebsite'), ''),
        '{}'::text[],
        '{}'::jsonb,
        '[]'::jsonb,
        'unknown',
        '{}'::text[],
        '{}'::text[],
        '{}'::text[],
        nullif(trim(p_payload->>'accessibilityNotes'), ''),
        'published',
        'unverified',
        'Venue identity and map location were reviewed from a public event submission. Other venue details may require confirmation.',
        now_value,
        now_value + interval '90 days',
        now_value,
        'approved'
      )
      returning id
      into created_venue_id;
    end if;
  end if;

  if exists(
    select 1
    from public.events
    where lower(trim(title)) =
          lower(event_title)
      and venue_id =
          created_venue_id
      and abs(
        extract(
          epoch
          from start_at - event_start
        )
      ) < 7200
      and status <> 'archived'
  ) then
    raise exception 'A likely duplicate event already exists at this venue';
  end if;

  if minimum_price = 0
     and coalesce(maximum_price, 0) = 0 then
    event_price_type :=
      'free';
  elsif minimum_price is not null
        and maximum_price is not null
        and minimum_price <> maximum_price then
    event_price_type :=
      'range';
  elsif minimum_price is not null
        or maximum_price is not null then
    event_price_type :=
      'fixed';
  else
    event_price_type :=
      'unknown';
  end if;

  event_slug :=
    public.venture_unique_slug(
      'events',
      event_title
    );

  insert into public.events (
    slug,
    title,
    short_description,
    full_description,
    primary_category,
    secondary_categories,
    tags,
    venue_id,
    organizer_name,
    organizer_website,
    start_at,
    end_at,
    timezone,
    price_type,
    minimum_price_cad,
    maximum_price_cad,
    ticket_url,
    ticket_status,
    age_label,
    indoor_outdoor,
    accessibility_notes,
    status,
    verification_status,
    warning_message,
    source_checked_at,
    cancellation_checked_at,
    freshness_expires_at,
    expires_at,
    published_at
  )
  values (
    event_slug,
    event_title,
    event_description,
    null,
    event_category,
    '{}'::text[],
    '{}'::text[],
    created_venue_id,
    nullif(trim(p_payload->>'organizerName'), ''),
    nullif(trim(p_payload->>'organizerWebsite'), ''),
    event_start,
    event_end,
    'America/Winnipeg',
    event_price_type,
    minimum_price,
    maximum_price,
    nullif(trim(p_payload->>'ticketUrl'), ''),
    'unknown',
    coalesce(
      nullif(trim(p_payload->>'ageLabel'), ''),
      'unknown'
    ),
    'unknown',
    nullif(trim(p_payload->>'accessibilityNotes'), ''),
    'published',
    'unverified',
    'Basic event details were reviewed from a public submission. Schedules, ticket availability, pricing, and cancellation status may change.',
    now_value,
    now_value,
    least(
      event_start,
      now_value + interval '14 days'
    ),
    event_expiry,
    now_value
  )
  returning id
  into created_event_id;

  source_link :=
    coalesce(
      nullif(trim(submission_record.source_url), ''),
      nullif(trim(p_payload->>'ticketUrl'), ''),
      nullif(trim(p_payload->>'organizerWebsite'), ''),
      'https://venture-winnipeg-two.vercel.app/submit'
    );

  insert into public.sources (
    name,
    source_type,
    base_url,
    rights_basis,
    attribution_text,
    caching_limit,
    retention_notes,
    deletion_obligations,
    active,
    reviewed_at
  )
  values (
    'Venture submission '
      || upper(
        left(
          replace(
            submission_record.id::text,
            '-',
            ''
          ),
          8
        )
      ),
    public.venture_submission_source_type(
      submission_record.submitter_relationship
    ),
    source_link,
    'direct_permission',
    'Submitted directly to Venture and manually reviewed',
    'Store factual event and venue information supplied through the submission form.',
    'Retain while the event or resulting venue remains active or is required for audit history.',
    'Process legitimate correction or removal requests.',
    true,
    now_value
  )
  returning id
  into created_source_id;

  insert into public.listing_sources (
    entity_type,
    entity_id,
    source_id,
    source_url,
    is_primary,
    field_coverage,
    extracted_at,
    last_checked_at,
    legal_notes
  )
  values (
    'event',
    created_event_id,
    created_source_id,
    source_link,
    true,
    jsonb_build_object(
      'identity', true,
      'organizer', true,
      'venue', true,
      'dates', true,
      'ticketing', true
    ),
    now_value,
    now_value,
    'Information was submitted directly to Venture and reviewed before publication.'
  );

  if p_existing_venue_id is null
     and venue_record.id is null then
    insert into public.listing_sources (
      entity_type,
      entity_id,
      source_id,
      source_url,
      is_primary,
      field_coverage,
      extracted_at,
      last_checked_at,
      legal_notes
    )
    values (
      'place',
      created_venue_id,
      created_source_id,
      source_link,
      true,
      jsonb_build_object(
        'identity', true,
        'address', true,
        'coordinates_reviewed', true
      ),
      now_value,
      now_value,
      'Venue information was supplied with a reviewed event submission.'
    );
  end if;

  update public.listing_submissions
  set
    payload = p_payload,
    status = 'approved',
    review_notes = p_review_notes,
    approved_entity_type = 'event',
    approved_entity_id = created_event_id,
    reviewed_at = now_value
  where id = submission_record.id;

  insert into public.audit_log (
    entity_type,
    entity_id,
    action,
    new_value,
    source
  )
  values (
    'event',
    created_event_id,
    'published_from_submission',
    jsonb_build_object(
      'submission_id',
      submission_record.id,
      'venue_id',
      created_venue_id,
      'verification_status',
      'unverified'
    ),
    'admin_submission_review'
  );

  return created_event_id;
end;
$$;


revoke all
on function public.venture_unique_slug(text, text)
from public, anon, authenticated;

revoke all
on function public.publish_restaurant_submission(
  uuid,
  jsonb,
  public.place_type,
  double precision,
  double precision,
  text
)
from public, anon, authenticated;

revoke all
on function public.publish_event_submission(
  uuid,
  jsonb,
  uuid,
  double precision,
  double precision,
  text
)
from public, anon, authenticated;

grant execute
on function public.publish_restaurant_submission(
  uuid,
  jsonb,
  public.place_type,
  double precision,
  double precision,
  text
)
to service_role;

grant execute
on function public.publish_event_submission(
  uuid,
  jsonb,
  uuid,
  double precision,
  double precision,
  text
)
to service_role;

notify pgrst, 'reload schema';
