import "server-only";

import { ventureBrand } from "@/lib/venture-brand";

const RESEND_API_BASE = "https://api.resend.com";
const NEWSLETTER_SEGMENT_NAME = "Confirmed Venture Subscribers";
const NEWSLETTER_TOPIC_NAME = "Venture This Weekend";
const DEFAULT_NEWSLETTER_FROM = "Venture by Boogie Bangers <venture@boogiebangers.com>";

type ResendRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export type ResendEmailResult = { id?: string; error?: string };
export type ResendResource = { id: string; name: string };
export type ResendBroadcastSummary = {
  id: string;
  name: string | null;
  subject: string;
  status: string;
  createdAt: string;
  scheduledAt: string | null;
  sentAt: string | null;
  topicId: string | null;
};

function getNewsletterFrom(): string {
  const configured = process.env.VENTURE_EMAIL_FROM?.trim() || "";

  if (!configured) return DEFAULT_NEWSLETTER_FROM;

  if (
    configured.includes("@updates.boogiebangers.com") ||
    configured.includes("onboarding@resend.dev")
  ) {
    return DEFAULT_NEWSLETTER_FROM;
  }

  return configured;
}

export function isNewsletterDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function isNewsletterWebhookConfigured(): boolean {
  return Boolean(process.env.RESEND_WEBHOOK_SECRET);
}

export function isNewsletterPostalAddressConfigured(): boolean {
  return Boolean(process.env.VENTURE_POSTAL_ADDRESS?.trim());
}

export function isUsingResendTestSender(): boolean {
  return getNewsletterFrom().includes("onboarding@resend.dev");
}

export function getNewsletterSegmentName(): string {
  return NEWSLETTER_SEGMENT_NAME;
}

export function getNewsletterTopicName(): string {
  return NEWSLETTER_TOPIC_NAME;
}

function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  return apiKey;
}

