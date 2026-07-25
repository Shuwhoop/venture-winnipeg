"use server";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  revalidatePath
} from "next/cache";

import {
  redirect
} from "next/navigation";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  promoteSubmissionPhoto
} from "@/lib/media/listing-photo-server";


type SubmissionType =
  | "restaurant"
  | "event";


const restaurantPlaceTypes =
  new Set([
    "restaurant",
    "cafe",
    "bakery_dessert",
    "bar_pub",
    "brewery",
    "food_truck",
    "fast_casual",
    "fine_dining",
    "late_night_food",
    "market"
  ]);


function requiredText(
  formData: FormData,
  key: string,
  maximumLength: number
): string {
  const value =
    formData.get(key);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${key} is required.`
    );
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}


function optionalText(
  formData: FormData,
  key: string,
  maximumLength: number
): string | null {
  const value =
    formData.get(key);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}


function optionalNumberText(
  formData: FormData,
  key: string
): string | null {
  const value =
    optionalText(
      formData,
      key,
      40
    );

  if (value === null) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    throw new Error(
      `${key} must be a valid non-negative number.`
    );
  }

  return parsed.toFixed(2);
}


function coordinate(
  formData: FormData,
  key: string,
  required: boolean
): number | null {
  const value =
    optionalText(
      formData,
      key,
      40
    );

  if (value === null) {
    if (required) {
      throw new Error(
        `${key} is required.`
      );
    }

    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    throw new Error(
      `${key} must be a valid number.`
    );
  }

  return parsed;
}


function validUrl(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  let parsed: URL;

  try {
    parsed =
      new URL(value);
  } catch {
    throw new Error(
      "A website or source link is not a complete URL."
    );
  }

  if (
    ![
      "http:",
      "https:"
    ].includes(
      parsed.protocol
    )
  ) {
    throw new Error(
      "Website links must use HTTP or HTTPS."
    );
  }

  return value;
}


function restaurantPayload(
  formData: FormData
): Record<string, unknown> {
  return {
    name:
      requiredText(
        formData,
        "name",
        200
      ),

    addressLine1:
      requiredText(
        formData,
        "addressLine1",
        250
      ),

    neighbourhood:
      optionalText(
        formData,
        "neighbourhood",
        120
      ),

    category:
      requiredText(
        formData,
        "category",
        120
      ),

    cuisine:
      optionalText(
        formData,
        "cuisine",
        120
      ),

    website:
      validUrl(
        optionalText(
          formData,
          "website",
          500
        )
      ),

    phone:
      optionalText(
        formData,
        "phone",
        80
      ),

    description:
      requiredText(
        formData,
        "description",
        1500
      ),

    placeType:
      optionalText(
        formData,
        "placeType",
        60
      ) ?? "restaurant",

    latitude:
      coordinate(
        formData,
        "latitude",
        false
      ),

    longitude:
      coordinate(
        formData,
        "longitude",
        false
      ),

    city:
      "Winnipeg",

    province:
      "Manitoba"
  };
}


function eventPayload(
  formData: FormData
): Record<string, unknown> {
  const startLocal =
    requiredText(
      formData,
      "startAt",
      16
    );

  const endLocal =
    optionalText(
      formData,
      "endAt",
      16
    );

  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(
      startLocal
    ) ||
    (
      endLocal &&
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(
        endLocal
      )
    )
  ) {
    throw new Error(
      "The event dates are invalid."
    );
  }

  const startAt =
    winnipegLocalToIso(
      startLocal
    );

  const endAt =
    endLocal
      ? winnipegLocalToIso(
          endLocal
        )
      : null;

  if (
    endAt &&
    endAt < startAt
  ) {
    throw new Error(
      "The event end time cannot be before its start time."
    );
  }

  const minimumPriceCad =
    optionalNumberText(
      formData,
      "minimumPriceCad"
    );

  const maximumPriceCad =
    optionalNumberText(
      formData,
      "maximumPriceCad"
    );

  if (
    minimumPriceCad !== null &&
    maximumPriceCad !== null &&
    Number(maximumPriceCad) <
      Number(minimumPriceCad)
  ) {
    throw new Error(
      "The maximum price cannot be lower than the minimum price."
    );
  }

  return {
    title:
      requiredText(
        formData,
        "title",
        200
      ),

    description:
      requiredText(
        formData,
        "description",
        2000
      ),

    category:
      requiredText(
        formData,
        "category",
        120
      ),

    organizerName:
      requiredText(
        formData,
        "organizerName",
        200
      ),

    organizerWebsite:
      validUrl(
        optionalText(
          formData,
          "organizerWebsite",
          500
        )
      ),

    venueName:
      requiredText(
        formData,
        "venueName",
        200
      ),

    venueAddress:
      requiredText(
        formData,
        "venueAddress",
        250
      ),

    neighbourhood:
      optionalText(
        formData,
        "neighbourhood",
        120
      ),

    startAt,
    endAt,

    existingVenueId:
      optionalText(
        formData,
        "existingVenueId",
        80
      ),

    venueLatitude:
      coordinate(
        formData,
        "venueLatitude",
        false
      ),

    venueLongitude:
      coordinate(
        formData,
        "venueLongitude",
        false
      ),

    timezone:
      "America/Winnipeg",

    ticketUrl:
      validUrl(
        requiredText(
          formData,
          "ticketUrl",
          500
        )
      ),

    minimumPriceCad,
    maximumPriceCad,

    ageLabel:
      optionalText(
        formData,
        "ageLabel",
        80
      ),

    accessibilityNotes:
      optionalText(
        formData,
        "accessibilityNotes",
        1000
      )
  };
}


function localPartsAt(
  epochMilliseconds: number
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Winnipeg",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23"
      }
    ).formatToParts(
      new Date(
        epochMilliseconds
      )
    );

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value
        ]
      )
    );

  return {
    year:
      Number(values.year),

    month:
      Number(values.month),

    day:
      Number(values.day),

    hour:
      Number(values.hour),

    minute:
      Number(values.minute),

    second:
      Number(values.second)
  };
}


function winnipegLocalToIso(
  value: string
): string {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(
      value
    );

  if (!match) {
    throw new Error(
      "The local date and time are invalid."
    );
  }

  const target = {
    year:
      Number(match[1]),

    month:
      Number(match[2]),

    day:
      Number(match[3]),

    hour:
      Number(match[4]),

    minute:
      Number(match[5])
  };

  const targetAsUtc =
    Date.UTC(
      target.year,
      target.month - 1,
      target.day,
      target.hour,
      target.minute,
      0
    );

  let guess =
    targetAsUtc;

  for (
    let attempt = 0;
    attempt < 4;
    attempt += 1
  ) {
    const shown =
      localPartsAt(
        guess
      );

    const shownAsUtc =
      Date.UTC(
        shown.year,
        shown.month - 1,
        shown.day,
        shown.hour,
        shown.minute,
        0
      );

    guess +=
      targetAsUtc -
      shownAsUtc;
  }

  const verified =
    localPartsAt(
      guess
    );

  if (
    verified.year !==
      target.year ||
    verified.month !==
      target.month ||
    verified.day !==
      target.day ||
    verified.hour !==
      target.hour ||
    verified.minute !==
      target.minute
  ) {
    throw new Error(
      "That Winnipeg local time does not exist because of daylight-saving time. Choose another time."
    );
  }

  return new Date(
    guess
  ).toISOString();
}


async function updateSubmission(
  formData: FormData,
  status:
    | "in_review"
    | "needs_changes"
    | "rejected"
) {
  await requireVentureAdmin();

  const id =
    requiredText(
      formData,
      "id",
      80
    );

  const submissionType =
    requiredText(
      formData,
      "submissionType",
      20
    ) as SubmissionType;

  if (
    submissionType !==
      "restaurant" &&
    submissionType !==
      "event"
  ) {
    throw new Error(
      "The submission type is invalid."
    );
  }

  const payload =
    submissionType ===
      "restaurant"
      ? restaurantPayload(
          formData
        )
      : eventPayload(
          formData
        );

  const supabase =
    getSupabaseAdminClient();

  const values: Record<
    string,
    unknown
  > = {
    payload,
    status,

    review_notes:
      optionalText(
        formData,
        "reviewNotes",
        2000
      )
  };

  if (
    status === "rejected"
  ) {
    values.reviewed_at =
      new Date().toISOString();
  }

  const {
    data,
    error
  } =
    await supabase
      .from(
        "listing_submissions"
      )
      .update(values)
      .eq(
        "id",
        id
      )
      .in(
        "status",
        [
          "pending",
          "in_review",
          "needs_changes"
        ]
      )
      .select("id")
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not update the submission: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "The pending submission could not be found."
    );
  }

  revalidatePath(
    "/admin/submissions"
  );
}



function safeReturnTo(
  formData: FormData
): string {
  const value = optionalText(
    formData,
    "returnTo",
    1000
  );

  if (
    !value ||
    !value.startsWith("/admin/") ||
    value.startsWith("//")
  ) {
    return "/admin/submissions";
  }

  return value;
}

function submissionSourceType(
  relationship: string
): "business_submission" | "organizer_submission" | "community_submission" {
  if (
    relationship === "owner" ||
    relationship === "employee" ||
    relationship === "representative"
  ) {
    return "business_submission";
  }

  if (relationship === "organizer") {
    return "organizer_submission";
  }

  return "community_submission";
}

async function uniqueSlug(
  table: "places" | "events",
  label: string
): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const result = await supabase.rpc(
    "venture_unique_slug",
    {
      target_table: table,
      requested_value: label
    }
  );

  if (
    result.error ||
    typeof result.data !== "string"
  ) {
    throw new Error(
      `Could not create a unique listing slug: ${result.error?.message ?? "unknown error"}`
    );
  }

  return result.data;
}

async function attachSubmissionSource({
  entityType,
  entityId,
  submissionId,
  relationship,
  sourceUrl
}: {
  entityType: "place" | "event";
  entityId: string;
  submissionId: string;
  relationship: string;
  sourceUrl: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const sourceResult = await supabase
    .from("sources")
    .insert({
      name: `Venture submission ${submissionId.replaceAll("-", "").slice(0, 8).toUpperCase()}`,
      source_type: submissionSourceType(relationship),
      base_url: sourceUrl,
      rights_basis: "direct_permission",
      attribution_text:
        "Submitted directly to Venture and awaiting final administrator verification.",
      caching_limit:
        "Store factual listing information and administrator-approved descriptions.",
      retention_notes:
        "Retain while the listing remains active or is required for duplicate and audit history.",
      deletion_obligations:
        "Process legitimate correction or removal requests.",
      active: true,
      reviewed_at: now
    })
    .select("id")
    .single();

  if (sourceResult.error) {
    throw new Error(
      `Could not create the submission source: ${sourceResult.error.message}`
    );
  }

  const listingSourceResult = await supabase
    .from("listing_sources")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      source_id: sourceResult.data.id,
      source_url: sourceUrl,
      is_primary: true,
      field_coverage: {
        identity: true,
        submission_payload: true,
        administrator_review_pending: true
      },
      extracted_at: now,
      last_checked_at: null,
      legal_notes:
        "Direct submission. Verify all public facts before publication."
    });

  if (listingSourceResult.error) {
    throw new Error(
      `Could not connect the submission source: ${listingSourceResult.error.message}`
    );
  }
}

async function logSubmissionDraft({
  actorId,
  entityType,
  entityId,
  submissionId,
  action
}: {
  actorId: string;
  entityType: "place" | "event";
  entityId: string;
  submissionId: string;
  action: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("audit_log")
    .insert({
      actor_id: actorId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      new_value: {
        submission_id: submissionId
      },
      source: "admin-submission-editor"
    });

  if (result.error) {
    console.error("Submission draft audit failed", {
      submissionId,
      message: result.error.message
    });
  }
}

async function createRestaurantDraftFromSubmission(
  formData: FormData,
  submission: {
    id: string;
    submitter_relationship: string;
    source_url: string | null;
  },
  actorId: string
): Promise<string> {
  const payload = restaurantPayload(formData);
  const placeType = requiredText(
    formData,
    "placeType",
    60
  );

  if (!restaurantPlaceTypes.has(placeType)) {
    throw new Error(
      "Choose a valid Venture restaurant type."
    );
  }

  const latitude = coordinate(
    formData,
    "latitude",
    true
  );
  const longitude = coordinate(
    formData,
    "longitude",
    true
  );
  const supabase = getSupabaseAdminClient();
  const name = String(payload.name);
  const addressLine1 = String(payload.addressLine1);

  const existingResult = await supabase
    .from("places")
    .select("id")
    .ilike("name", name)
    .ilike("address_line1", addressLine1)
    .neq("status", "archived")
    .limit(1)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(
      `Could not check for an existing place: ${existingResult.error.message}`
    );
  }

  if (existingResult.data) {
    await logSubmissionDraft({
      actorId,
      entityType: "place",
      entityId: existingResult.data.id,
      submissionId: submission.id,
      action: "submission_linked_existing_place"
    });
    return existingResult.data.id;
  }

  const slug = await uniqueSlug(
    "places",
    name
  );
  const insertResult = await supabase
    .from("places")
    .insert({
      slug,
      place_type: placeType,
      name,
      short_description: String(payload.description),
      full_description: null,
      primary_category: String(payload.category),
      secondary_categories: [],
      tags: [],
      address_line1: addressLine1,
      city: "Winnipeg",
      province: "Manitoba",
      neighbourhood: payload.neighbourhood || null,
      location: `SRID=4326;POINT(${longitude} ${latitude})`,
      official_phone: payload.phone || null,
      official_website: payload.website || null,
      cuisine_primary: payload.cuisine || null,
      weekly_hours: {},
      special_hours: [],
      open_status: "unknown",
      dietary_options: [],
      atmosphere_tags: [],
      good_for: [],
      status: "draft",
      verification_status: "unverified",
      warning_message:
        "Draft created from a public submission. Verify hours, pricing, accessibility, parking, transit and current operating status before publishing.",
      source_checked_at: null,
      freshness_expires_at: null,
      review_status: "needs_review",
      import_source: "public_submission"
    })
    .select("id")
    .single();

  if (insertResult.error) {
    throw new Error(
      `Could not create the restaurant draft: ${insertResult.error.message}`
    );
  }

  const sourceUrl =
    submission.source_url ||
    (typeof payload.website === "string" ? payload.website : null) ||
    "https://venture-winnipeg-two.vercel.app/submit";

  await attachSubmissionSource({
    entityType: "place",
    entityId: insertResult.data.id,
    submissionId: submission.id,
    relationship: submission.submitter_relationship,
    sourceUrl
  });
  await logSubmissionDraft({
    actorId,
    entityType: "place",
    entityId: insertResult.data.id,
    submissionId: submission.id,
    action: "submission_draft_created"
  });

  return insertResult.data.id;
}

async function createEventDraftFromSubmission(
  formData: FormData,
  submission: {
    id: string;
    submitter_relationship: string;
    source_url: string | null;
  },
  actorId: string
): Promise<string> {
  const payload = eventPayload(formData);
  const supabase = getSupabaseAdminClient();
  let venueId = optionalText(
    formData,
    "existingVenueId",
    80
  );

  if (!venueId) {
    const venueLatitude = coordinate(
      formData,
      "venueLatitude",
      true
    );
    const venueLongitude = coordinate(
      formData,
      "venueLongitude",
      true
    );
    const venueName = String(payload.venueName);
    const venueAddress = String(payload.venueAddress);
    const existingVenueResult = await supabase
      .from("places")
      .select("id")
      .ilike("name", venueName)
      .ilike("address_line1", venueAddress)
      .neq("status", "archived")
      .limit(1)
      .maybeSingle();

    if (existingVenueResult.error) {
      throw new Error(
        `Could not check for an existing venue: ${existingVenueResult.error.message}`
      );
    }

    if (existingVenueResult.data) {
      venueId = existingVenueResult.data.id;
    } else {
      const venueSlug = await uniqueSlug(
        "places",
        venueName
      );
      const venueInsert = await supabase
        .from("places")
        .insert({
          slug: venueSlug,
          place_type: "event_venue",
          name: venueName,
          short_description:
            `Venue submitted with ${String(payload.title)}. Verify venue details before publication.`,
          primary_category: "Event Venue",
          secondary_categories: [],
          tags: [],
          address_line1: venueAddress,
          city: "Winnipeg",
          province: "Manitoba",
          neighbourhood: payload.neighbourhood || null,
          location: `SRID=4326;POINT(${venueLongitude} ${venueLatitude})`,
          weekly_hours: {},
          special_hours: [],
          open_status: "unknown",
          dietary_options: [],
          atmosphere_tags: [],
          good_for: [],
          status: "draft",
          verification_status: "unverified",
          warning_message:
            "Venue draft created from an event submission. Verify public venue details before publication.",
          review_status: "needs_review",
          import_source: "public_submission"
        })
        .select("id")
        .single();

      if (venueInsert.error) {
        throw new Error(
          `Could not create the venue draft: ${venueInsert.error.message}`
        );
      }

      const createdVenueId = venueInsert.data.id;
      venueId = createdVenueId;
      await logSubmissionDraft({
        actorId,
        entityType: "place",
        entityId: createdVenueId,
        submissionId: submission.id,
        action: "submission_venue_draft_created"
      });
    }
  }

  const slug = await uniqueSlug(
    "events",
    String(payload.title)
  );
  const startAt = String(payload.startAt);
  const endAt =
    typeof payload.endAt === "string"
      ? payload.endAt
      : null;
  const expiresAt =
    endAt ||
    new Date(
      new Date(startAt).getTime() +
        24 * 60 * 60 * 1000
    ).toISOString();
  const minimumPrice =
    payload.minimumPriceCad === null
      ? null
      : Number(payload.minimumPriceCad);
  const maximumPrice =
    payload.maximumPriceCad === null
      ? null
      : Number(payload.maximumPriceCad);
  const priceType =
    minimumPrice === 0 &&
    (maximumPrice === null || maximumPrice === 0)
      ? "free"
      : minimumPrice !== null &&
          maximumPrice !== null &&
          minimumPrice !== maximumPrice
        ? "range"
        : minimumPrice !== null
          ? "fixed"
          : "unknown";

  const insertResult = await supabase
    .from("events")
    .insert({
      slug,
      title: String(payload.title),
      short_description: String(payload.description),
      full_description: null,
      primary_category: String(payload.category),
      secondary_categories: [],
      tags: [],
      venue_id: venueId,
      organizer_name: String(payload.organizerName),
      organizer_website: payload.organizerWebsite || null,
      start_at: startAt,
      end_at: endAt,
      timezone: "America/Winnipeg",
      price_type: priceType,
      minimum_price_cad: minimumPrice,
      maximum_price_cad: maximumPrice,
      ticket_url: payload.ticketUrl || null,
      ticket_status: "unknown",
      age_label: payload.ageLabel || "Unknown",
      indoor_outdoor: "unknown",
      accessibility_notes: payload.accessibilityNotes || null,
      status: "draft",
      verification_status: "unverified",
      warning_message:
        "Draft created from a public event submission. Verify schedule, ticket availability, venue, accessibility, parking and transit before publishing.",
      expires_at: expiresAt
    })
    .select("id")
    .single();

  if (insertResult.error) {
    throw new Error(
      `Could not create the event draft: ${insertResult.error.message}`
    );
  }

  const sourceUrl =
    submission.source_url ||
    (typeof payload.ticketUrl === "string" ? payload.ticketUrl : null) ||
    (typeof payload.organizerWebsite === "string" ? payload.organizerWebsite : null) ||
    "https://venture-winnipeg-two.vercel.app/submit";

  await attachSubmissionSource({
    entityType: "event",
    entityId: insertResult.data.id,
    submissionId: submission.id,
    relationship: submission.submitter_relationship,
    sourceUrl
  });
  await logSubmissionDraft({
    actorId,
    entityType: "event",
    entityId: insertResult.data.id,
    submissionId: submission.id,
    action: "submission_draft_created"
  });

  return insertResult.data.id;
}

export async function openSubmissionInEditor(
  formData: FormData
) {
  const admin = await requireVentureAdmin();
  const id = requiredText(
    formData,
    "id",
    80
  );
  const submissionType = requiredText(
    formData,
    "submissionType",
    20
  ) as SubmissionType;
  const returnTo = safeReturnTo(formData);
  const supabase = getSupabaseAdminClient();
  const submissionResult = await supabase
    .from("listing_submissions")
    .select(`
      id,
      submission_type,
      status,
      submitter_relationship,
      source_url,
      linked_entity_type,
      linked_entity_id,
      approved_entity_type,
      approved_entity_id
    `)
    .eq("id", id)
    .maybeSingle();

  if (submissionResult.error) {
    throw new Error(
      `Could not open the submission: ${submissionResult.error.message}`
    );
  }

  const submission = submissionResult.data;

  if (!submission) {
    throw new Error(
      "The submission could not be found."
    );
  }

  const existingType =
    submission.linked_entity_type ||
    submission.approved_entity_type;
  const existingId =
    submission.linked_entity_id ||
    submission.approved_entity_id;

  if (existingType && existingId) {
    redirect(
      `/admin/listings/${existingType}/${existingId}?returnTo=${encodeURIComponent(returnTo)}`
    );
  }

  if (
    submissionType !== submission.submission_type ||
    !["pending", "in_review", "needs_changes"].includes(submission.status)
  ) {
    throw new Error(
      "This submission is no longer available for draft creation."
    );
  }

  const payload =
    submissionType === "restaurant"
      ? restaurantPayload(formData)
      : eventPayload(formData);
  const entityType =
    submissionType === "restaurant"
      ? "place"
      : "event";
  const entityId =
    submissionType === "restaurant"
      ? await createRestaurantDraftFromSubmission(
          formData,
          submission,
          admin.id
        )
      : await createEventDraftFromSubmission(
          formData,
          submission,
          admin.id
        );

  const updateResult = await supabase
    .from("listing_submissions")
    .update({
      payload,
      status: "in_review",
      review_notes: optionalText(
        formData,
        "reviewNotes",
        2000
      ),
      reviewed_by: admin.id,
      linked_entity_type: entityType,
      linked_entity_id: entityId
    })
    .eq("id", id)
    .select("id")
    .single();

  if (updateResult.error) {
    throw new Error(
      `Could not link the submission draft: ${updateResult.error.message}`
    );
  }

  revalidatePath("/admin/submissions");
  redirect(
    `/admin/listings/${entityType}/${entityId}?returnTo=${encodeURIComponent(returnTo)}`
  );
}

async function attachApprovedSubmissionPhoto({
  submissionId,
  entityType,
  entityId,
  actorId
}: {
  submissionId: string;
  entityType: "place" | "event";
  entityId: string;
  actorId: string;
}): Promise<void> {
  await promoteSubmissionPhoto({
    submissionId,
    entityType,
    entityId,
    actorId
  });
}

async function getApprovedSubmissionEntity(
  submissionId: string
): Promise<{
  entityType: "place" | "event";
  entityId: string;
} | null> {
  const supabase =
    getSupabaseAdminClient();

  const { data, error } =
    await supabase
      .from("listing_submissions")
      .select(
        "approved_entity_type,approved_entity_id,linked_entity_type,linked_entity_id"
      )
      .eq("id", submissionId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not read the published submission: ${error.message}`
    );
  }

  const entityType =
    data?.approved_entity_type ??
    data?.linked_entity_type;
  const entityId =
    data?.approved_entity_id ??
    data?.linked_entity_id;

  if (
    (entityType !== "place" &&
      entityType !== "event") ||
    !entityId
  ) {
    return null;
  }

  return {
    entityType,
    entityId
  };
}

