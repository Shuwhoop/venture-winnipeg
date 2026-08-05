import {
  VentureLoadingState
} from "@/components/reliability/venture-state";

export default function SavedLoading() {
  return (
    <VentureLoadingState
      eyebrow="OPENING YOUR COLLECTION"
      title="Bringing back the good finds."
      body="Loading your saved places, events, and complete outings."
      layout="cards"
    />
  );
}
