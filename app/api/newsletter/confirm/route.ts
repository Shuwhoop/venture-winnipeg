import {
  NextResponse
} from "next/server";

import {
  confirmNewsletterToken
} from "@/lib/newsletter/subscribers";


export const runtime =
  "nodejs";


export async function POST(
  request: Request
) {
  let body:
    {
      token?: unknown;
    };

  try {
    body =
      await request.json() as {
        token?: unknown;
      };
  } catch {
    return NextResponse.json(
      {
        error:
          "The confirmation request could not be read."
      },
      {
        status:
          400
      }
    );
  }

  const token =
    typeof body.token ===
      "string"
      ? body.token
      : "";

  if (!token) {
    return NextResponse.json(
      {
        error:
          "The confirmation token is missing."
      },
      {
        status:
          400
      }
    );
  }

  const appUrl =
    (
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(
        request.url
      ).origin
    ).replace(/\/$/, "");

  const result =
    await confirmNewsletterToken({
      token,
      appUrl
    });

  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.message
      },
      {
        status:
          400
      }
    );
  }

  return NextResponse.json({
    ok:
      true,
    alreadyConfirmed:
      Boolean(
        result.alreadyConfirmed
      ),
    message:
      result.message
  });
}
