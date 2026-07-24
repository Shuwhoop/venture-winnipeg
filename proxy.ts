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
    "/profile",
    "/saved/:path*",
    "/sign-in",
    "/auth/:path*"
  ]
};
