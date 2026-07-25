import {
  TodayDiscovery
} from "@/components/today-discovery";

import {
  getPublishedEventListings
} from "@/lib/data/events";

import {
  getPublishedPlaceListings
} from "@/lib/data/places";

import {
  getFeaturedCommunityExperience
} from "@/lib/community";

export const dynamic =
  "force-dynamic";

export default async function HomePage() {
  const [events, places, community] =
    await Promise.all([
      getPublishedEventListings(40),
      getPublishedPlaceListings(40),
      getFeaturedCommunityExperience()
    ]);

  return (
    <TodayDiscovery
      events={events}
      places={places}
      community={community}
    />
  );
}
