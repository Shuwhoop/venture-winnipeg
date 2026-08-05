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
  ensureNewsletterResources
} from "@/lib/newsletter/production";

import {
  createResendBroadcastDraft,
  isNewsletterPostalAddressConfigured
} from "@/lib/newsletter/resend";


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

  if (
    !isNewsletterPostalAddressConfigured()
  ) {
    return NextResponse.json(
      {
        error:
          "Add VENTURE_POSTAL_ADDRESS before creating a public campaign draft."
      },
      {
        status:
          409
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

  const resources =
    await ensureNewsletterResources();

  if (
    resources.error ||
    !resources.segment ||
    !resources.topic
  ) {
    return NextResponse.json(
      {
        error:
          resources.error ||
          "Newsletter resources are incomplete."
      },
      {
        status:
          502
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
      appUrl
    });

  const result =
    await createResendBroadcastDraft({
      segmentId:
        resources.segment.id,
      topicId:
        resources.topic.id,
      name:
        parsed.draft.issueLabel,
      subject:
        email.subject,
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
          "The Resend draft could not be created."
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
    broadcastId:
      result.id,
    message:
      "Draft created in Resend. Review it there before scheduling or sending."
  });
}
