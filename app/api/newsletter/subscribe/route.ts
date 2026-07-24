import {
  NextResponse
} from "next/server";

import {
  buildConfirmationEmail
} from "@/lib/newsletter/emails";

import {
  sendNewsletterEmail
} from "@/lib/newsletter/resend";

import {
  createNewsletterToken
} from "@/lib/newsletter/tokens";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";


export const runtime =
  "nodejs";


type SubscribeBody = {
  firstName?: unknown;
  email?: unknown;
  consent?: unknown;
  source?: unknown;
  website?: unknown;
};


type RateLimitEntry = {
  count: number;
  resetAt: number;
};


const rateLimits =
  new Map<
    string,
    RateLimitEntry
  >();


function getClientAddress(
  request: Request
): string {
  return (
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    request.headers
      .get("x-real-ip") ||
    "unknown"
  );
}


function checkRateLimit(
  key: string
): boolean {
  const now =
    Date.now();

  const current =
    rateLimits.get(key);

  if (
    !current ||
    current.resetAt < now
  ) {
    rateLimits.set(
      key,
      {
        count:
          1,
        resetAt:
          now +
          60 *
            60 *
            1000
      }
    );

    return true;
  }

  if (current.count >= 5) {
    return false;
  }

  current.count += 1;
  rateLimits.set(
    key,
    current
  );

  return true;
}


function isValidEmail(
  email: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);
}


function cleanSource(
  value: unknown
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "newsletter-page";
  }

  const cleaned =
    value
      .trim()
      .slice(0, 80);

  return cleaned ||
    "newsletter-page";
}


