"use server";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  revalidatePath
} from "next/cache";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";


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
  await requireVentureAdmin();

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
          requiredText(
            formData,
            "id",
            80
          ),

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
  await requireVentureAdmin();

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
          requiredText(
            formData,
            "id",
            80
          ),

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