export async function completeLinkedSubmission(
  formData: FormData
) {
  const admin = await requireVentureAdmin();
  const id = requiredText(
    formData,
    "id",
    80
  );
  const supabase = getSupabaseAdminClient();
  const submissionResult = await supabase
    .from("listing_submissions")
    .select(
      "linked_entity_type, linked_entity_id, status"
    )
    .eq("id", id)
    .maybeSingle();

  if (submissionResult.error || !submissionResult.data) {
    throw new Error(
      `Could not read the linked submission: ${submissionResult.error?.message ?? "not found"}`
    );
  }

  const entityType =
    submissionResult.data.linked_entity_type;
  const entityId =
    submissionResult.data.linked_entity_id;

  if (
    (entityType !== "place" && entityType !== "event") ||
    !entityId
  ) {
    throw new Error(
      "Create or link a listing draft first."
    );
  }

  const table =
    entityType === "place"
      ? "places"
      : "events";
  const entityResult = await supabase
    .from(table)
    .select("status")
    .eq("id", entityId)
    .maybeSingle();

  if (entityResult.error || !entityResult.data) {
    throw new Error(
      `Could not read the linked listing: ${entityResult.error?.message ?? "not found"}`
    );
  }

  if (entityResult.data.status !== "published") {
    throw new Error(
      "Publish the linked listing in the full editor before marking this submission complete."
    );
  }

  await attachApprovedSubmissionPhoto({
    submissionId: id,
    entityType,
    entityId,
    actorId: admin.id
  });

  const now = new Date().toISOString();
  const updateResult = await supabase
    .from("listing_submissions")
    .update({
      status: "approved",
      approved_entity_type: entityType,
      approved_entity_id: entityId,
      reviewed_by: admin.id,
      reviewed_at: now
    })
    .eq("id", id);

  if (updateResult.error) {
    throw new Error(
      `Could not complete the submission: ${updateResult.error.message}`
    );
  }

  await logSubmissionDraft({
    actorId: admin.id,
    entityType,
    entityId,
    submissionId: id,
    action: "linked_submission_approved"
  });

  revalidatePath("/admin/submissions");
}

