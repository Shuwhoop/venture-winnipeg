"use client";

import { useEffect } from "react";

import {
  VentureErrorState
} from "@/components/reliability/venture-state";

export default function SavedError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Venture Saved error", error);
  }, [error]);

  return (
    <VentureErrorState
      eyebrow="COLLECTION TEMPORARILY CLOSED"
      title="Saved could not open properly."
      body="Your saved items have not been erased. Retry the page, or continue discovering while Venture reconnects."
      onRetry={reset}
      secondaryLabel="Explore instead"
      secondaryHref="/explore"
    />
  );
}
