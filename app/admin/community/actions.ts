"use server";

import {
  revalidatePath
} from "next/cache";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

function requiredText(
  formData: FormData,
  key: string,
  maxLength: number
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
    .slice(0, maxLength);
}

function optionalText(
  formData: FormData,
  key: string,
  maxLength: number
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
    .slice(0, maxLength);
}

function numberValue(
  formData: FormData,
  key: string,
  fallback: number
): number {
  const raw =
    formData.get(key);

  const parsed =
    typeof raw === "string"
      ? Number(raw)
      : Number.NaN;

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function optionalNumber(
  formData: FormData,
  key: string
): number | null {
  const raw =
    formData.get(key);

  if (
    typeof raw !== "string" ||
    !raw.trim()
  ) {
    return null;
  }

  const parsed =
    Number(raw);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    throw new Error(
      `${key} must be a valid non-negative number.`
    );
  }

  return parsed;
}

function dateTimeValue(
  formData: FormData,
  key: string,
  required: boolean
): string | null {
  const value =
    optionalText(
      formData,
      key,
      40
    );

  if (!value) {
    if (required) {
      throw new Error(
        `${key} is required.`
      );
    }

    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      `${key} is invalid.`
    );
  }

  return date.toISOString();
}

function slugify(
  value: string
): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(0, 120);
}

function textList(
  formData: FormData,
  key: string
): string[] {
  const value =
    optionalText(
      formData,
      key,
      500
    );

  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map(
      (item) =>
        item.trim()
    )
    .filter(Boolean)
    .slice(0, 12);
}

function revalidateCommunity() {
  revalidatePath(
    "/admin/community"
  );
  revalidatePath(
    "/community"
  );
  revalidatePath("/");
  revalidatePath("/profile");
}

export async function saveCommunityExperience(
  formData: FormData
) {
  const admin =
    await requireVentureAdmin();

  const supabase =
    getSupabaseAdminClient();

  const title =
    requiredText(
      formData,
      "title",
      180
    );

  const suppliedSlug =
    optionalText(
      formData,
      "slug",
      140
    );

  const id =
    optionalText(
      formData,
      "id",
      80
    );

  const startsAt =
    dateTimeValue(
      formData,
      "startsAt",
      true
    );

  const endsAt =
    dateTimeValue(
      formData,
      "endsAt",
      false
    );

  const payload = {
    title,
    slug:
      slugify(
        suppliedSlug ??
        title
      ),
    eyebrow:
      optionalText(
        formData,
        "eyebrow",
        80
      ) ??
      "VENTURE IS BUILDING",
    summary:
      requiredText(
        formData,
        "summary",
        420
      ),
    description:
      optionalText(
        formData,
        "description",
        3000
      ) ?? "",
    starts_at:
      startsAt,
    ends_at:
      endsAt,
    timezone:
      "America/Winnipeg",
    neighbourhood:
      optionalText(
        formData,
        "neighbourhood",
        120
      ),
    meeting_point:
      optionalText(
        formData,
        "meetingPoint",
        250
      ),
    meeting_instructions:
      optionalText(
        formData,
        "meetingInstructions",
        1000
      ),
    capacity:
      Math.max(
        2,
        Math.min(
          200,
          Math.round(
            numberValue(
              formData,
              "capacity",
              12
            )
          )
        )
      ),
    minimum_age:
      optionalNumber(
        formData,
        "minimumAge"
      ),
    estimated_cost_min_cad:
      optionalNumber(
        formData,
        "estimatedCostMinCad"
      ),
    estimated_cost_max_cad:
      optionalNumber(
        formData,
        "estimatedCostMaxCad"
      ),
    social_vibe:
      textList(
        formData,
        "socialVibe"
      ),
    accessibility_notes:
      optionalText(
        formData,
        "accessibilityNotes",
        1000
      ),
    dietary_notes:
      optionalText(
        formData,
        "dietaryNotes",
        1000
      ),
    what_to_bring:
      optionalText(
        formData,
        "whatToBring",
        1000
      ),
    host_name:
      optionalText(
        formData,
        "hostName",
        160
      ),
    host_description:
      optionalText(
        formData,
        "hostDescription",
        800
      ),
    hero_image_url:
      optionalText(
        formData,
        "heroImageUrl",
        1000
      ),
    created_by:
      admin.id
  };

  const query =
    id
      ? supabase
          .from(
            "community_experiences"
          )
          .update(payload)
          .eq("id", id)
      : supabase
          .from(
            "community_experiences"
          )
          .insert(payload);

  const { error } =
    await query;

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidateCommunity();
}


