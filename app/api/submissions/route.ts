import {
  NextResponse
} from "next/server";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";


const MAX_BODY_LENGTH =
  60_000;

const allowedRelationships =
  new Set([
    "owner",
    "employee",
    "organizer",
    "representative",
    "community_member",
    "other"
  ]);


function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}


function requiredText(
  value: unknown,
  maximumLength: number
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  if (
    !cleaned ||
    cleaned.length >
      maximumLength
  ) {
    return null;
  }

  return cleaned;
}


function optionalText(
  value: unknown,
  maximumLength: number
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return requiredText(
    value,
    maximumLength
  );
}


function validEmail(
  value: string
): boolean {
  return (
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    )
  );
}


function validUrl(
  value: string | null
): boolean {
  if (!value) {
    return true;
  }

  try {
    const url =
      new URL(value);

    return [
      "http:",
      "https:"
    ].includes(
      url.protocol
    );
  } catch {
    return false;
  }
}


function validLocalDateTime(
  value: string
): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(
    value
  );
}


function optionalPrice(
  value: unknown
): string | null | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    number > 100_000
  ) {
    return undefined;
  }

  return number.toFixed(2);
}


function parseRestaurant(
  value: unknown
): Record<
  string,
  unknown
> | null {
  if (!isRecord(value)) {
    return null;
  }

  const name =
    requiredText(
      value.name,
      200
    );

  const addressLine1 =
    requiredText(
      value.addressLine1,
      250
    );

  const category =
    requiredText(
      value.category,
      120
    );

  const description =
    requiredText(
      value.description,
      1500
    );

  const website =
    optionalText(
      value.website,
      500
    );

  if (
    !name ||
    !addressLine1 ||
    !category ||
    !description ||
    !validUrl(website)
  ) {
    return null;
  }

  return {
    name,
    addressLine1,

    neighbourhood:
      optionalText(
        value.neighbourhood,
        120
      ),

    category,

    cuisine:
      optionalText(
        value.cuisine,
        120
      ),

    website,

    phone:
      optionalText(
        value.phone,
        80
      ),

    description,

    city:
      "Winnipeg",

    province:
      "Manitoba"
  };
}


function parseEvent(
  value: unknown
): Record<
  string,
  unknown
> | null {
  if (!isRecord(value)) {
    return null;
  }

  const title =
    requiredText(
      value.title,
      200
    );

  const description =
    requiredText(
      value.description,
      2000
    );

  const category =
    requiredText(
      value.category,
      120
    );

  const organizerName =
    requiredText(
      value.organizerName,
      200
    );

  const venueName =
    requiredText(
      value.venueName,
      200
    );

  const venueAddress =
    requiredText(
      value.venueAddress,
      250
    );

  const startAt =
    requiredText(
      value.startAt,
      16
    );

  const endAt =
    optionalText(
      value.endAt,
      16
    );

  const ticketUrl =
    requiredText(
      value.ticketUrl,
      500
    );

  const organizerWebsite =
    optionalText(
      value.organizerWebsite,
      500
    );

  const minimumPriceCad =
    optionalPrice(
      value.minimumPriceCad
    );

  const maximumPriceCad =
    optionalPrice(
      value.maximumPriceCad
    );

  if (
    !title ||
    !description ||
    !category ||
    !organizerName ||
    !venueName ||
    !venueAddress ||
    !startAt ||
    !validLocalDateTime(
      startAt
    ) ||
    (
      endAt &&
      !validLocalDateTime(
        endAt
      )
    ) ||
    (
      endAt &&
      endAt < startAt
    ) ||
    !ticketUrl ||
    !validUrl(ticketUrl) ||
    !validUrl(
      organizerWebsite
    ) ||
    minimumPriceCad ===
      undefined ||
    maximumPriceCad ===
      undefined ||
    (
      minimumPriceCad !==
        null &&
      maximumPriceCad !==
        null &&
      Number(maximumPriceCad) <
        Number(minimumPriceCad)
    )
  ) {
    return null;
  }

  return {
    title,
    description,
    category,
    organizerName,
    organizerWebsite,
    venueName,
    venueAddress,

    neighbourhood:
      optionalText(
        value.neighbourhood,
        120
      ),

    startAt,
    endAt,

    timezone:
      "America/Winnipeg",

    ticketUrl,
    minimumPriceCad,
    maximumPriceCad,

    ageLabel:
      optionalText(
        value.ageLabel,
        80
      ),

    accessibilityNotes:
      optionalText(
        value.accessibilityNotes,
        1000
      )
  };
}


