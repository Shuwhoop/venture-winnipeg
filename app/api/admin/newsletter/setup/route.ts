import {
  NextResponse
} from "next/server";

import {
  getVentureAdmin
} from "@/lib/auth/admin";

import {
  ensureNewsletterResources
} from "@/lib/newsletter/production";


export const runtime =
  "nodejs";


export async function POST() {
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
          "Newsletter resources could not be created."
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
    segment:
      resources.segment,
    topic:
      resources.topic
  });
}