export async function duplicateCommunityExperience(
  formData: FormData
) {
  const admin =
    await requireVentureAdmin();

  const experienceId =
    requiredText(
      formData,
      "experienceId",
      80
    );

  const supabase =
    getSupabaseAdminClient();

  const {
    data: source,
    error: sourceError
  } =
    await supabase
      .from(
        "community_experiences"
      )
      .select(
        "slug, title, eyebrow, summary, description, starts_at, ends_at, timezone, neighbourhood, meeting_point, meeting_instructions, capacity, minimum_age, estimated_cost_min_cad, estimated_cost_max_cad, social_vibe, accessibility_notes, dietary_notes, what_to_bring, host_name, host_description, hero_image_url"
      )
      .eq("id", experienceId)
      .single();

  if (
    sourceError ||
    !source
  ) {
    throw new Error(
      sourceError?.message ??
      "Community experience not found."
    );
  }

  const sourceStart =
    new Date(source.starts_at);

  const copiedStart =
    new Date(
      sourceStart.getTime() +
      28 * 24 * 60 * 60 * 1000
    );

  const copiedEnd =
    source.ends_at
      ? new Date(
          new Date(
            source.ends_at
          ).getTime() +
          28 * 24 * 60 * 60 * 1000
        )
      : null;

  const copyStamp =
    copiedStart
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");

  const copiedSlug =
    `${source.slug.slice(0, 120)}-${copyStamp}-${Date.now()
      .toString()
      .slice(-6)}`;

  const {
    data: copy,
    error: copyError
  } =
    await supabase
      .from(
        "community_experiences"
      )
      .insert({
        slug: copiedSlug,
        title:
          `${source.title} · Next Build`,
        eyebrow:
          source.eyebrow,
        summary:
          source.summary,
        description:
          source.description,
        starts_at:
          copiedStart.toISOString(),
        ends_at:
          copiedEnd?.toISOString() ??
          null,
        timezone:
          source.timezone,
        neighbourhood:
          source.neighbourhood,
        meeting_point:
          source.meeting_point,
        meeting_instructions:
          source.meeting_instructions,
        capacity:
          source.capacity,
        minimum_age:
          source.minimum_age,
        estimated_cost_min_cad:
          source.estimated_cost_min_cad,
        estimated_cost_max_cad:
          source.estimated_cost_max_cad,
        social_vibe:
          source.social_vibe,
        accessibility_notes:
          source.accessibility_notes,
        dietary_notes:
          source.dietary_notes,
        what_to_bring:
          source.what_to_bring,
        host_name:
          source.host_name,
        host_description:
          source.host_description,
        hero_image_url:
          source.hero_image_url,
        status: "draft",
        published_at: null,
        created_by: admin.id
      })
      .select("id")
      .single();

  if (
    copyError ||
    !copy
  ) {
    throw new Error(
      copyError?.message ??
      "Could not duplicate the community experience."
    );
  }

  const {
    data: sourceStops,
    error: stopsError
  } =
    await supabase
      .from(
        "community_experience_stops"
      )
      .select(
        "position, entity_type, entity_id, listing_slug, listing_name, starts_at, ends_at, neighbourhood, notes, joinable_separately"
      )
      .eq(
        "experience_id",
        experienceId
      )
      .order(
        "position",
        {
          ascending: true
        }
      );

  if (stopsError) {
    throw new Error(
      stopsError.message
    );
  }

  if (
    sourceStops &&
    sourceStops.length > 0
  ) {
    const dateOffset =
      copiedStart.getTime() -
      sourceStart.getTime();

    const copiedStops =
      sourceStops.map(
        (stop) => ({
          experience_id:
            copy.id,
          position:
            stop.position,
          entity_type:
            stop.entity_type,
          entity_id:
            stop.entity_id,
          listing_slug:
            stop.listing_slug,
          listing_name:
            stop.listing_name,
          starts_at:
            stop.starts_at
              ? new Date(
                  new Date(
                    stop.starts_at
                  ).getTime() +
                  dateOffset
                ).toISOString()
              : null,
          ends_at:
            stop.ends_at
              ? new Date(
                  new Date(
                    stop.ends_at
                  ).getTime() +
                  dateOffset
                ).toISOString()
              : null,
          neighbourhood:
            stop.neighbourhood,
          notes:
            stop.notes,
          joinable_separately:
            stop.joinable_separately
        })
      );

    const {
      error: copiedStopsError
    } =
      await supabase
        .from(
          "community_experience_stops"
        )
        .insert(copiedStops);

    if (copiedStopsError) {
      await supabase
        .from(
          "community_experiences"
        )
        .delete()
        .eq("id", copy.id);

      throw new Error(
        copiedStopsError.message
      );
    }
  }

  revalidateCommunity();
}

