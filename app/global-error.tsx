"use client";

import { useEffect } from "react";

import {
  VentureErrorState
} from "@/components/reliability/venture-state";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Venture global error", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fff8ef", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ width: "min(100%, 500px)", minHeight: "100dvh", margin: "0 auto", padding: "24px 18px", boxSizing: "border-box" }}>
          <VentureErrorState
            eyebrow="VENTURE NEEDS A RESTART"
            title="The whole app took a wrong turn."
            body="Reload Venture to restore the experience. Your saved plans and account data have not been deleted."
            retryLabel="Reload Venture"
            onRetry={reset}
          />
        </main>
      </body>
    </html>
  );
}
