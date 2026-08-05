"use client";

import type {
  BetaEventName,
  BetaPrimitive
} from "@/lib/beta/types";

const VISITOR_KEY =
  "venture:analytics-visitor:v2";

const VISITOR_CREATED_KEY =
  "venture:analytics-visitor-created:v2";

const SESSION_KEY =
  "venture:analytics-session:v2";

const SESSION_ACTIVITY_KEY =
  "venture:analytics-session-activity:v2";

const SESSION_STARTED_EVENT_KEY =
  "venture:analytics-session-started:v2";

const SESSION_TIMEOUT_MS =
  30 * 60 * 1000;

const RECENT_EVENT_WINDOW_MS = 900;
const ANALYTICS_STRING_LIMIT = 180;

const recentEventSignatures =
  new Map<string, number>();

function sanitizeAnalyticsProperties(
  properties: Record<string, BetaPrimitive>
): Record<string, BetaPrimitive> {
  return Object.fromEntries(
    Object.entries(properties).map(
      ([key, value]) => {
        if (typeof value !== "string") {
          return [key, value];
        }

        let safeValue = value
          .trim()
          .slice(0, ANALYTICS_STRING_LIMIT);

        if (
          key.toLowerCase().includes("query")
        ) {
          safeValue = safeValue
            .replace(
              /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
              "[email]"
            )
            .replace(
              /(?:\+?\d[\d\s().-]{7,}\d)/g,
              "[phone]"
            );
        }

        return [key, safeValue];
      }
    )
  );
}

function eventSignature({
  eventName,
  pagePath,
  properties
}: {
  eventName: BetaEventName;
  pagePath: string;
  properties: Record<string, BetaPrimitive>;
}): string {
  const stableProperties =
    Object.entries(properties)
      .sort(([first], [second]) =>
        first.localeCompare(second)
      );

  return JSON.stringify([
    eventName,
    pagePath,
    stableProperties
  ]);
}

function isRecentDuplicate(
  signature: string
): boolean {
  const now = Date.now();
  const previous =
    recentEventSignatures.get(signature);

  recentEventSignatures.set(
    signature,
    now
  );

  for (const [key, timestamp] of
    recentEventSignatures) {
    if (
      now - timestamp >
      RECENT_EVENT_WINDOW_MS * 4
    ) {
      recentEventSignatures.delete(key);
    }
  }

  return Boolean(
    previous &&
    now - previous <
      RECENT_EVENT_WINDOW_MS
  );
}

const VISITOR_COOKIE =
  "venture_analytics_visitor";

const SESSION_COOKIE =
  "venture_analytics_session";

type BetaIdentity = {
  visitorId: string;
  sessionId: string;
  isNewVisitor: boolean;
  isNewSession: boolean;
};

function createUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const value = Array.from(bytes)
    .map((part) =>
      part
        .toString(16)
        .padStart(2, "0")
    )
    .join("");

  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20)
  ].join("-");
}

function setAnalyticsCookie(
  name: string,
  value: string,
  maxAgeSeconds: number
) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax"
  ];

  if (window.location.protocol === "https:") {
    parts.push("Secure");
  }

  document.cookie = parts.join("; ");
}

function getOrCreateVisitor(): {
  id: string;
  isNew: boolean;
} {
  const existing =
    window.localStorage.getItem(VISITOR_KEY);

  if (existing) {
    return {
      id: existing,
      isNew: false
    };
  }

  const id = createUuid();

  window.localStorage.setItem(
    VISITOR_KEY,
    id
  );

  window.localStorage.setItem(
    VISITOR_CREATED_KEY,
    new Date().toISOString()
  );

  return {
    id,
    isNew: true
  };
}

