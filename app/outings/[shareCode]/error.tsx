"use client";

import { useEffect } from "react";

import {
  VentureErrorState
} from "@/components/reliability/venture-state";

export default function SharedOutingError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Venture shared outing error", error);
  }, [error]);

  return (
    <VentureErrorState
      eyebrow="SHARED ROUTE UNAVAILABLE"
      title="This outing could not open."
      body="The link may be temporarily unavailable or the plan may no longer be public. Retry before giving up on it."
      onRetry={reset}
      secondaryLabel="Build a new outing"
      secondaryHref="/build-outing"
    />
  );
}
