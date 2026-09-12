import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/explore/:path*",
    "/tonight/:path*",
    "/build-outing/:path*",
    "/outings/:path*",
    "/listings/:path*",
    "/profile/:path*",
    "/saved/:path*",
    "/sign-in",
    "/beta/:path*",
    "/offline/:path*",
    "/auth/:path*"
  ]
};
