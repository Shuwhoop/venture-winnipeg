import type {
  NextRequest
} from "next/server";
import { NextResponse } from "next/server";

import {
  updateSupabaseSession
} from "@/lib/supabase/proxy";

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

  if (pathname === "/" || isPrelaunchAppPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/newsletter";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return updateSupabaseSession(
    request
  );
}

export const config = {
  matcher: [
    "/",
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
