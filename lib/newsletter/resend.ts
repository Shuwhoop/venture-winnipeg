import "server-only";

import {
  ventureBrand
} from "@/lib/venture-brand";


const RESEND_API_BASE =
  "https://api.resend.com";


type ResendRequestOptions = {
  method?:
    | "POST"
    | "PATCH";
  body: Record<
    string,
    unknown
  >;
};


type ResendEmailResult = {
  id?: string;
  error?: string;
};


export function isNewsletterDeliveryConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
    process.env.VENTURE_EMAIL_FROM
  );
}


export function isUsingResendTestSender(): boolean {
  const from =
    process.env.VENTURE_EMAIL_FROM ||
    "Venture by Boogie Bangers <onboarding@resend.dev>";

  return from.includes(
    "onboarding@resend.dev"
  );
}


function getResendApiKey(): string {
  const apiKey =
    process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured."
    );
  }

  return apiKey;
}


async function resendRequest<T>({
  path,
  options
}: {
  path: string;
  options: ResendRequestOptions;
}): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  error: string;
}> {
  try {
    const response =
      await fetch(
        `${RESEND_API_BASE}${path}`,
        {
          method:
            options.method ??
            "POST",
          headers: {
            Authorization:
              `Bearer ${getResendApiKey()}`,
            "Content-Type":
              "application/json",
            "User-Agent":
              "Venture-by-Boogie-Bangers/1.0"
          },
          body:
            JSON.stringify(
              options.body
            ),
          cache:
            "no-store"
        }
      );

    const responseText =
      await response.text();

    let data:
      T | null = null;

    if (responseText) {
      try {
        data =
          JSON.parse(
            responseText
          ) as T;
      } catch {
        data = null;
      }
    }

    const error =
      response.ok
        ? ""
        : (
            data &&
            typeof data ===
              "object" &&
            "message" in data &&
            typeof data.message ===
              "string"
              ? data.message
              : `Resend request failed with status ${response.status}.`
          );

    return {
      ok:
        response.ok,
      status:
        response.status,
      data,
      error
    };
  } catch (error) {
    return {
      ok:
        false,
      status:
        0,
      data:
        null,
      error:
        error instanceof Error
          ? error.message
          : "Resend could not be reached."
    };
  }
}


export async function sendNewsletterEmail({
  to,
  subject,
  html,
  text,
  unsubscribeUrl,
  oneClickUnsubscribeUrl
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string;
  oneClickUnsubscribeUrl?: string;
}): Promise<ResendEmailResult> {
  const from =
    process.env.VENTURE_EMAIL_FROM ||
    "Venture by Boogie Bangers <onboarding@resend.dev>";

  const replyTo =
    process.env.VENTURE_EMAIL_REPLY_TO ||
    ventureBrand.replyToEmail;

  const headers:
    Record<string, string> = {};

  if (
    unsubscribeUrl &&
    oneClickUnsubscribeUrl
  ) {
    headers[
      "List-Unsubscribe"
    ] = `<${oneClickUnsubscribeUrl}>`;

    headers[
      "List-Unsubscribe-Post"
    ] = "List-Unsubscribe=One-Click";
  }

  const result =
    await resendRequest<{
      id?: string;
      message?: string;
    }>({
      path:
        "/emails",
      options: {
        body: {
          from,
          to: [to],
          subject,
          html,
          text,
          reply_to:
            replyTo,
          ...(Object.keys(headers).length > 0
            ? { headers }
            : {})
        }
      }
    });

  if (!result.ok) {
    return {
      error:
        result.error
    };
  }

  return {
    id:
      result.data?.id
  };
}


export async function createOrReactivateResendContact({
  email,
  firstName
}: {
  email: string;
  firstName: string;
}): Promise<{
  id?: string;
  error?: string;
}> {
  if (!process.env.RESEND_API_KEY) {
    return {
      error:
        "RESEND_API_KEY is not configured."
    };
  }

  const createResult =
    await resendRequest<{
      id?: string;
      message?: string;
    }>({
      path:
        "/contacts",
      options: {
        body: {
          email,
          first_name:
            firstName,
          unsubscribed:
            false
        }
      }
    });

  if (createResult.ok) {
    return {
      id:
        createResult.data?.id
    };
  }

  const updateResult =
    await resendRequest<{
      id?: string;
      message?: string;
    }>({
      path:
        `/contacts/${encodeURIComponent(email)}`,
      options: {
        method:
          "PATCH",
        body: {
          first_name:
            firstName,
          unsubscribed:
            false
        }
      }
    });

  if (!updateResult.ok) {
    return {
      error:
        updateResult.error ||
        createResult.error
    };
  }

  return {
    id:
      updateResult.data?.id
  };
}


export async function unsubscribeResendContact(
  email: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    return;
  }

  try {
    await resendRequest({
      path:
        `/contacts/${encodeURIComponent(email)}`,
      options: {
        method:
          "PATCH",
        body: {
          unsubscribed:
            true
        }
      }
    });
  } catch {
    /* Supabase remains the source of truth. */
  }
}
