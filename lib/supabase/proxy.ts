import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password"
]);

const PRIVATE_APP_PREFIXES = [
  "/explore",
  "/tonight",
  "/build-outing",
  "/outings",
  "/listings",
  "/profile",
  "/saved",
  "/sign-in",
  "/beta",
  "/offline"
];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getConfiguredAdminEmails() {
  return new Set(
    (process.env.VENTURE_ADMIN_EMAILS || "")
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean)
  );
}

function copyResponseCookies(source: NextResponse, destination: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    destination.cookies.set(cookie);
  }

  return destination;
}

function normalizedPath(pathname: string) {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function isPublicAdminPath(pathname: string) {
  return PUBLIC_ADMIN_PATHS.has(normalizedPath(pathname));
}

function isPrivateAppPath(pathname: string) {
  const normalized = normalizedPath(pathname);
  return PRIVATE_APP_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export async function updateSupabaseSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const claimsResult = await supabase.auth.getClaims();
  const claims = claimsResult.data?.claims as Record<string, unknown> | undefined;
  const email = typeof claims?.email === "string" ? normalizeEmail(claims.email) : "";
  const isAdmin = Boolean(email) && getConfiguredAdminEmails().has(email);

  const pathname = request.nextUrl.pathname;
  const isAdminApi = pathname.startsWith("/api/admin/");
  const isProtectedAdminPage =
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    !isPublicAdminPath(pathname);

  if (isAdminApi || isProtectedAdminPage) {
    if (!isAdmin) {
      if (isAdminApi) {
        const unauthorized = NextResponse.json(
          { error: "Administrator access is required." },
          {
            status: 401,
            headers: { "Cache-Control": "private, no-store" }
          }
        );

        return copyResponseCookies(response, unauthorized);
      }

      const destination = new URL("/admin/login", request.url);
      destination.searchParams.set("error", email ? "unauthorized" : "required");
      destination.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

      return copyResponseCookies(response, NextResponse.redirect(destination));
    }
  }

  if (isPrivateAppPath(pathname) && !isAdmin) {
    const destination = new URL("/newsletter", request.url);
    destination.searchParams.set("app", "private");
    return copyResponseCookies(response, NextResponse.redirect(destination));
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
