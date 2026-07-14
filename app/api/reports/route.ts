import { NextResponse } from "next/server";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

const allowedReasons = new Set([
  "cancelled",
  "incorrect_hours",
  "wrong_address",
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
  website?: string;
};

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as ReportRequestBody;

    /*
     * Hidden spam field.
     * Real users never fill this in.
     */
    if (body.website?.trim()) {
      return NextResponse.json(
        {
          ok: true,
          message:
            "Thanks. Your report was submitted for review."
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

    if (details.length > 1000) {
      return NextResponse.json(
        {
          error:
            "Report details must be 1,000 characters or fewer."
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

    /*
     * Confirm that the report refers to
     * an actual published listing.
     */
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

    /*
     * status and created_at are supplied
     * automatically by the database.
     */
    const { error: reportError } =
      await supabase
        .from("reports")
        .insert({
          reporter_id: null,
          entity_type: entityType,
          entity_id: entityId,
          reason,
          details:
            details.length > 0
              ? details
              : null
        });

    if (reportError) {
      throw reportError;
    }

    return NextResponse.json(
      {
        ok: true,
        message:
          "Thanks. Your report was submitted for review."
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