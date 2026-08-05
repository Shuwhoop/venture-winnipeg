import {
  NextResponse
} from "next/server";

import {
  getVentureAdmin
} from "@/lib/auth/admin";

import {
  parseVentureNewsletterDraft
} from "@/lib/newsletter/campaign-input";

import {
  buildVentureNewsletterCampaign
} from "@/lib/newsletter/campaign-template";


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
    unknown;

  try {
    body =
      await request.json();
  } catch {
    body = null;
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

  const parsed =
    parseVentureNewsletterDraft(
      record.draft
    );

  if (!parsed.draft) {
    return NextResponse.json(
      {
        error:
          parsed.errors[0] ||
          "Newsletter content is incomplete.",
        details:
          parsed.errors
      },
      {
        status:
          400
      }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin;

  const email =
    buildVentureNewsletterCampaign({
      draft:
        parsed.draft,
      appUrl,
      firstName:
        admin.email
          .split("@")[0] ||
        "there",
      testMode:
        true
    });

  return NextResponse.json({
    ok:
      true,
    subject:
      email.subject,
    html:
      email.html,
    text:
      email.text
  });
}