function getOrCreateSession(): {
  id: string;
  isNew: boolean;
} {
  const now = Date.now();
  const existing =
    window.sessionStorage.getItem(SESSION_KEY);
  const lastActivity = Number(
    window.sessionStorage.getItem(
      SESSION_ACTIVITY_KEY
    )
  );

  const active =
    Boolean(existing) &&
    Number.isFinite(lastActivity) &&
    now - lastActivity <= SESSION_TIMEOUT_MS;

  if (active && existing) {
    window.sessionStorage.setItem(
      SESSION_ACTIVITY_KEY,
      String(now)
    );

    return {
      id: existing,
      isNew: false
    };
  }

  const id = createUuid();

  window.sessionStorage.setItem(
    SESSION_KEY,
    id
  );

  window.sessionStorage.setItem(
    SESSION_ACTIVITY_KEY,
    String(now)
  );

  window.sessionStorage.removeItem(
    SESSION_STARTED_EVENT_KEY
  );

  return {
    id,
    isNew: true
  };
}

export function getBetaIdentity():
  BetaIdentity {
  if (typeof window === "undefined") {
    return {
      visitorId: "",
      sessionId: "",
      isNewVisitor: false,
      isNewSession: false
    };
  }

  const visitor = getOrCreateVisitor();
  const session = getOrCreateSession();

  setAnalyticsCookie(
    VISITOR_COOKIE,
    visitor.id,
    365 * 24 * 60 * 60
  );

  setAnalyticsCookie(
    SESSION_COOKIE,
    session.id,
    30 * 60
  );

  return {
    visitorId: visitor.id,
    sessionId: session.id,
    isNewVisitor: visitor.isNew,
    isNewSession: session.isNew
  };
}

export function getBetaSessionId(): string {
  return getBetaIdentity().sessionId;
}

export function getBetaVisitorId(): string {
  return getBetaIdentity().visitorId;
}

export function hasTrackedSessionStart():
  boolean {
  if (typeof window === "undefined") {
    return true;
  }

  return (
    window.sessionStorage.getItem(
      SESSION_STARTED_EVENT_KEY
    ) === "true"
  );
}

export function markSessionStartTracked() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    SESSION_STARTED_EVENT_KEY,
    "true"
  );
}

function getDeviceClass(): string {
  const width = window.innerWidth;

  if (width < 640) {
    return "mobile";
  }

  if (width < 1024) {
    return "tablet";
  }

  return "desktop";
}

function getAnalyticsEnvironment(): string {
  const configured =
    process.env
      .NEXT_PUBLIC_ANALYTICS_ENVIRONMENT
      ?.trim();

  if (configured) {
    return configured;
  }

  const host =
    window.location.hostname;

  if (
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    return "development";
  }

  return host.endsWith(".vercel.app")
    ? "vercel"
    : "production";
}

function getReferrerHost(): string {
  if (!document.referrer) {
    return "direct";
  }

  try {
    return new URL(document.referrer).hostname || "direct";
  } catch {
    return "unknown";
  }
}

export function trackBetaEvent({
  eventName,
  pagePath,
  properties = {}
}: {
  eventName: BetaEventName;
  pagePath: string;
  properties?: Record<string, BetaPrimitive>;
}) {
  if (typeof window === "undefined") {
    return;
  }

  if (!navigator.onLine) {
    return;
  }

  const safeProperties =
    sanitizeAnalyticsProperties(
      properties
    );

  const signature =
    eventSignature({
      eventName,
      pagePath,
      properties: safeProperties
    });

  if (isRecentDuplicate(signature)) {
    return;
  }

  const identity =
    getBetaIdentity();

  const payload = {
    sessionId:
      identity.sessionId,
    visitorId:
      identity.visitorId,
    eventName,
    pagePath,
    clientCreatedAt:
      new Date().toISOString(),
    eventVersion: 3,
    properties: {
      viewportWidth:
        window.innerWidth,
      deviceClass:
        getDeviceClass(),
      referrerHost:
        getReferrerHost(),
      isNewVisitor:
        identity.isNewVisitor,
      environment:
        getAnalyticsEnvironment(),
      eventSource: "client",
      ...safeProperties
    }
  };

  const body = JSON.stringify(payload);

  if (
    typeof navigator.sendBeacon === "function"
  ) {
    const accepted =
      navigator.sendBeacon(
        "/api/beta/event",
        new Blob(
          [body],
          {
            type: "application/json"
          }
        )
      );

    if (accepted) {
      return;
    }
  }

  void fetch(
    "/api/beta/event",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json"
      },
      body,
      keepalive: true
    }
  ).catch(() => undefined);
}
