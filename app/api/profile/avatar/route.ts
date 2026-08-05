import {
  NextResponse
} from "next/server";

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
    const {
      supabase,
      user
    } = await requireProfileUser();
    const rateLimit = consumeRateLimit({
      key: `avatar:delete:${user.id}:${getRequestAddress(request)}`,
      limit: 20,
      windowMs: 15 * 60 * 1000
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


    const profileResult = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error) {
      throw profileResult.error;
    }

    const avatarPath = profileResult.data?.avatar_path;

    if (typeof avatarPath === "string" && avatarPath.startsWith(`${user.id}/`)) {
      const removeResult = await supabase.storage
        .from("avatars")
        .remove([avatarPath]);

      if (removeResult.error) {
        throw removeResult.error;
      }
    }

    const updateResult = await supabase
      .from("profiles")
      .update({
        avatar_path: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateResult.error) {
      throw updateResult.error;
    }

    return NextResponse.json(
      { ok: true },
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        { error: "Sign in to remove an avatar." },
        { status: 401 }
      );
    }

    console.error("Unable to remove Venture avatar:", error);

    return NextResponse.json(
      { error: "Venture could not remove this avatar." },
      { status: 500 }
    );
  }
}
