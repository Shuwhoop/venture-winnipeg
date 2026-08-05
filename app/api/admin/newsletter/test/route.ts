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

import {
  sendNewsletterEmail
} from "@/lib/newsletter/resend";


export const runtime =
  "nodejs";


function validEmail(
  value: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(value);
}


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

  const recipient =
    typeof record.recipient ===
      "string"
      ? record.recipient
          .trim()
          .toLowerCase()
      : "";

  if (!validEmail(recipient)) {
    return NextResponse.json(
      {
        error:
          "Enter a valid test recipient email address."
      },
      {
        status:
          400
      }
    );
  }

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

  const firstName =
    typeof record.firstName ===
      "string" &&
    record.firstName.trim()
      ? record.firstName
          .trim()
          .slice(0, 60)
      : "there";

  const email =
    buildVentureNewsletterCampaign({
      draft:
        parsed.draft,
      appUrl,
      firstName,
      testMode:
        true
    });

  const result =
    await sendNewsletterEmail({
      to:
        recipient,
      subject:
        `[TEST] ${email.subject}`,
      html:
        email.html,
      text:
        email.text
    });

  if (!result.id) {
    return NextResponse.json(
      {
        error:
          result.error ||
          "The test email could not be sent."
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
    emailId:
      result.id,
    message:
      `Test email sent to ${recipient}.`
  });
}
