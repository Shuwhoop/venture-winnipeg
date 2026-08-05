"use client";

import { useEffect } from "react";

import {
  VentureErrorState
} from "@/components/reliability/venture-state";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Venture route error", error);
  }, [error]);

  return (
    <VentureErrorState
      onRetry={reset}
    />
  );
}
