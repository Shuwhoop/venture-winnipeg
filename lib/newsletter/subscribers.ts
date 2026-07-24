import "server-only";

import {
  buildWelcomeEmail
} from "@/lib/newsletter/emails";

import {
  createOrReactivateResendContact,
  sendNewsletterEmail,
  unsubscribeResendContact
} from "@/lib/newsletter/resend";

import {
  createNewsletterToken,
  verifyNewsletterToken
} from "@/lib/newsletter/tokens";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";


function cleanAppUrl(
  appUrl: string
): string {
  return appUrl.replace(/\/$/, "");
}


export async function confirmNewsletterToken({
  token,
  appUrl
}: {
  token: string;
  appUrl: string;
}): Promise<{
  ok: boolean;
  alreadyConfirmed?: boolean;
  message: string;
}> {
  const payload =
    verifyNewsletterToken({
      token,
      purpose:
        "confirm"
    });

  if (!payload) {
    return {
      ok:
        false,
      message:
        "This confirmation link is invalid or has expired. Submit the newsletter form again for a fresh link."
    };
  }

  const supabase =
    getSupabaseAdminClient();

  const lookup =
    await supabase
      .from(
        "newsletter_subscribers"
      )
      .select(
        "id, first_name, status, confirmed_at"
      )
      .eq(
        "email_normalized",
        payload.email
      )
      .maybeSingle();

  if (
    lookup.error ||
    !lookup.data
  ) {
    return {
      ok:
        false,
      message:
        "Venture could not find this subscription request."
    };
  }

  if (
    lookup.data.status ===
      "active" &&
    lookup.data.confirmed_at
  ) {
    return {
      ok:
        true,
      alreadyConfirmed:
        true,
      message:
        "Your subscription is already confirmed."
    };
  }

  const now =
    new Date().toISOString();

  const updateResult =
    await supabase
      .from(
        "newsletter_subscribers"
      )
      .update({
        status:
          "active",
        confirmed_at:
          now,
        confirmation_error:
          null,
        unsubscribed_at:
          null,
        updated_at:
          now
      })
      .eq(
        "id",
        lookup.data.id
      );

  if (updateResult.error) {
    return {
      ok:
        false,
      message:
        "Venture could not confirm this subscription right now."
    };
  }

  const normalizedAppUrl =
    cleanAppUrl(appUrl);

  const unsubscribeToken =
    createNewsletterToken({
      email:
        payload.email,
      purpose:
        "unsubscribe"
    });

  const unsubscribeUrl =
    `${normalizedAppUrl}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  const oneClickUnsubscribeUrl =
    `${normalizedAppUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  const welcomeEmail =
    buildWelcomeEmail({
      firstName:
        lookup.data.first_name ||
        "there",
      appUrl:
        normalizedAppUrl,
      unsubscribeUrl
    });

  const [
    contactResult,
    emailResult
  ] = await Promise.all([
    createOrReactivateResendContact({
      email:
        payload.email,
      firstName:
        lookup.data.first_name ||
        "Subscriber"
    }),
    sendNewsletterEmail({
      to:
        payload.email,
      subject:
        welcomeEmail.subject,
      html:
        welcomeEmail.html,
      text:
        welcomeEmail.text,
      unsubscribeUrl,
      oneClickUnsubscribeUrl
    })
  ]);

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
      last_delivery_attempt_at:
        now,
      updated_at:
        now
    })
    .eq(
      "id",
      lookup.data.id
    );

  return {
    ok:
      true,
    message:
      emailResult.id
        ? "You’re confirmed. Welcome to The Thursday Venture."
        : "You’re confirmed. The welcome email could not be delivered, but your subscription is active."
  };
}


export async function unsubscribeNewsletterToken(
  token: string
): Promise<{
  ok: boolean;
  email?: string;
  message: string;
}> {
  const payload =
    verifyNewsletterToken({
      token,
      purpose:
        "unsubscribe"
    });

  if (!payload) {
    return {
      ok:
        false,
      message:
        "This unsubscribe link is invalid or has expired."
    };
  }

  const supabase =
    getSupabaseAdminClient();

  const now =
    new Date().toISOString();

  const {
    error
  } =
    await supabase
      .from(
        "newsletter_subscribers"
      )
      .update({
        status:
          "unsubscribed",
        unsubscribed_at:
          now,
        updated_at:
          now
      })
      .eq(
        "email_normalized",
        payload.email
      );

  if (error) {
    return {
      ok:
        false,
      message:
        "Venture could not update this subscription right now."
    };
  }

  await unsubscribeResendContact(
    payload.email
  );

  return {
    ok:
      true,
    email:
      payload.email,
    message:
      "You have been unsubscribed from The Thursday Venture."
  };
}
