"use client";

import {
  VentureErrorState
} from "@/components/reliability/venture-state";

export default function ProfileError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <VentureErrorState
      eyebrow="PROFILE DETOUR"
      title="Your profile did not open cleanly."
      body="Your account data is still safe. Try loading the profile again."
      onRetry={reset}
      secondaryLabel="Open Saved"
      secondaryHref="/saved"
    />
  );
}
