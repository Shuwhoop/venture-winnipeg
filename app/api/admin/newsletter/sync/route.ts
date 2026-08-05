import {
  NextResponse
} from "next/server";

import {
  getVentureAdmin
} from "@/lib/auth/admin";

import {
  syncNewsletterAudience
} from "@/lib/newsletter/production";


export const runtime =
  "nodejs";


export async function POST(
  request: Request
) {
  const admin =
    await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator access is required."
      },
      {
        status:
          401
      }
    );
  }

  let body:
    unknown = {};

  try {
    body =
      await request.json();
  } catch {
    body = {};
  }

  const record =
    body &&
    typeof body ===
      "object"
      ? body as Record<
          string,
          unknown
        >
      : {};

  const offset =
    typeof record.offset ===
      "number"
      ? record.offset
      : 0;

  const result =
    await syncNewsletterAudience({
      offset
    });

  if (
    result.processed === 0 &&
    result.errors.length > 0
  ) {
    return NextResponse.json(
      {
        error:
          result.errors[0],
        details:
          result.errors
      },
      {
        status:
          502
      }
    );
  }

  return NextResponse.json({
    ok:
      true,
    ...result
  });
}
