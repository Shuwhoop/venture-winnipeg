import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  getSupabaseServerClient
} from "@/lib/supabase/server";

function safeNextPath(
  value: string | null
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/profile";
  }

  return value;
}

export async function GET(
  request: NextRequest
) {
  const code =
    request.nextUrl.searchParams.get("code");
  const nextPath = safeNextPath(
    request.nextUrl.searchParams.get("next")
  );

  if (!code) {
    const errorUrl = new URL(
      "/sign-in",
      request.url
    );

    errorUrl.searchParams.set(
      "error",
      "The sign-in link was incomplete. Please request a new one."
    );
    errorUrl.searchParams.set(
      "next",
      nextPath
    );

    return NextResponse.redirect(errorUrl);
  }

  const supabase =
    await getSupabaseServerClient();

  const { error } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (error) {
    const errorUrl = new URL(
      "/sign-in",
      request.url
    );

    errorUrl.searchParams.set(
      "error",
      "That sign-in link expired or was already used. Please request another."
    );
    errorUrl.searchParams.set(
      "next",
      nextPath
    );

    return NextResponse.redirect(errorUrl);
  }

  const destination = new URL(
    nextPath,
    request.url
  );

  destination.searchParams.set(
    "account",
    "connected"
  );

  return NextResponse.redirect(destination);
}