export async function POST(
  request: Request
) {
  let rawBody: string;

  try {
    rawBody =
      await request.text();
  } catch {
    return NextResponse.json(
      {
        error:
          "The submission could not be read."
      },
      {
        status:
          400
      }
    );
  }

  if (
    rawBody.length >
    MAX_BODY_LENGTH
  ) {
    return NextResponse.json(
      {
        error:
          "The submission is too large."
      },
      {
        status:
          413
      }
    );
  }

  let body: unknown;

  try {
    body =
      JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        error:
          "The submission was not valid JSON."
      },
      {
        status:
          400
      }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      {
        error:
          "The submission is incomplete."
      },
      {
        status:
          400
      }
    );
  }

  /*
   * Quietly accept bot-filled
   * honeypots without storing them.
   */
  if (
    typeof body.website ===
      "string" &&
    body.website.trim()
  ) {
    return NextResponse.json({
      ok:
        true
    });
  }

  const submissionType =
    body.submissionType;

  if (
    submissionType !==
      "restaurant" &&
    submissionType !==
      "event"
  ) {
    return NextResponse.json(
      {
        error:
          "Choose a restaurant or event."
      },
      {
        status:
          400
      }
    );
  }

  const submitterName =
    requiredText(
      body.submitterName,
      150
    );

  const submitterEmail =
    requiredText(
      body.submitterEmail,
      320
    );

  const relationship =
    requiredText(
      body.submitterRelationship,
      40
    );

  const sourceUrl =
    optionalText(
      body.sourceUrl,
      500
    );

  if (
    !submitterName ||
    !submitterEmail ||
    !validEmail(
      submitterEmail
    ) ||
    !relationship ||
    !allowedRelationships.has(
      relationship
    ) ||
    !validUrl(sourceUrl) ||
    body.termsAccepted !==
      true
  ) {
    return NextResponse.json(
      {
        error:
          "Check your contact details, relationship, source link, and confirmation."
      },
      {
        status:
          400
      }
    );
  }

  const payload =
    submissionType ===
      "restaurant"
      ? parseRestaurant(
          body.payload
        )
      : parseEvent(
          body.payload
        );

  if (!payload) {
    return NextResponse.json(
      {
        error:
          submissionType ===
            "restaurant"
            ? "Check the restaurant details and official links."
            : "Check the event dates, prices, venue, and official link."
      },
      {
        status:
          400
      }
    );
  }

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error
    } =
      await supabase
        .from(
          "listing_submissions"
        )
        .insert({
          submission_type:
            submissionType,

          status:
            "pending",

          submitter_name:
            submitterName,

          submitter_email:
            submitterEmail,

          submitter_phone:
            optionalText(
              body.submitterPhone,
              80
            ),

          organization_name:
            optionalText(
              body.organizationName,
              200
            ),

          submitter_relationship:
            relationship,

          payload,

          source_url:
            sourceUrl,

          submitter_notes:
            optionalText(
              body.submitterNotes,
              1000
            ),

          consent_to_contact:
            body.consentToContact ===
            true,

          terms_accepted:
            true,

          submission_channel:
            "public_form"
        })
        .select(
          "id"
        )
        .single();

    if (error) {
      console.error(
        "Could not create listing submission:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Venture could not save the submission."
        },
        {
          status:
            500
        }
      );
    }

    return NextResponse.json(
      {
        ok:
          true,

        reference:
          data.id
            .replaceAll(
              "-",
              ""
            )
            .slice(
              0,
              8
            )
            .toUpperCase()
      },
      {
        status:
          201,

        headers: {
          "Cache-Control":
            "no-store"
        }
      }
    );
  } catch (error) {
    console.error(
      "Unexpected listing submission error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Venture could not save the submission."
      },
      {
        status:
          500
      }
    );
  }
}
