import {
  NextResponse
} from "next/server";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_ROLES = new Set([
  "owner",
  "manager",
  "marketing",
  "authorized_representative",
  "other"
]);

type ClaimBody = {
  placeId?: string;
  claimantName?: string;
  claimantRole?: string;
  businessEmail?: string;
  businessPhone?: string;
  officialWebsite?: string;
  evidence?: string;
  website?: string;
};

function stringValue(
  value: unknown,
  maxLength: number
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

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

function validHttpUrl(
  value: string
): boolean {
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
          "The claim request came from an unexpected origin."
      },
      {
        status: 403
      }
    );
  }

  try {
    const body =
      (await request.json()) as ClaimBody;

    if (
      stringValue(body.website, 200)
    ) {
      return NextResponse.json(
        {
          ok: true,
          message:
            "Claim request submitted for verification."
        },
        {
          status: 201
        }
      );
    }

    const placeId =
      stringValue(body.placeId, 50);
    const claimantName =
      stringValue(body.claimantName, 120);
    const claimantRole =
      stringValue(body.claimantRole, 80);
    const businessEmail =
      stringValue(body.businessEmail, 254)
        .toLowerCase();
    const businessPhone =
      stringValue(body.businessPhone, 40);
    const officialWebsite =
      stringValue(body.officialWebsite, 500);
    const evidence =
      stringValue(body.evidence, 1500);

    if (
      !UUID_PATTERN.test(placeId)
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
      claimantName.length < 2 ||
      !ALLOWED_ROLES.has(claimantRole) ||
      !EMAIL_PATTERN.test(businessEmail) ||
      !validHttpUrl(officialWebsite) ||
      evidence.length < 20
    ) {
      return NextResponse.json(
        {
          error:
            "Complete the required claim information and explain how Venture can verify you."
        },
        {
          status: 400
        }
      );
    }

    const supabase =
      getSupabaseAdminClient();

    const {
      data: place,
      error: placeError
    } = await supabase
      .from("places")
      .select("id,name")
      .eq("id", placeId)
      .eq("status", "published")
      .maybeSingle();

    if (placeError) {
      throw placeError;
    }

    if (!place) {
      return NextResponse.json(
        {
          error:
            "That published place could not be found."
        },
        {
          status: 404
        }
      );
    }

    const { error } = await supabase
      .from("business_claim_requests")
      .insert({
        place_id: placeId,
        claimant_name: claimantName,
        claimant_role: claimantRole,
        business_email: businessEmail,
        business_phone:
          businessPhone || null,
        official_website:
          officialWebsite,
        evidence,
        source: "public_listing"
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "A pending claim from this email already exists for this listing."
          },
          {
            status: 409
          }
        );
      }

      if (
        error.code === "42P01"
      ) {
        return NextResponse.json(
          {
            error:
              "Listing claims are not active yet. The administrator must apply the claim-request migration."
          },
          {
            status: 503
          }
        );
      }

      throw error;
    }

    return NextResponse.json(
      {
        ok: true,
        message:
          "Claim request submitted. Venture will verify the relationship before granting control."
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "private, no-store"
        }
      }
    );
  } catch (error) {
    console.error(
      "Unable to submit business claim request",
      error
    );

    return NextResponse.json(
      {
        error:
          "The claim request could not be submitted. Please try again."
      },
      {
        status: 500
      }
    );
  }
}
