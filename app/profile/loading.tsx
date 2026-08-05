import {
  VentureLoadingState
} from "@/components/reliability/venture-state";

export default function ProfileLoading() {
  return (
    <VentureLoadingState
      eyebrow="OPENING YOUR PROFILE"
      title="Bringing your Venture together."
      body="Loading private preferences, saves, and account settings."
      layout="detail"
    />
  );
}
