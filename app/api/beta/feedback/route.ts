import {
  NextResponse
} from "next/server";

import {
  checkBetaRateLimit,
  cleanContactEmail,
  cleanFeedbackCategory,
  cleanFeedbackMessage,
  cleanPagePath,
  cleanRating,
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
      { error: "This feedback request was rejected." },
      { status: 403 }
    );
  }

  const key =
    `beta-feedback:${getClientAddress(request)}`;

  if (!checkBetaRateLimit({
    key,
    limit: 10,
    windowMinutes: 60
  })) {
    return NextResponse.json(
      {
        error:
          "Too many feedback attempts. Please try again later."
      },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body =
      await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "The feedback form could not be read." },
      { status: 400 }
    );
  }

  if (
    typeof body.website === "string" &&
    body.website.trim()
  ) {
    return NextResponse.json({
      ok: true,
      message: "Thanks for helping Venture improve."
    });
  }

  const sessionId =
    cleanSessionId(body.sessionId);
  const pagePath =
    cleanPagePath(body.pagePath);
  const category =
    cleanFeedbackCategory(body.category);
  const message =
    cleanFeedbackMessage(body.message);
  const rating =
    cleanRating(body.rating);
  const contactEmail =
    cleanContactEmail(body.contactEmail);
  const permissionToContact =
    body.permissionToContact === true;

  if (!sessionId || !pagePath || !category || !message) {
    return NextResponse.json(
      {
        error:
          "Choose a category and write at least five characters."
      },
      { status: 400 }
    );
  }

  if (
    typeof body.contactEmail === "string" &&
    body.contactEmail.trim() &&
    !contactEmail
  ) {
    return NextResponse.json(
      { error: "Enter a valid contact email address." },
      { status: 400 }
    );
  }

  if (contactEmail && !permissionToContact) {
    return NextResponse.json(
      {
        error:
          "Please allow Venture to contact you before including an email address."
      },
      { status: 400 }
    );
  }

  const supabase =
    getSupabaseAdminClient();

  const { data, error } =
    await supabase
      .from("beta_feedback")
      .insert({
        session_id: sessionId,
        page_path: pagePath,
        category,
        rating,
        message,
        contact_email: contactEmail,
        permission_to_contact:
          Boolean(contactEmail) && permissionToContact
      })
      .select("id")
      .single();

  if (error || !data) {
    console.error("Beta feedback insert failed", {
      code: error?.code,
      message: error?.message
    });

    return NextResponse.json(
      {
        error:
          error?.code === "42P01"
            ? "Beta feedback has not been installed yet."
            : "Venture could not save this feedback."
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    feedbackId: data.id,
    message:
      "Thanks. Your feedback is now part of Venture's build queue."
  });
}