export async function resendApiRequest<T>({
  path,
  options
}: {
  path: string;
  options?: ResendRequestOptions;
}): Promise<{ ok: boolean; status: number; data: T | null; error: string }> {
  try {
    const response = await fetch(`${RESEND_API_BASE}${path}`, {
      method: options?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${getResendApiKey()}`,
        "Content-Type": "application/json",
        "User-Agent": "Venture-by-Boogie-Bangers/1.0"
      },
      ...(options && options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
      cache: "no-store"
    });

    const responseText = await response.text();
    let data: T | null = null;

    if (responseText) {
      try {
        data = JSON.parse(responseText) as T;
      } catch {
        data = null;
      }
    }

    const error = response.ok
      ? ""
      : data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `Resend request failed with status ${response.status}.`;

    return { ok: response.ok, status: response.status, data, error };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : "Resend could not be reached."
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
  const replyTo = process.env.VENTURE_EMAIL_REPLY_TO || ventureBrand.replyToEmail;
  const headers: Record<string, string> = {};

  if (unsubscribeUrl && oneClickUnsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${oneClickUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const result = await resendApiRequest<{ id?: string; message?: string }>({
    path: "/emails",
    options: {
      method: "POST",
      body: {
        from: getNewsletterFrom(),
        to: [to],
        subject,
        html,
        text,
        reply_to: replyTo,
        ...(Object.keys(headers).length ? { headers } : {})
      }
    }
  });

  return result.ok ? { id: result.data?.id } : { error: result.error };
}

export async function createOrReactivateResendContact({
  email,
  firstName
}: {
  email: string;
  firstName: string;
}): Promise<{ id?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) return { error: "RESEND_API_KEY is not configured." };

  const createResult = await resendApiRequest<{ id?: string; message?: string }>({
    path: "/contacts",
    options: {
      method: "POST",
      body: { email, first_name: firstName, unsubscribed: false }
    }
  });

  if (createResult.ok) return { id: createResult.data?.id };

  const updateResult = await resendApiRequest<{ id?: string; message?: string }>({
    path: `/contacts/${encodeURIComponent(email)}`,
    options: {
      method: "PATCH",
      body: { first_name: firstName, unsubscribed: false }
    }
  });

  return updateResult.ok
    ? { id: updateResult.data?.id }
    : { error: updateResult.error || createResult.error };
}

export async function unsubscribeResendContact(email: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  try {
    await resendApiRequest({
      path: `/contacts/${encodeURIComponent(email)}`,
      options: { method: "PATCH", body: { unsubscribed: true } }
    });
  } catch {
    /* Supabase remains the source of truth. */
  }
}

export async function listResendSegments(): Promise<{ items: ResendResource[]; error: string }> {
  const result = await resendApiRequest<{ data?: Array<{ id?: string; name?: string }> }>({
    path: "/segments"
  });

  return {
    items: (result.data?.data || [])
      .filter((item) => Boolean(item.id && item.name))
      .map((item) => ({ id: item.id as string, name: item.name as string })),
    error: result.error
  };
}

export async function listResendTopics(): Promise<{ items: ResendResource[]; error: string }> {
  const result = await resendApiRequest<{ data?: Array<{ id?: string; name?: string }> }>({
    path: "/topics"
  });

  return {
    items: (result.data?.data || [])
      .filter((item) => Boolean(item.id && item.name))
      .map((item) => ({ id: item.id as string, name: item.name as string })),
    error: result.error
  };
}

export async function createResendSegment(name: string): Promise<{ id?: string; error?: string }> {
  const result = await resendApiRequest<{ id?: string; message?: string }>({
    path: "/segments",
    options: { method: "POST", body: { name } }
  });

  return result.ok ? { id: result.data?.id } : { error: result.error };
}

export async function createResendTopic(name: string): Promise<{ id?: string; error?: string }> {
  const result = await resendApiRequest<{ id?: string; message?: string }>({
    path: "/topics",
    options: {
      method: "POST",
      body: {
        name,
        description: "One useful Winnipeg discovery email every Thursday.",
        default_subscription: "opt_in"
      }
    }
  });

  return result.ok ? { id: result.data?.id } : { error: result.error };
}

export async function addResendContactToSegment({
  email,
  segmentId
}: {
  email: string;
  segmentId: string;
}): Promise<{ ok: boolean; error: string }> {
  const result = await resendApiRequest({
    path: `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
    options: { method: "POST" }
  });

  return { ok: result.ok, error: result.error };
}

export async function updateResendContactTopic({
  email,
  topicId,
  subscription
}: {
  email: string;
  topicId: string;
  subscription: "opt_in" | "opt_out";
}): Promise<{ ok: boolean; error: string }> {
  const result = await resendApiRequest({
    path: `/contacts/${encodeURIComponent(email)}/topics`,
    options: {
      method: "PATCH",
      body: [{ id: topicId, subscription }]
    }
  });

  return { ok: result.ok, error: result.error };
}

export async function listResendBroadcasts(): Promise<{ items: ResendBroadcastSummary[]; error: string }> {
  const result = await resendApiRequest<{
    data?: Array<{
      id?: string;
      name?: string | null;
      subject?: string;
      status?: string;
      created_at?: string;
      scheduled_at?: string | null;
      sent_at?: string | null;
      topic_id?: string | null;
    }>;
  }>({ path: "/broadcasts" });

  return {
    items: (result.data?.data || [])
      .filter((item) => Boolean(item.id))
      .slice(0, 25)
      .map((item) => ({
        id: item.id as string,
        name: item.name || null,
        subject: item.subject || "Untitled broadcast",
        status: item.status || "unknown",
        createdAt: item.created_at || "",
        scheduledAt: item.scheduled_at || null,
        sentAt: item.sent_at || null,
        topicId: item.topic_id || null
      })),
    error: result.error
  };
}

export async function createResendBroadcastDraft({
  segmentId,
  topicId,
  name,
  subject,
  html,
  text
}: {
  segmentId: string;
  topicId: string;
  name: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id?: string; error?: string }> {
  const result = await resendApiRequest<{ id?: string; message?: string }>({
    path: "/broadcasts",
    options: {
      method: "POST",
      body: {
        segment_id: segmentId,
        topic_id: topicId,
        from: getNewsletterFrom(),
        name,
        subject,
        html,
        text
      }
    }
  });

  return result.ok ? { id: result.data?.id } : { error: result.error };
}
