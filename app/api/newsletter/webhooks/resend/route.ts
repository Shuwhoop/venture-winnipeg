import {
  NextResponse
} from "next/server";

import {
  Resend
} from "resend";

import {
  getNewsletterTopicName,
  listResendTopics,
  resendApiRequest
} from "@/lib/newsletter/resend";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";


export const runtime =
  "nodejs";


type DeliveryUpdate = {
  status:
    | "bounced"
    | "complained"
    | "unsubscribed";
  note: string;
};


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
): DeliveryUpdate | null {
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


async function contactPreferenceUpdate({
  type,
  data,
  email
}: {
  type: string;
  data: Record<string, unknown>;
  email: string;
}): Promise<DeliveryUpdate | null> {
  if (
    type !==
      "contact.updated"
  ) {
    return null;
  }

  if (
    data.unsubscribed ===
      true
  ) {
    return {
      status:
        "unsubscribed",
      note:
        "The recipient unsubscribed from Venture in Resend."
    };
  }

  const topics =
    await listResendTopics();

  if (
    topics.error ||
    topics.items.length === 0
  ) {
    return null;
  }

  const newsletterTopic =
    topics.items.find(
      (topic) =>
        topic.name
          .trim()
          .toLowerCase() ===
        getNewsletterTopicName()
          .trim()
          .toLowerCase()
    );

  if (!newsletterTopic) {
    return null;
  }

  const result =
    await resendApiRequest<{
      data?: Array<{
        id?: string;
        subscription?:
          | "opt_in"
          | "opt_out";
      }>;
    }>({
      path:
        `/contacts/${encodeURIComponent(email)}/topics`
    });

  if (!result.ok) {
    return null;
  }

  const optedOut =
    (result.data?.data || [])
      .some(
        (topic) =>
          topic.id ===
            newsletterTopic.id &&
          topic.subscription ===
            "opt_out"
      );

  return optedOut
    ? {
        status:
          "unsubscribed",
        note:
          "The recipient opted out of The Thursday Venture in Resend."
      }
    : null;
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

  const email =
    extractEmail(
      data
    );

  let update =
    deliveryUpdateForEvent(
      type
    );

  if (
    !update &&
    email
  ) {
    update =
      await contactPreferenceUpdate({
        type,
        data,
        email
      });
  }

  if (!update) {
    return NextResponse.json({
      ok:
        true,
      ignored:
        true,
      type
    });
  }

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
