import "server-only";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  unsubscribeResendContact
} from "@/lib/newsletter/resend";

import {
  verifyNewsletterToken
} from "@/lib/newsletter/tokens";


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
      "You have been unsubscribed from the Venture newsletter."
  };
}
