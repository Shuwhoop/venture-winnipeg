import type {
  NextRequest
} from "next/server";
import { NextResponse } from "next/server";

import {
  updateSupabaseSession
} from "@/lib/supabase/proxy";

const PUBLICATION_HOME = "https://boogiebangers.com/venture-access/";
const PUBLICATION_SUBMIT = "https://boogiebangers.com/venture-access/submit/";
const PUBLICATION_CONFIRM = "https://boogiebangers.com/venture-access/confirm/";

const PRELAUNCH_APP_PATHS = [
  "/explore",
  "/tonight",
  "/saved",
  "/profile",
  "/sign-in",
  "/build-outing",
  "/listings",
  "/outings",
  "/beta"
];

function isPrelaunchAppPath(pathname: string) {
  return PRELAUNCH_APP_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function proxy(
  request: NextRequest
) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/newsletter/confirm") {
    const url = new URL(PUBLICATION_CONFIRM);
    const token = request.nextUrl.searchParams.get("token");
    if (token) url.searchParams.set("token", token);
    return NextResponse.redirect(url);
  }

  if (pathname === "/submit") {
    return NextResponse.redirect(PUBLICATION_SUBMIT);
  }

  if (
    pathname === "/" ||
    pathname === "/newsletter" ||
    isPrelaunchAppPath(pathname)
  ) {
    return NextResponse.redirect(PUBLICATION_HOME);
  }

  return updateSupabaseSession(
    request
  );
}

export const config = {
  matcher: [
    "/",
    "/newsletter",
    "/newsletter/confirm",
    "/submit",
    "/admin/:path*",
    "/api/admin/:path*",
    "/explore/:path*",
    "/tonight/:path*",
    "/profile/:path*",
    "/saved/:path*",
    "/sign-in",
    "/build-outing/:path*",
    "/listings/:path*",
    "/outings/:path*",
    "/beta/:path*",
    "/auth/:path*"
  ]
};
