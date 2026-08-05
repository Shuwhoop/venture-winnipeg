import {
  VentureLoadingState
} from "@/components/reliability/venture-state";

export default function OutingResultsLoading() {
  return (
    <VentureLoadingState
      eyebrow="BUILDING YOUR ROUTE"
      title="Joining the stops together."
      body="Balancing timing, travel, cost, and the kind of outing you asked for."
      layout="outing"
    />
  );
}
