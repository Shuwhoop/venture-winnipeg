import {
  TodayDiscovery
} from "@/components/today-discovery";

import {
  getPublishedEventListings
} from "@/lib/data/events";

import {
  getPublishedPlaceListings
} from "@/lib/data/places";

export const dynamic =
  "force-dynamic";

export default async function HomePage() {
  const [events, places] =
    await Promise.all([
      getPublishedEventListings(40),
      getPublishedPlaceListings(40)
    ]);

  return (
    <TodayDiscovery
      events={events}
      places={places}
    />
  );
}
