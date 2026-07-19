import {
  NextResponse
} from "next/server";

import {
  unsubscribeNewsletterToken
} from "@/lib/newsletter/subscribers";


export const runtime =
  "nodejs";


export async function POST(
  request: Request
) {
  const token =
    new URL(
      request.url
    ).searchParams.get(
      "token"
    );

  if (!token) {
    return NextResponse.json(
      {
        error:
          "The unsubscribe token is missing."
      },
      {
        status:
          400
      }
    );
  }

  const result =
    await unsubscribeNewsletterToken(
      token
    );

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

  return new NextResponse(
    "",
    {
      status:
        200
    }
  );
}


export async function GET(
  request: Request
) {
  const url =
    new URL(
      request.url
    );

  const token =
    url.searchParams.get(
      "token"
    ) ||
    "";

  return NextResponse.redirect(
    new URL(
      `/newsletter/unsubscribe?token=${encodeURIComponent(token)}`,
      url.origin
    )
  );
}
