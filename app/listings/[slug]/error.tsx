"use client";

import { useEffect } from "react";

import {
  VentureErrorState
} from "@/components/reliability/venture-state";

export default function ListingError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Venture listing detail error", error);
  }, [error]);

  return (
    <VentureErrorState
      eyebrow="LISTING DETOUR"
      title="Those details are unavailable right now."
      body="Retry before travelling, booking, or purchasing so Venture can show the latest available information."
      onRetry={reset}
      secondaryLabel="Back to Explore"
      secondaryHref="/explore"
    />
  );
}
