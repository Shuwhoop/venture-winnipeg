import {
  VentureLoadingState
} from "@/components/reliability/venture-state";

export default function ListingLoading() {
  return (
    <VentureLoadingState
      eyebrow="OPENING THE DETAILS"
      title="Checking the useful facts."
      body="Loading the listing, hours, location notes, and planning actions."
      layout="detail"
    />
  );
}