export async function saveSubmissionReview(
  formData: FormData
) {
  await updateSubmission(
    formData,
    "in_review"
  );
}


export async function requestSubmissionChanges(
  formData: FormData
) {
  const notes =
    optionalText(
      formData,
      "reviewNotes",
      2000
    );

  if (!notes) {
    throw new Error(
      "Add reviewer notes explaining what needs to change."
    );
  }

  await updateSubmission(
    formData,
    "needs_changes"
  );
}


export async function rejectSubmission(
  formData: FormData
) {
  await updateSubmission(
    formData,
    "rejected"
  );
}


export async function publishRestaurantSubmission(
  formData: FormData
) {
  const admin =
    await requireVentureAdmin();

  const submissionId =
    requiredText(
      formData,
      "id",
      80
    );

  const placeType =
    requiredText(
      formData,
      "placeType",
      60
    );

  if (
    !restaurantPlaceTypes.has(
      placeType
    )
  ) {
    throw new Error(
      "Choose a valid Venture restaurant type."
    );
  }

  const supabase =
    getSupabaseAdminClient();

  const {
    error
  } =
    await supabase.rpc(
      "publish_restaurant_submission",
      {
        p_submission_id:
          submissionId,

        p_payload:
          restaurantPayload(
            formData
          ),

        p_place_type:
          placeType,

        p_latitude:
          coordinate(
            formData,
            "latitude",
            true
          ),

        p_longitude:
          coordinate(
            formData,
            "longitude",
            true
          ),

        p_review_notes:
          optionalText(
            formData,
            "reviewNotes",
            2000
          )
      }
    );

  if (error) {
    throw new Error(
      `Could not publish the restaurant: ${error.message}`
    );
  }

  const approvedEntity =
    await getApprovedSubmissionEntity(
      submissionId
    );

  if (approvedEntity) {
    await attachApprovedSubmissionPhoto({
      submissionId,
      entityType:
        approvedEntity.entityType,
      entityId:
        approvedEntity.entityId,
      actorId:
        admin.id
    });
  }

  revalidatePath(
    "/admin/submissions"
  );

  revalidatePath(
    "/explore"
  );

  revalidatePath(
    "/"
  );
}