export async function POST(
  request: Request
) {
  if (
    !checkRateLimit(
      getClientAddress(
        request
      )
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Too many signup attempts. Please try again later."
      },
      {
        status:
          429
      }
    );
  }

  let body:
    SubscribeBody;

  try {
    body =
      await request.json() as
        SubscribeBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "The signup form could not be read."
      },
      {
        status:
          400
      }
    );
  }

  if (
    typeof body.website ===
      "string" &&
    body.website.trim()
  ) {
    return NextResponse.json({
      ok:
        true,
      message:
        "Check your inbox to confirm your subscription."
    });
  }

  const firstName =
    typeof body.firstName ===
      "string"
      ? body.firstName
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 60)
      : "";

  const email =
    typeof body.email ===
      "string"
      ? body.email
          .trim()
          .toLowerCase()
          .slice(0, 254)
      : "";

  if (firstName.length < 1) {
    return NextResponse.json(
      {
        error:
          "Enter your first name."
      },
      {
        status:
          400
      }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      {
        error:
          "Enter a valid email address."
      },
      {
        status:
          400
      }
    );
  }

  if (body.consent !== true) {
    return NextResponse.json(
      {
        error:
          "Please agree to receive The Thursday Venture."
      },
      {
        status:
          400
      }
    );
  }

  if (
    !process.env.RESEND_API_KEY ||
    !process.env.NEWSLETTER_TOKEN_SECRET ||
    !process.env.SUPABASE_SECRET_KEY
  ) {
    return NextResponse.json(
      {
        error:
          "The newsletter service is not fully configured yet."
      },
      {
        status:
          503
      }
    );
  }

  const supabase =
    getSupabaseAdminClient();

  const normalizedLookup =
    await supabase
      .from(
        "newsletter_subscribers"
      )
      .select(
        "id, status, confirmed_at"
      )
      .eq(
        "email_normalized",
        email
      )
      .maybeSingle();

  if (normalizedLookup.error) {
    console.error(
      "Newsletter normalized lookup failed",
      normalizedLookup.error
    );

    return NextResponse.json(
      {
        error:
          "Venture could not check this subscription."
      },
      {
        status:
          500
      }
    );
  }

  let existing =
    normalizedLookup.data;

  if (!existing) {
    const legacyLookup =
      await supabase
        .from(
          "newsletter_subscribers"
        )
        .select(
          "id, status, confirmed_at"
        )
        .eq(
          "email",
          email
        )
        .maybeSingle();

    if (legacyLookup.error) {
      console.error(
        "Newsletter legacy lookup failed",
        legacyLookup.error
      );

      return NextResponse.json(
        {
          error:
            "Venture could not check this subscription."
        },
        {
          status:
            500
        }
      );
    }

    existing =
      legacyLookup.data;
  }

  if (
    existing?.status ===
      "active" &&
    existing.confirmed_at
  ) {
    return NextResponse.json({
      ok:
        true,
      alreadySubscribed:
        true,
      message:
        "You are already subscribed to The Thursday Venture."
    });
  }

  const now =
    new Date().toISOString();

  const consentText =
    "I agree to receive The Thursday Venture from Venture by Boogie Bangers and understand that I can unsubscribe at any time.";

  const subscriberValues = {
    first_name:
      firstName,
    email,
    email_normalized:
      email,
    status:
      "pending",
    consent_source:
      cleanSource(
        body.source
      ),
    consent_version:
      "2026-07-22-v2",
    consent_text_version:
      "2026-07-22-v2",
    consent_text:
      consentText,
    consented_at:
      now,
    last_signup_at:
      now,
    confirmed_at:
      null,
    unsubscribed_at:
      null,
    confirmation_error:
      null,
    updated_at:
      now
  };

  let subscriberId:
    string;

  if (existing) {
    const result =
      await supabase
        .from(
          "newsletter_subscribers"
        )
        .update(
          subscriberValues
        )
        .eq(
          "id",
          existing.id
        )
        .select("id")
        .single();

    if (
      result.error ||
      !result.data
    ) {
      console.error(
        "Newsletter pending update failed",
        result.error
      );

      return NextResponse.json(
        {
          error:
            "Venture could not update this subscription request."
        },
        {
          status:
            500
        }
      );
    }

    subscriberId =
      result.data.id;
  } else {
    const result =
      await supabase
        .from(
          "newsletter_subscribers"
        )
        .insert({
          ...subscriberValues,
          signup_ip:
            getClientAddress(
              request
            ),
          signup_user_agent:
            request.headers
              .get("user-agent")
              ?.slice(0, 500) ||
            null,
          created_at:
            now
        })
        .select("id")
        .single();

    if (
      result.error ||
      !result.data
    ) {
      console.error(
        "Newsletter pending insert failed",
        result.error
      );

      return NextResponse.json(
        {
          error:
            "Venture could not save this subscription request."
        },
        {
          status:
            500
        }
      );
    }

    subscriberId =
      result.data.id;
  }

  const appUrl =
    (
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(
        request.url
      ).origin
    ).replace(/\/$/, "");

  const confirmToken =
    createNewsletterToken({
      email,
      purpose:
        "confirm",
      lifetimeDays:
        2
    });

  const confirmUrl =
    `${appUrl}/newsletter/confirm?token=${encodeURIComponent(confirmToken)}`;

  const confirmationEmail =
    buildConfirmationEmail({
      firstName,
      confirmUrl
    });

  const emailResult =
    await sendNewsletterEmail({
      to:
        email,
      subject:
        confirmationEmail.subject,
      html:
        confirmationEmail.html,
      text:
        confirmationEmail.text
    });

  await supabase
    .from(
      "newsletter_subscribers"
    )
    .update({
      confirmation_email_id:
        emailResult.id ||
        null,
      confirmation_sent_at:
        emailResult.id
          ? now
          : null,
      confirmation_error:
        emailResult.error ||
        null,
      last_delivery_attempt_at:
        now,
      updated_at:
        now
    })
    .eq(
      "id",
      subscriberId
    );

  if (!emailResult.id) {
    return NextResponse.json(
      {
        error:
          "Your request was saved, but Venture could not send the confirmation email. Check the sender setup, then submit again."
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
    pendingConfirmation:
      true,
    message:
      "Check your inbox and confirm your subscription. The link expires in 48 hours."
  });
}
