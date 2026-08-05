"use client";

import { useEffect } from "react";

import {
  VentureErrorState
} from "@/components/reliability/venture-state";

export default function OutingResultsError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Venture outing results error", error);
  }, [error]);

  return (
    <VentureErrorState
      eyebrow="THE ROUTE BROKE APART"
      title="Your outing could not finish loading."
      body="Retry the generated plan, or return to the builder and adjust one of the choices."
      onRetry={reset}
      secondaryLabel="Edit the outing"
      secondaryHref="/build-outing"
    />
  );
}
