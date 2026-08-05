"use client";

import { useEffect } from "react";

import {
  VentureErrorState
} from "@/components/reliability/venture-state";

export default function BuilderError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Venture Outing Builder error", error);
  }, [error]);

  return (
    <VentureErrorState
      eyebrow="BUILDER DETOUR"
      title="The outing controls did not load."
      body="Retry the builder. Your saved places and previous outings remain untouched."
      onRetry={reset}
      secondaryLabel="Browse places"
      secondaryHref="/explore"
    />
  );
}
