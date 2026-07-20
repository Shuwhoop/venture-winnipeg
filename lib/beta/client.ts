"use client";

import type {
  BetaEventName
} from "@/lib/beta/types";

const SESSION_KEY =
  "venture:beta-session:v1";

function createSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  const bytes =
    new Uint8Array(16);

  crypto.getRandomValues(bytes);

  bytes[6] =
    (bytes[6] & 0x0f) | 0x40;
  bytes[8] =
    (bytes[8] & 0x3f) | 0x80;

  const value =
    Array.from(bytes)
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

export function getBetaSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const existing =
    window.localStorage.getItem(
      SESSION_KEY
    );

  if (existing) {
    return existing;
  }

  const created =
    createSessionId();

  window.localStorage.setItem(
    SESSION_KEY,
    created
  );

  return created;
}

export function trackBetaEvent({
  eventName,
  pagePath,
  properties = {}
}: {
  eventName: BetaEventName;
  pagePath: string;
  properties?: Record<
    string,
    string | number | boolean | null
  >;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    sessionId:
      getBetaSessionId(),
    eventName,
    pagePath,
    properties: {
      ...properties,
      viewportWidth:
        window.innerWidth
    }
  };

  const body =
    JSON.stringify(payload);

  if (
    typeof navigator.sendBeacon ===
      "function"
  ) {
    navigator.sendBeacon(
      "/api/beta/event",
      new Blob(
        [body],
        {
          type:
            "application/json"
        }
      )
    );

    return;
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