export async function setCommunityExperienceStatus(
  formData: FormData
) {
  await requireVentureAdmin();

  const id =
    requiredText(
      formData,
      "id",
      80
    );

  const status =
    requiredText(
      formData,
      "status",
      30
    );

  if (
    ![
      "draft",
      "published",
      "completed",
      "cancelled",
      "archived"
    ].includes(status)
  ) {
    throw new Error(
      "Invalid community experience status."
    );
  }

  const supabase =
    getSupabaseAdminClient();

  const {
    error
  } =
    await supabase
      .from(
        "community_experiences"
      )
      .update({
        status,
        published_at:
          status ===
            "published"
            ? new Date()
                .toISOString()
            : undefined
      })
      .eq("id", id);

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidateCommunity();
}

export async function addCommunityStop(
  formData: FormData
) {
  await requireVentureAdmin();

  const experienceId =
    requiredText(
      formData,
      "experienceId",
      80
    );

  const listingReference =
    requiredText(
      formData,
      "listingReference",
      120
    );

  const [
    entityType,
    entityId
  ] =
    listingReference.split(":");

  if (
    ![
      "place",
      "event"
    ].includes(
      entityType
    ) ||
    !entityId
  ) {
    throw new Error(
      "Choose a valid Venture listing."
    );
  }

  const supabase =
    getSupabaseAdminClient();

  const {
    data: existingStops,
    error:
      existingStopsError
  } =
    await supabase
      .from(
        "community_experience_stops"
      )
      .select("position")
      .eq(
        "experience_id",
        experienceId
      )
      .order(
        "position",
        {
          ascending: false
        }
      )
      .limit(1);

  if (existingStopsError) {
    throw new Error(
      existingStopsError.message
    );
  }

  const nextPosition =
    (
      existingStops?.[0]
        ?.position ??
      -1
    ) + 1;

  let listingName = "";
  let listingSlug:
    string | null = null;
  let neighbourhood:
    string | null = null;
  let startsAt:
    string | null = null;
  let endsAt:
    string | null = null;

  if (
    entityType ===
    "event"
  ) {
    const {
      data,
      error
    } =
      await supabase
        .from("events")
        .select(
          "title, slug, start_at, end_at, venue:places(neighbourhood)"
        )
        .eq("id", entityId)
        .single();

    if (
      error ||
      !data
    ) {
      throw new Error(
        error?.message ??
        "Event not found."
      );
    }

    listingName =
      data.title;
    listingSlug =
      data.slug;
    startsAt =
      data.start_at;
    endsAt =
      data.end_at;

    const venue =
      Array.isArray(
        data.venue
      )
        ? data.venue[0]
        : data.venue;

    neighbourhood =
      venue?.neighbourhood ??
      null;
  } else {
    const {
      data,
      error
    } =
      await supabase
        .from("places")
        .select(
          "name, slug, neighbourhood"
        )
        .eq("id", entityId)
        .single();

    if (
      error ||
      !data
    ) {
      throw new Error(
        error?.message ??
        "Place not found."
      );
    }

    listingName =
      data.name;
    listingSlug =
      data.slug;
    neighbourhood =
      data.neighbourhood;
  }

  const manualStartsAt =
    dateTimeValue(
      formData,
      "startsAt",
      false
    );

  const manualEndsAt =
    dateTimeValue(
      formData,
      "endsAt",
      false
    );

  const { error } =
    await supabase
      .from(
        "community_experience_stops"
      )
      .insert({
        experience_id:
          experienceId,
        position:
          nextPosition,
        entity_type:
          entityType,
        entity_id:
          entityId,
        listing_slug:
          listingSlug,
        listing_name:
          listingName,
        starts_at:
          manualStartsAt ??
          startsAt,
        ends_at:
          manualEndsAt ??
          endsAt,
        neighbourhood,
        notes:
          optionalText(
            formData,
            "notes",
            800
          ),
        joinable_separately:
          formData.get(
            "joinableSeparately"
          ) === "on"
      });

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidateCommunity();
}

