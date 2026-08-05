import {
  VentureLoadingState
} from "@/components/reliability/venture-state";

export default function SharedOutingLoading() {
  return (
    <VentureLoadingState
      eyebrow="OPENING THE SHARED PLAN"
      title="Unfolding this outing."
      body="Loading the stops, route order, timing, and travel details."
      layout="outing"
    />
  );
}
