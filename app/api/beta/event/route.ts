import {
  NextResponse
} from "next/server";

import {
  checkBetaRateLimit,
  cleanEventName,
  cleanEventProperties,
  cleanPagePath,
  cleanSessionId,
  getClientAddress,
  isAllowedBetaOrigin
} from "@/lib/beta/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request
) {
  if (!isAllowedBetaOrigin(request)) {
    return NextResponse.json(
      { error: "This analytics request was rejected." },
      { status: 403 }
    );
  }

  const key =
    `beta-event:${getClientAddress(request)}`;

  if (!checkBetaRateLimit({
    key,
    limit: 120,
    windowMinutes: 60
  })) {
    return NextResponse.json(
      { error: "Too many analytics requests." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body =
      await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "The analytics request could not be read." },
      { status: 400 }
    );
  }

  if (
    typeof body.website === "string" &&
    body.website.trim()
  ) {
    return NextResponse.json({ ok: true });
  }

  const sessionId =
    cleanSessionId(body.sessionId);
  const eventName =
    cleanEventName(body.eventName);
  const pagePath =
    cleanPagePath(body.pagePath);

  if (!sessionId || !eventName || !pagePath) {
    return NextResponse.json(
      { error: "The analytics request is invalid." },
      { status: 400 }
    );
  }

  const supabase =
    getSupabaseAdminClient();

  const { error } =
    await supabase
      .from("beta_events")
      .insert({
        session_id: sessionId,
        event_name: eventName,
        page_path: pagePath,
        properties:
          cleanEventProperties(body.properties)
      });

  if (error) {
    console.error("Beta event insert failed", {
      code: error.code,
      message: error.message
    });

    return NextResponse.json(
      {
        error:
          error.code === "42P01"
            ? "Beta analytics has not been installed yet."
            : "Venture could not record this analytics event."
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