export async function publishEventSubmission(
  formData: FormData
) {
  const admin =
    await requireVentureAdmin();

  const submissionId =
    requiredText(
      formData,
      "id",
      80
    );

  const existingVenueId =
    optionalText(
      formData,
      "existingVenueId",
      80
    );

  const supabase =
    getSupabaseAdminClient();

  const {
    error
  } =
    await supabase.rpc(
      "publish_event_submission",
      {
        p_submission_id:
          submissionId,

        p_payload:
          eventPayload(
            formData
          ),

        p_existing_venue_id:
          existingVenueId,

        p_venue_latitude:
          coordinate(
            formData,
            "venueLatitude",
            false
          ),

        p_venue_longitude:
          coordinate(
            formData,
            "venueLongitude",
            false
          ),

        p_review_notes:
          optionalText(
            formData,
            "reviewNotes",
            2000
          )
      }
    );

  if (error) {
    throw new Error(
      `Could not publish the event: ${error.message}`
    );
  }

  const approvedEntity =
    await getApprovedSubmissionEntity(
      submissionId
    );

  if (approvedEntity) {
    await attachApprovedSubmissionPhoto({
      submissionId,
      entityType:
        approvedEntity.entityType,
      entityId:
        approvedEntity.entityId,
      actorId:
        admin.id
    });
  }

  revalidatePath(
    "/admin/submissions"
  );

  revalidatePath(
    "/explore"
  );

  revalidatePath(
    "/"
  );
}
