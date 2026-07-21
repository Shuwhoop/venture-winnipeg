import {
  NextResponse
} from "next/server";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

const allowedReasons = new Set([
  "cancelled",
  "closed_business",
  "incorrect_hours",
  "wrong_address",
  "incorrect_price",
  "broken_link",
  "accessibility",
  "outdated_event",
  "incorrect_details",
  "duplicate",
  "inappropriate",
  "other"
]);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReportRequestBody = {
  entityType?: string;
  entityId?: string;
  reason?: string;
  details?: string;
  sourceUrl?: string;
  website?: string;
};

function isSameOrigin(
  request: Request
): boolean {
  const origin =
    request.headers.get("origin");

  if (!origin) {
    return true;
  }

  return origin ===
    new URL(request.url).origin;
}

function validOptionalUrl(
  value: string
): boolean {
  if (!value) {
    return true;
  }

  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    );
  } catch {
    return false;
  }
}

export async function POST(
  request: Request
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      {
        error:
          "The report came from an unexpected origin."
      },
      {
        status: 403
      }
    );
  }

  try {
    const body =
      (await request.json()) as
        ReportRequestBody;

    if (body.website?.trim()) {
      return NextResponse.json(
        {
          ok: true,
          message:
            "Thanks. Venture will review the information."
        },
        {
          status: 201
        }
      );
    }

    const entityType =
      body.entityType?.trim();
    const entityId =
      body.entityId?.trim();
    const reason =
      body.reason?.trim();
    const details =
      body.details?.trim() ?? "";
    const sourceUrl =
      body.sourceUrl?.trim() ?? "";

    if (
      entityType !== "event" &&
      entityType !== "place"
    ) {
      return NextResponse.json(
        {
          error:
            "The listing type is invalid."
        },
        {
          status: 400
        }
      );
    }

    if (
      !entityId ||
      !uuidPattern.test(entityId)
    ) {
      return NextResponse.json(
        {
          error:
            "The listing identifier is invalid."
        },
        {
          status: 400
        }
      );
    }

    if (
      !reason ||
      !allowedReasons.has(reason)
    ) {
      return NextResponse.json(
        {
          error:
            "Choose a valid report reason."
        },
        {
          status: 400
        }
      );
    }

    if (
      details.length > 1000 ||
      sourceUrl.length > 500 ||
      !validOptionalUrl(sourceUrl)
    ) {
      return NextResponse.json(
        {
          error:
            "Check the report details and supporting source."
        },
        {
          status: 400
        }
      );
    }

    const supabase =
      getSupabaseAdminClient();
    const listingTable =
      entityType === "event"
        ? "events"
        : "places";

    const {
      data: listing,
      error: listingError
    } = await supabase
      .from(listingTable)
      .select("id")
      .eq("id", entityId)
      .eq("status", "published")
      .maybeSingle();

    if (listingError) {
      throw listingError;
    }

    if (!listing) {
      return NextResponse.json(
        {
          error:
            "That published listing could not be found."
        },
        {
          status: 404
        }
      );
    }

    const { error: reportError } =
      await supabase
        .from("reports")
        .insert({
          reporter_id: null,
          entity_type: entityType,
          entity_id: entityId,
          reason,
          details:
            details || null,
          source_url:
            sourceUrl || null
        });

    if (reportError) {
      throw reportError;
    }

    return NextResponse.json(
      {
        ok: true,
        message:
          "Thanks. Venture will review the information."
      },
      {
        status: 201
      }
    );
  } catch (error) {
    console.error(
      "Unable to submit Venture report:",
      error
    );

    return NextResponse.json(
      {
        error:
          "The report could not be submitted. Please try again."
      },
      {
        status: 500
      }
    );
  }
}
