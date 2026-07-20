import "server-only";

import {
  BETA_EVENT_NAMES,
  BETA_FEEDBACK_CATEGORIES,
  type BetaEventName,
  type BetaFeedbackCategory,
  type BetaPrimitive
} from "@/lib/beta/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ANALYTICS_VISITOR_COOKIE =
  "venture_analytics_visitor";

const ANALYTICS_SESSION_COOKIE =
  "venture_analytics_session";

export function getBetaEnvironment(): string {
  return (
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_ANALYTICS_ENVIRONMENT ||
    process.env.NODE_ENV ||
    "unknown"
  );
}

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits =
  new Map<string, RateLimitEntry>();

export function getClientAddress(
  request: Request
): string {
  return (
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkBetaRateLimit({
  key,
  limit,
  windowMinutes
}: {
  key: string;
  limit: number;
  windowMinutes: number;
}): boolean {
  const now = Date.now();
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, {
      count: 1,
      resetAt:
        now +
        windowMinutes * 60 * 1000
    });

    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  rateLimits.set(key, current);
  return true;
}

export function isAllowedBetaOrigin(
  request: Request
): boolean {
  const origin =
    request.headers.get("origin");

  if (!origin) {
    return true;
  }

  const requestOrigin =
    new URL(request.url).origin;

  return origin === requestOrigin;
}

export function cleanSessionId(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    !UUID_PATTERN.test(value)
  ) {
    return null;
  }

  return value.toLowerCase();
}

export const cleanVisitorId =
  cleanSessionId;

export function cleanPagePath(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const path =
    value.trim().split("?")[0].slice(0, 240);

  if (!path.startsWith("/")) {
    return null;
  }

  return path;
}

export function cleanEventName(
  value: unknown
): BetaEventName | null {
  return BETA_EVENT_NAMES.includes(
    value as BetaEventName
  )
    ? (value as BetaEventName)
    : null;
}

export function cleanFeedbackCategory(
  value: unknown
): BetaFeedbackCategory | null {
  return BETA_FEEDBACK_CATEGORIES.includes(
    value as BetaFeedbackCategory
  )
    ? (value as BetaFeedbackCategory)
    : null;
}

export function cleanFeedbackMessage(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned =
    value
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 2000);

  return cleaned.length >= 5
    ? cleaned
    : null;
}

export function cleanRating(
  value: unknown
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);

  return Number.isInteger(numeric) &&
    numeric >= 1 &&
    numeric <= 5
    ? numeric
    : null;
}

export function cleanContactEmail(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned =
    value.trim().toLowerCase().slice(0, 254);

  if (!cleaned) {
    return null;
  }

  return EMAIL_PATTERN.test(cleaned)
    ? cleaned
    : null;
}

export function cleanEventProperties(
  value: unknown
): Record<string, BetaPrimitive> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const result: Record<
    string,
    BetaPrimitive
  > = {};

  for (const [rawKey, rawValue] of Object.entries(value)) {
    if (Object.keys(result).length >= 18) {
      break;
    }

    const key =
      rawKey
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 40);

    if (!key) {
      continue;
    }

    if (typeof rawValue === "string") {
      result[key] =
        rawValue.slice(0, 180);
    } else if (
      typeof rawValue === "number" &&
      Number.isFinite(rawValue)
    ) {
      result[key] = rawValue;
    } else if (
      typeof rawValue === "boolean" ||
      rawValue === null
    ) {
      result[key] = rawValue;
    }
  }

  return result;
}

export function cleanClientCreatedAt(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  const difference =
    Math.abs(Date.now() - date.getTime());

  if (difference > 24 * 60 * 60 * 1000) {
    return null;
  }

  return date.toISOString();
}

export function cleanEventVersion(
  value: unknown
): number {
  const numeric = Number(value);

  if (
    Number.isInteger(numeric) &&
    numeric >= 1 &&
    numeric <= 20
  ) {
    return numeric;
  }

  return 1;
}

function parseCookies(
  request: Request
): Map<string, string> {
  const result = new Map<string, string>();
  const value = request.headers.get("cookie") || "";

  for (const part of value.split(";")) {
    const separator = part.indexOf("=");

    if (separator < 1) {
      continue;
    }

    const key = part.slice(0, separator).trim();
    const raw = part.slice(separator + 1).trim();

    try {
      result.set(key, decodeURIComponent(raw));
    } catch {
      result.set(key, raw);
    }
  }

  return result;
}

export async function recordServerBetaEvent({
  request,
  eventName,
  pagePath,
  properties = {}
}: {
  request: Request;
  eventName: BetaEventName;
  pagePath: string;
  properties?: Record<string, BetaPrimitive>;
}) {
  try {
    const cookies = parseCookies(request);
    const sessionId = cleanSessionId(
      cookies.get(ANALYTICS_SESSION_COOKIE)
    );
    const visitorId = cleanVisitorId(
      cookies.get(ANALYTICS_VISITOR_COOKIE)
    );

    if (!sessionId) {
      return;
    }

    const supabase =
      getSupabaseAdminClient();

    const payload = {
      session_id: sessionId,
      visitor_id: visitorId,
      event_name: eventName,
      page_path: pagePath,
      properties:
        cleanEventProperties({
          ...properties,
          environment:
            getBetaEnvironment(),
          eventSource: "server"
        }),
      event_version: 2,
      client_created_at: null
    };

    const { error } =
      await supabase
        .from("beta_events")
        .insert(payload);

    if (
      error &&
      (
        error.code === "42703" ||
        error.code === "PGRST204"
      )
    ) {
      await supabase
        .from("beta_events")
        .insert({
          session_id: sessionId,
          event_name: eventName,
          page_path: pagePath,
          properties:
            cleanEventProperties({
              ...properties,
              environment:
                getBetaEnvironment(),
              eventSource: "server"
            })
        });

      return;
    }

    if (error) {
      console.error(
        "Server analytics event insert failed",
        {
          code: error.code,
          message: error.message,
          eventName
        }
      );
    }
  } catch (error) {
    console.error(
      "Server analytics event failed",
      error
    );
  }
}
