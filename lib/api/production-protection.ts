import "server-only";

import { NextResponse } from "next/server";

import {
  consumeRateLimit,
  getRequestAddress,
  isSameOriginRequest,
  rateLimitHeaders
} from "@/lib/server-rate-limit";

export type MutationPolicy = {
  scope: string;
  limit: number;
  windowMs: number;
  maxBodyBytes: number;
  rateLimitMessage?: string;
};

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse };

function bodyLengthFromHeader(request: Request): number | null {
  const raw = request.headers.get("content-length");

  if (!raw) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function protectMutationRequest(
  request: Request,
  policy: MutationPolicy
): NextResponse | null {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "This request came from an untrusted origin." },
      {
        status: 403,
        headers: { "Cache-Control": "private, no-store" }
      }
    );
  }

  const declaredLength = bodyLengthFromHeader(request);

  if (declaredLength !== null && declaredLength > policy.maxBodyBytes) {
    return NextResponse.json(
      { error: "This request is too large for Venture to process safely." },
      {
        status: 413,
        headers: { "Cache-Control": "private, no-store" }
      }
    );
  }

  const result = consumeRateLimit({
    key: `${policy.scope}:${getRequestAddress(request)}`,
    limit: policy.limit,
    windowMs: policy.windowMs
  });

  if (!result.allowed) {
    return NextResponse.json(
      {
        error:
          policy.rateLimitMessage ||
          "Too many requests were sent. Give Venture a moment and try again."
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(result),
          "Cache-Control": "private, no-store"
        }
      }
    );
  }

  return null;
}

export async function readProtectedJson(
  request: Request,
  {
    maxBodyBytes,
    invalidJsonMessage = "The request was not valid JSON.",
    readErrorMessage = "The request could not be read."
  }: {
    maxBodyBytes: number;
    invalidJsonMessage?: string;
    readErrorMessage?: string;
  }
): Promise<JsonBodyResult> {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: readErrorMessage },
        {
          status: 400,
          headers: { "Cache-Control": "private, no-store" }
        }
      )
    };
  }

  const actualBytes = new TextEncoder().encode(rawBody).byteLength;

  if (actualBytes > maxBodyBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "This request is too large for Venture to process safely." },
        {
          status: 413,
          headers: { "Cache-Control": "private, no-store" }
        }
      )
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(rawBody)
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: invalidJsonMessage },
        {
          status: 400,
          headers: { "Cache-Control": "private, no-store" }
        }
      )
    };
  }
}

export function getVentureRequestId(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  if (supplied && supplied.length <= 120) {
    return supplied;
  }

  const vercel = request.headers.get("x-vercel-id")?.trim();
  if (vercel && vercel.length <= 160) {
    return vercel;
  }

  return crypto.randomUUID();
}

export function reportApiFailure(
  scope: string,
  request: Request,
  error: unknown,
  extra: Record<string, unknown> = {}
): string {
  const requestId = getVentureRequestId(request);
  const normalized =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split("\n").slice(0, 8).join("\n")
        }
      : {
          name: "UnknownError",
          message: String(error)
        };

  let path = "unknown";
  try {
    path = new URL(request.url).pathname;
  } catch {
  }

  console.error(
    JSON.stringify({
      level: "error",
      event: "venture_api_failure",
      scope,
      requestId,
      path,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      ...extra,
      ...normalized
    })
  );

  return requestId;
}

export function unexpectedApiError(
  scope: string,
  request: Request,
  error: unknown,
  message: string,
  extra: Record<string, unknown> = {}
): NextResponse {
  const requestId = reportApiFailure(scope, request, error, extra);

  return NextResponse.json(
    {
      error: message,
      requestId
    },
    {
      status: 500,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Request-Id": requestId
      }
    }
  );
}
