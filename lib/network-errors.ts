const TRANSIENT_NETWORK_MARKERS = [
  "fetch failed",
  "failed to fetch",
  "network request failed",
  "networkerror",
  "enotfound",
  "eai_again",
  "econnrefused",
  "econnreset",
  "etimedout",
  "und_err_connect_timeout",
  "und_err_socket",
  "socket hang up"
] as const;

function collectErrorText(
  value: unknown,
  depth = 0,
  seen = new Set<unknown>()
): string[] {
  if (
    value === null ||
    value === undefined ||
    depth > 4
  ) {
    return [];
  }

  if (typeof value === "string") {
    return [value];
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return [String(value)];
  }

  if (typeof value !== "object") {
    return [];
  }

  if (seen.has(value)) {
    return [];
  }

  seen.add(value);

  const record = value as Record<string, unknown>;
  const usefulKeys = [
    "name",
    "message",
    "details",
    "hint",
    "code",
    "cause"
  ];

  return usefulKeys.flatMap((key) =>
    collectErrorText(
      record[key],
      depth + 1,
      seen
    )
  );
}

export function isTransientNetworkError(
  error: unknown
): boolean {
  const combined = collectErrorText(error)
    .join(" ")
    .toLowerCase();

  return TRANSIENT_NETWORK_MARKERS.some(
    (marker) => combined.includes(marker)
  );
}

export function reportDataAccessError(
  context: string,
  error: unknown
): void {
  if (isTransientNetworkError(error)) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[Venture offline] ${context}`
      );
    }

    return;
  }

  console.error(context, error);
}
