import {
  NextResponse
} from "next/server";

import {
  unsubscribeResendContact
} from "@/lib/newsletter/resend";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  requireProfileUser
} from "@/lib/profile-server";

import {
  consumeRateLimit,
  getRequestAddress,
  isSameOriginRequest,
  rateLimitHeaders
} from "@/lib/server-rate-limit";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "This account request came from an untrusted origin." },
      { status: 403 }
    );
  }

  try {
    const { user } = await requireProfileUser();
    const rateLimit = consumeRateLimit({
      key: `newsletter:update:${user.id}:${getRequestAddress(request)}`,
      limit: 10,
      windowMs: 60 * 60 * 1000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many account requests were submitted. Try again shortly." },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit)
        }
      );
    }

    const email = user.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "This account does not have an email address." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const admin = getSupabaseAdminClient();
    const result = await admin
      .from("newsletter_subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: now,
        updated_at: now
      })
      .eq("email_normalized", email);

    if (result.error) {
      throw result.error;
    }

    await unsubscribeResendContact(email);

    return NextResponse.json(
      {
        ok: true,
        status: "unsubscribed"
      },
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        { error: "Sign in to change newsletter settings." },
        { status: 401 }
      );
    }

    console.error("Unable to update profile newsletter status:", error);

    return NextResponse.json(
      { error: "Venture could not update the newsletter right now." },
      { status: 500 }
    );
  }
}
