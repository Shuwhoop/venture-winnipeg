import type {
  NextRequest
} from "next/server";

import {
  updateSupabaseSession
} from "@/lib/supabase/proxy";

export async function proxy(
  request: NextRequest
) {
  return updateSupabaseSession(
    request
  );
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/profile/:path*",
    "/saved/:path*",
    "/sign-in",
    "/auth/:path*"
  ]
};
