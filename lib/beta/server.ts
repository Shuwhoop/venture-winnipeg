import "server-only";

import {
  BETA_EVENT_NAMES,
  BETA_FEEDBACK_CATEGORIES,
  type BetaEventName,
  type BetaFeedbackCategory
} from "@/lib/beta/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
): Record<string, string | number | boolean | null> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const result: Record<
    string,
    string | number | boolean | null
  > = {};

  for (const [rawKey, rawValue] of Object.entries(value)) {
    if (Object.keys(result).length >= 12) {
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

    if (
      typeof rawValue === "string"
    ) {
      result[key] =
        rawValue.slice(0, 160);
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
