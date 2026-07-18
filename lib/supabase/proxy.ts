import {
  createServerClient
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest
} from "next/server";


export async function updateSupabaseSession(
  request: NextRequest
) {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL
      ?.trim();

  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ?.trim();

  if (
    !url ||
    !publishableKey
  ) {
    throw new Error(
      "Supabase public environment variables are not configured."
    );
  }

  let response =
    NextResponse.next({
      request
    });

  const supabase =
    createServerClient(
      url,
      publishableKey,
      {
        cookies: {
          getAll() {
            return request
              .cookies
              .getAll();
          },

          setAll(
            cookiesToSet
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value
              }) => {
                request
                  .cookies
                  .set(
                    name,
                    value
                  );
              }
            );

            response =
              NextResponse.next({
                request
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options
              }) => {
                response
                  .cookies
                  .set(
                    name,
                    value,
                    options
                  );
              }
            );
          }
        }
      }
    );

  await supabase
    .auth
    .getClaims();

  response.headers.set(
    "Cache-Control",
    "private, no-store"
  );

  return response;
}
