import {
  VentureLoadingState
} from "@/components/reliability/venture-state";

export default function ExploreLoading() {
  return (
    <VentureLoadingState
      eyebrow="SEARCHING WINNIPEG"
      title="Finding places worth leaving home for."
      body="Checking your filters, current listings, and the map."
      layout="cards"
    />
  );
}
