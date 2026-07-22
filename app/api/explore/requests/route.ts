import {
  NextResponse
} from "next/server";

import {
  sendExploreRequestEmail
} from "@/lib/notifications/explore-request-email";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

const allowedTypes = new Set([
  "restaurant",
  "event",
  "bar",
  "place",
  "other"
]);

function cleanText(
  value: unknown,
  maximumLength: number,
  required = false
): string | null {
  if (typeof value !== "string") {
    return required ? null : "";
  }

  const cleaned = value.trim();

  if (
    (required && !cleaned) ||
    cleaned.length > maximumLength
  ) {
    return null;
  }

  return cleaned;
}

function validEmail(
  value: string
): boolean {
  return (
    !value ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export async function POST(
  request: Request
) {
  let body: Record<string, unknown>;

  try {
    body =
      (await request.json()) as Record<
        string,
        unknown
      >;
  } catch {
    return NextResponse.json(
      {
        error: "The request could not be read."
      },
      {
        status: 400
      }
    );
  }

  if (
    typeof body.website === "string" &&
    body.website.trim()
  ) {
    return NextResponse.json({
      ok: true
    });
  }

  const searchQuery = cleanText(
    body.searchQuery,
    200,
    true
  );

  const requestedType = cleanText(
    body.requestedType,
    30,
    true
  );

  const neighbourhood = cleanText(
    body.neighbourhood,
    120
  );

  const details = cleanText(
    body.details,
    800
  );

  const contactEmail = cleanText(
    body.contactEmail,
    320
  );

  const sourcePage =
    cleanText(
      body.sourcePage,
      500
    ) || "/explore";

  if (
    !searchQuery ||
    searchQuery.length < 2 ||
    !requestedType ||
    !allowedTypes.has(requestedType) ||
    neighbourhood === null ||
    details === null ||
    contactEmail === null ||
    !validEmail(contactEmail) ||
    sourcePage === null
  ) {
    return NextResponse.json(
      {
        error:
          "Check the listing name, type, area, and email."
      },
      {
        status: 400
      }
    );
  }

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error
    } = await supabase
      .from("explore_listing_requests")
      .insert({
        search_query: searchQuery,
        requested_type: requestedType,
        neighbourhood:
          neighbourhood || null,
        details: details || null,
        contact_email:
          contactEmail || null,
        source_page: sourcePage,
        status: "new"
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(
        "Could not save Explore listing request:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Venture could not save the request."
        },
        {
          status: 500
        }
      );
    }

    const reference = data.id
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase();

    await sendExploreRequestEmail({
      reference,
      searchQuery,
      requestedType,
      neighbourhood:
        neighbourhood || null,
      details: details || null,
      contactEmail:
        contactEmail || null,
      sourcePage
    });

    return NextResponse.json(
      {
        ok: true,
        reference
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error(
      "Unexpected Explore listing request error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Venture could not save the request."
      },
      {
        status: 500
      }
    );
  }
}
