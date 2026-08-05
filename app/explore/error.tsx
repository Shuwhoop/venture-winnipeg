"use client";

import { useEffect } from "react";

import {
  VentureErrorState
} from "@/components/reliability/venture-state";

export default function ExploreError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Venture Explore error", error);
  }, [error]);

  return (
    <VentureErrorState
      eyebrow="DISCOVERY PAUSED"
      title="Explore could not load those results."
      body="The connection or listing service may be having a rough minute. Try again without losing your place."
      onRetry={reset}
      secondaryLabel="Clear filters"
      secondaryHref="/explore"
    />
  );
}