export async function moveCommunityStop(
  formData: FormData
) {
  await requireVentureAdmin();

  const stopId =
    requiredText(
      formData,
      "stopId",
      80
    );

  const experienceId =
    requiredText(
      formData,
      "experienceId",
      80
    );

  const direction =
    requiredText(
      formData,
      "direction",
      10
    );

  const supabase =
    getSupabaseAdminClient();

  const {
    data,
    error
  } =
    await supabase
      .from(
        "community_experience_stops"
      )
      .select(
        "id, position"
      )
      .eq(
        "experience_id",
        experienceId
      )
      .order(
        "position",
        {
          ascending: true
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const stops =
    data ?? [];

  const currentIndex =
    stops.findIndex(
      (stop) =>
        stop.id === stopId
    );

  const targetIndex =
    direction === "up"
      ? currentIndex - 1
      : currentIndex + 1;

  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >=
      stops.length
  ) {
    return;
  }

  const current =
    stops[currentIndex];
  const target =
    stops[targetIndex];

  const updates = [
    supabase
      .from(
        "community_experience_stops"
      )
      .update({
        position:
          target.position
      })
      .eq("id", current.id),

    supabase
      .from(
        "community_experience_stops"
      )
      .update({
        position:
          current.position
      })
      .eq("id", target.id)
  ];

  const results =
    await Promise.all(
      updates
    );

  const updateError =
    results.find(
      (result) =>
        result.error
    )?.error;

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  revalidateCommunity();
}

export async function removeCommunityStop(
  formData: FormData
) {
  await requireVentureAdmin();

  const stopId =
    requiredText(
      formData,
      "stopId",
      80
    );

  const supabase =
    getSupabaseAdminClient();

  const { error } =
    await supabase
      .from(
        "community_experience_stops"
      )
      .delete()
      .eq("id", stopId);

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidateCommunity();
}

export async function updateCommunityRsvpStatus(
  formData: FormData
) {
  await requireVentureAdmin();

  const rsvpId =
    requiredText(
      formData,
      "rsvpId",
      80
    );

  const status =
    requiredText(
      formData,
      "status",
      30
    );

  if (
    ![
      "confirmed",
      "waitlisted",
      "cancelled",
      "attended",
      "no_show"
    ].includes(status)
  ) {
    throw new Error(
      "Invalid RSVP status."
    );
  }

  const supabase =
    getSupabaseAdminClient();

  const { error } =
    await supabase
      .from(
        "community_rsvps"
      )
      .update({
        status
      })
      .eq("id", rsvpId);

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidateCommunity();
}

export async function checkInCommunityRsvp(
  formData: FormData
) {
  const admin =
    await requireVentureAdmin();

  const rsvpId =
    requiredText(
      formData,
      "rsvpId",
      80
    );

  const supabase =
    getSupabaseAdminClient();

  const {
    data: rsvp,
    error: rsvpError
  } =
    await supabase
      .from(
        "community_rsvps"
      )
      .select(
        "id, experience_id"
      )
      .eq("id", rsvpId)
      .single();

  if (
    rsvpError ||
    !rsvp
  ) {
    throw new Error(
      rsvpError?.message ??
      "RSVP not found."
    );
  }

  const {
    error: checkInError
  } =
    await supabase
      .from(
        "community_check_ins"
      )
      .upsert(
        {
          experience_id:
            rsvp.experience_id,
          rsvp_id:
            rsvp.id,
          checked_in_by:
            admin.id,
          checked_in_at:
            new Date()
              .toISOString()
        },
        {
          onConflict:
            "experience_id,rsvp_id"
        }
      );

  if (checkInError) {
    throw new Error(
      checkInError.message
    );
  }

  const {
    error: statusError
  } =
    await supabase
      .from(
        "community_rsvps"
      )
      .update({
        status: "attended"
      })
      .eq("id", rsvpId);

  if (statusError) {
    throw new Error(
      statusError.message
    );
  }

  revalidateCommunity();
}
