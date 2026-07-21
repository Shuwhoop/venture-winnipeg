import {
  NextResponse
} from "next/server";

import {
  getVentureAdmin
} from "@/lib/auth/admin";
import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

const ALLOWED_STATUS = new Set([
  "pending",
  "approved",
  "rejected",
  "withdrawn"
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sameOrigin(
  request: Request
): boolean {
  const origin =
    request.headers.get("origin");

  return !origin ||
    origin === new URL(request.url).origin;
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const admin =
    await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator access is required."
      },
      {
        status: 401
      }
    );
  }

  if (!sameOrigin(request)) {
    return NextResponse.json(
      {
        error:
          "The claim update came from an unexpected origin."
      },
      {
        status: 403
      }
    );
  }

  const { id } = await context.params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      {
        error:
          "The claim identifier is invalid."
      },
      {
        status: 400
      }
    );
  }

  const body = await request.json() as {
    status?: unknown;
    resolutionNotes?: unknown;
  };
  const status =
    typeof body.status === "string"
      ? body.status.trim()
      : "";
  const resolutionNotes =
    typeof body.resolutionNotes === "string"
      ? body.resolutionNotes.trim().slice(0, 1500)
      : "";

  if (!ALLOWED_STATUS.has(status)) {
    return NextResponse.json(
      {
        error:
          "Choose a valid claim status."
      },
      {
        status: 400
      }
    );
  }

  const supabase =
    getSupabaseAdminClient();
  const reviewed =
    status !== "pending";

  const { data, error } = await supabase
    .from("business_claim_requests")
    .update({
      status,
      resolution_notes:
        resolutionNotes || null,
      reviewed_by:
        reviewed ? admin.id : null,
      reviewed_at:
        reviewed
          ? new Date().toISOString()
          : null
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message
      },
      {
        status: 400
      }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error:
          "That claim request could not be found."
      },
      {
        status: 404
      }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Claim request updated."
  });
}
