import {
  NextResponse
} from "next/server";

import {
  buildWelcomeEmail
} from "@/lib/newsletter/emails";

import {
  createOrReactivateResendContact,
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
        "Thanks for joining Venture."
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

  if (
    firstName.length < 1
  ) {
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
          "Please agree to receive the Thursday newsletter."
      },
      {
        status:
          400
      }
    );
  }

  if (
    !process.env.RESEND_API_KEY ||
    !process.env.NEWSLETTER_TOKEN_SECRET
  ) {
    return NextResponse.json(
      {
        error:
          "The newsletter service has not been configured yet."
      },
      {
        status:
          503
      }
    );
  }

  const supabase =
    getSupabaseAdminClient();

  const {
    data: existing,
    error: existingError
  } =
    await supabase
      .from(
        "newsletter_subscribers"
      )
      .select(
        "id, status, welcome_sent_at"
      )
      .eq(
        "email_normalized",
        email
      )
      .maybeSingle();

  if (existingError) {
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

  if (
    existing?.status ===
      "active"
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
    "I agree to receive the Venture by Boogie Bangers Thursday newsletter and understand that I can unsubscribe at any time.";

  let subscriberId:
    string;

  if (existing) {
    const {
      data,
      error
    } =
      await supabase
        .from(
          "newsletter_subscribers"
        )
        .update({
          first_name:
            firstName,
          email,
          status:
            "active",
          consent_source:
            cleanSource(
              body.source
            ),
          consent_version:
            "2026-07-18-v1",
          consent_text:
            consentText,
          consented_at:
            now,
          last_signup_at:
            now,
          unsubscribed_at:
            null,
          welcome_error:
            null,
          updated_at:
            now
        })
        .eq(
          "id",
          existing.id
        )
        .select("id")
        .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            "Venture could not reactivate this subscription."
        },
        {
          status:
            500
        }
      );
    }

    subscriberId =
      data.id;
  } else {
    const {
      data,
      error
    } =
      await supabase
        .from(
          "newsletter_subscribers"
        )
        .insert({
          first_name:
            firstName,
          email,
          email_normalized:
            email,
          status:
            "active",
          consent_source:
            cleanSource(
              body.source
            ),
          consent_version:
            "2026-07-18-v1",
          consent_text:
            consentText,
          consented_at:
            now,
          last_signup_at:
            now,
          signup_ip:
            getClientAddress(
              request
            ),
          signup_user_agent:
            request.headers
              .get("user-agent")
              ?.slice(0, 500) ||
            null
        })
        .select("id")
        .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            "Venture could not save this subscription."
        },
        {
          status:
            500
        }
      );
    }

    subscriberId =
      data.id;
  }

  const appUrl =
    (
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(
        request.url
      ).origin
    ).replace(/\/$/, "");

  const unsubscribeToken =
    createNewsletterToken({
      email,
      purpose:
        "unsubscribe"
    });

  const unsubscribeUrl =
    `${appUrl}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  const oneClickUnsubscribeUrl =
    `${appUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  const welcomeEmail =
    buildWelcomeEmail({
      firstName,
      appUrl,
      unsubscribeUrl
    });

  const contactResult =
    await createOrReactivateResendContact({
      email,
      firstName
    });

  const emailResult =
    await sendNewsletterEmail({
      to:
        email,
      subject:
        welcomeEmail.subject,
      html:
        welcomeEmail.html,
      text:
        welcomeEmail.text,
      unsubscribeUrl,
      oneClickUnsubscribeUrl
    });

  await supabase
    .from(
      "newsletter_subscribers"
    )
    .update({
      resend_contact_id:
        contactResult.id ||
        null,
      welcome_email_id:
        emailResult.id ||
        null,
      welcome_sent_at:
        emailResult.id
          ? now
          : null,
      welcome_error:
        emailResult.error ||
        contactResult.error ||
        null,
      updated_at:
        now
    })
    .eq(
      "id",
      subscriberId
    );

  return NextResponse.json({
    ok:
      true,
    welcomeSent:
      Boolean(
        emailResult.id
      ),
    message:
      emailResult.id
        ? "Welcome to Venture. Check your inbox for a little hello."
        : "You are subscribed. The welcome email could not be delivered yet, but you are on the list."
  });
}
