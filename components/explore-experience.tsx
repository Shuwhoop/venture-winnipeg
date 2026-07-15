"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  CityMap
} from "@/components/city-map";

import {
  PersonalizedExploreResults
} from "@/components/personalized-explore-results";

import type {
  Listing
} from "@/lib/types";

type ExploreExperienceProps = {
  listings: Listing[];
  eyebrow: string;
};

function getListingKey(
  listing: Listing
): string {
  return `${listing.type}-${listing.id}`;
}

export function ExploreExperience({
  listings,
  eyebrow
}: ExploreExperienceProps) {
  const mapAnchorRef =
    useRef<HTMLDivElement>(null);

  const [
    selectedListingKey,
    setSelectedListingKey
  ] = useState<string | null>(null);

  const [
    selectionVersion,
    setSelectionVersion
  ] = useState(0);

  useEffect(() => {
    if (!selectedListingKey) {
      return;
    }

    const selectedStillExists =
      listings.some(
        (listing) =>
          getListingKey(listing) ===
          selectedListingKey
      );

    if (!selectedStillExists) {
      setSelectedListingKey(null);
    }
  }, [
    listings,
    selectedListingKey
  ]);

  const selectListing =
    useCallback(
      (listing: Listing) => {
        setSelectedListingKey(
          getListingKey(listing)
        );

        setSelectionVersion(
          (current) => current + 1
        );
      },
      []
    );

  const handleCardSelection =
    useCallback(
      (listing: Listing) => {
        selectListing(listing);

        window.requestAnimationFrame(
          () => {
            mapAnchorRef.current
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
          }
        );
      },
      [selectListing]
    );

  return (
    <>
      <div
        className="explore-map-anchor"
        ref={mapAnchorRef}
      >
        <CityMap
          listings={listings}
          selectedListingKey={
            selectedListingKey
          }
          selectionVersion={
            selectionVersion
          }
          onSelectListing={
            selectListing
          }
        />
      </div>

      <PersonalizedExploreResults
        listings={listings}
        eyebrow={eyebrow}
        selectedListingKey={
          selectedListingKey
        }
        onSelectListing={
          handleCardSelection
        }
      />
    </>
  );
}