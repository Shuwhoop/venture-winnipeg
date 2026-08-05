import {
  VentureLoadingState
} from "@/components/reliability/venture-state";

export default function BuilderLoading() {
  return (
    <VentureLoadingState
      eyebrow="OPENING THE BUILDER"
      title="Setting up your outing canvas."
      body="Loading your preferences and the tools for shaping the plan."
      layout="outing"
    />
  );
}
