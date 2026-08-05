import {
  NextResponse
} from "next/server";

import {
  Resend
} from "resend";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";


export const runtime =
  "nodejs";


function normalizeEmail(
  value: unknown
): string {
  return typeof value ===
    "string"
    ? value
        .trim()
        .toLowerCase()
    : "";
}


function extractEmail(
  data: Record<
    string,
    unknown
  >
): string {
  const direct =
    normalizeEmail(
      data.email
    );

  if (direct) {
    return direct;
  }

  if (
    Array.isArray(
      data.to
    )
  ) {
    for (
      const recipient of
      data.to
    ) {
      const email =
        normalizeEmail(
          recipient
        );

      if (email) {
        return email;
      }
    }
  }

  return "";
}


function deliveryUpdateForEvent(
  type: string
): {
  status:
    | "bounced"
    | "complained";
  note: string;
} | null {
  if (
    type ===
      "email.bounced"
  ) {
    return {
      status:
        "bounced",
      note:
        "Resend reported a permanent delivery bounce."
    };
  }

  if (
    type ===
      "email.complained"
  ) {
    return {
      status:
        "complained",
      note:
        "The recipient marked a Venture email as spam."
    };
  }

  if (
    type ===
      "email.suppressed" ||
    type ===
      "suppression.added"
  ) {
    return {
      status:
        "bounced",
      note:
        "Resend suppressed this address from future delivery."
    };
  }

  return null;
}


export async function POST(
  request: Request
) {
  const apiKey =
    process.env.RESEND_API_KEY;

  const webhookSecret =
    process.env.RESEND_WEBHOOK_SECRET;

  if (
    !apiKey ||
    !webhookSecret
  ) {
    return NextResponse.json(
      {
        error:
          "The Resend webhook is not configured."
      },
      {
        status:
          503
      }
    );
  }

  const id =
    request.headers.get(
      "svix-id"
    );

  const timestamp =
    request.headers.get(
      "svix-timestamp"
    );

  const signature =
    request.headers.get(
      "svix-signature"
    );

  if (
    !id ||
    !timestamp ||
    !signature
  ) {
    return NextResponse.json(
      {
        error:
          "Webhook signature headers are missing."
      },
      {
        status:
          400
      }
    );
  }

  const payload =
    await request.text();

  let event:
    unknown;

  try {
    const resend =
      new Resend(
        apiKey
      );

    event =
      resend.webhooks.verify({
        payload,
        headers: {
          id,
          timestamp,
          signature
        },
        webhookSecret
      });
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid webhook signature."
      },
      {
        status:
          400
      }
    );
  }

  if (
    !event ||
    typeof event !==
      "object"
  ) {
    return NextResponse.json({
      ok:
        true,
      ignored:
        true
    });
  }

  const record =
    event as Record<
      string,
      unknown
    >;

  const type =
    typeof record.type ===
      "string"
      ? record.type
      : "";

  const data =
    record.data &&
    typeof record.data ===
      "object"
      ? record.data as Record<
          string,
          unknown
        >
      : {};

  const update =
    deliveryUpdateForEvent(
      type
    );

  if (!update) {
    return NextResponse.json({
      ok:
        true,
      ignored:
        true,
      type
    });
  }

  const email =
    extractEmail(
      data
    );

  if (!email) {
    return NextResponse.json({
      ok:
        true,
      ignored:
        true,
      type,
      reason:
        "No recipient email was included."
    });
  }

  const now =
    new Date()
      .toISOString();

  const supabase =
    getSupabaseAdminClient();

  const result =
    await supabase
      .from(
        "newsletter_subscribers"
      )
      .update({
        status:
          update.status,
        unsubscribed_at:
          now,
        welcome_error:
          update.note,
        updated_at:
          now
      })
      .eq(
        "email_normalized",
        email
      );

  if (result.error) {
    return NextResponse.json(
      {
        error:
          "Venture could not store the delivery status."
      },
      {
        status:
          500
      }
    );
  }

  return NextResponse.json({
    ok:
      true,
    type,
    status:
      update.status
  });
}
