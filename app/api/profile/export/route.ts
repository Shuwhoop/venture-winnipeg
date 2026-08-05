import {
  NextResponse
} from "next/server";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  requireProfileUser
} from "@/lib/profile-server";

import {
  consumeRateLimit,
  getRequestAddress,
  rateLimitHeaders
} from "@/lib/server-rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user } = await requireProfileUser();
    const rateLimit = consumeRateLimit({
      key: `data:export:${user.id}:${getRequestAddress(request)}`,
      limit: 5,
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

    const admin = getSupabaseAdminClient();
    const email = user.email?.toLowerCase() ?? "";

    const [
      profile,
      preferences,
      notifications,
      savedListings,
      savedOutings,
      visits,
      newsletter
    ] = await Promise.all([
      admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      admin.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("user_saved_listings").select("*").eq("user_id", user.id).order("saved_at", { ascending: false }),
      admin.from("user_saved_outings").select("*").eq("user_id", user.id).order("saved_at", { ascending: false }),
      admin.from("user_visits").select("*").eq("user_id", user.id).order("visited_at", { ascending: false }),
      email
        ? admin
            .from("newsletter_subscribers")
            .select(
              "first_name, email, status, consented_at, consent_source, confirmed_at, unsubscribed_at, created_at, updated_at"
            )
            .eq("email_normalized", email)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    const failed = [
      profile,
      preferences,
      notifications,
      savedListings,
      savedOutings,
      visits,
      newsletter
    ].find((result) => result.error);

    if (failed?.error) {
      throw failed.error;
    }

    const payload = {
      exportVersion: "venture-profile-v1",
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at
      },
      profile: profile.data,
      preferences: preferences.data,
      notifications: notifications.data,
      savedListings: savedListings.data ?? [],
      savedOutings: savedOutings.data ?? [],
      visits: visits.data ?? [],
      newsletter: newsletter.data
    };

    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(
      JSON.stringify(payload, null, 2),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition":
            `attachment; filename="venture-data-${date}.json"`,
          "Cache-Control": "private, no-store",
          ...rateLimitHeaders(rateLimit)
        }
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        { error: "Sign in to export your Venture data." },
        { status: 401 }
      );
    }

    console.error("Unable to export Venture profile data:", error);

    return NextResponse.json(
      { error: "Venture could not prepare your data export." },
      { status: 500 }
    );
  }
}
