"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  CityMap
} from "@/components/city-map";

import {
  ExploreMapCard
} from "@/components/explore-map-card";

import {
  ExploreMissingListingRequest
} from "@/components/explore-missing-listing-request";

import {
  PersonalizedExploreResults
} from "@/components/personalized-explore-results";

import type {
  Listing
} from "@/lib/types";

import styles from "@/app/explore/explore.module.css";

type ExploreExperienceProps = {
  listings: Listing[];
  eyebrow: string;
  searchQuery: string;
  requestType?:
    | "restaurant"
    | "event"
    | "bar"
    | "place"
    | "other";
};

type ExploreView =
  | "list"
  | "map";

function getListingKey(
  listing: Listing
): string {
  return `${listing.type}-${listing.id}`;
}

export function ExploreExperience({
  listings,
  eyebrow,
  searchQuery,
  requestType = "other"
}: ExploreExperienceProps) {
  const workbenchRef =
    useRef<HTMLElement>(null);

  const resultRailRef =
    useRef<HTMLDivElement>(null);

  const [
    view,
    setView
  ] = useState<ExploreView>("list");

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

  const selectedListing =
    useMemo(
      () =>
        listings.find(
          (listing) =>
            getListingKey(listing) ===
            selectedListingKey
        ) ?? null,
      [
        listings,
        selectedListingKey
      ]
    );

  const selectListing =
    useCallback(
      (listing: Listing) => {
        const listingKey =
          getListingKey(listing);

        setSelectedListingKey(
          listingKey
        );

        setSelectionVersion(
          (current) => current + 1
        );

        window.requestAnimationFrame(
          () => {
            const rail =
              resultRailRef.current;

            const card =
              rail?.querySelector<HTMLElement>(
                `[data-listing-key="${listingKey}"]`
              );

            card?.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
              inline: "center"
            });
          }
        );
      },
      []
    );

  const showListingOnMap =
    useCallback(
      (listing: Listing) => {
        setView("map");
        selectListing(listing);

        window.requestAnimationFrame(
          () => {
            workbenchRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }
        );
      },
      [selectListing]
    );

  function changeView(
    nextView: ExploreView
  ) {
    setView(nextView);

    if (
      nextView === "map" &&
      !selectedListingKey &&
      listings[0]
    ) {
      selectListing(listings[0]);
    }
  }

  return (
    <section
      className={styles.workbench}
      ref={workbenchRef}
      aria-label="Explore results"
    >
      <header className={styles.viewToolbar}>
        <div className={styles.resultHeading}>
          <span>{eyebrow}</span>

          <strong>
            {listings.length}{" "}
            {listings.length === 1
              ? "place to explore"
              : "places to explore"}
          </strong>
        </div>

        <div
          className={styles.viewSwitcher}
          role="tablist"
          aria-label="Choose results view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "list"}
            className={
              view === "list"
                ? styles.activeView
                : ""
            }
            onClick={() =>
              changeView("list")
            }
          >
            <span aria-hidden="true">☷</span>
            List
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={view === "map"}
            className={
              view === "map"
                ? styles.activeView
                : ""
            }
            onClick={() =>
              changeView("map")
            }
          >
            <span aria-hidden="true">⌖</span>
            Map
          </button>
        </div>
      </header>

      <div
        className={styles.liveStatus}
        aria-live="polite"
      >
        {view === "map"
          ? selectedListing
            ? `${selectedListing.name} selected on the map.`
            : "Map view opened."
          : "List view opened."}
      </div>

      {listings.length === 0 ? (
        <div className={styles.emptyRequestStack}>
          <section className={styles.emptyState}>
            <div aria-hidden="true">⌕</div>
            <h2>No matches yet</h2>
            <p>
              Try a broader neighbourhood,
              category, venue, or search term, or
              send Venture the missing listing below.
            </p>
          </section>

          <ExploreMissingListingRequest
            initialQuery={searchQuery}
            initialType={requestType}
          />
        </div>
      ) : view === "map" ? (
        <div className={styles.mapMode}>
          <div className={styles.mapFrame}>
            <CityMap
              listings={listings}
              selectedListingKey={
                selectedListingKey
              }
              selectionVersion={
                selectionVersion
              }
              isVisible
              onSelectListing={
                selectListing
              }
            />

            <div className={styles.mapTip}>
              <span aria-hidden="true">☝</span>
              Tap a marker, then swipe the cards
            </div>
          </div>

          <div
            className={styles.mapResultRail}
            ref={resultRailRef}
            aria-label="Listings shown on map"
          >
            {listings.map(
              (listing) => (
                <ExploreMapCard
                  key={getListingKey(listing)}
                  listing={listing}
                  selected={
                    selectedListingKey ===
                    getListingKey(listing)
                  }
                  onFocus={selectListing}
                />
              )
            )}
          </div>
        </div>
      ) : (
        <PersonalizedExploreResults
          listings={listings}
          eyebrow={eyebrow}
          selectedListingKey={
            selectedListingKey
          }
          onSelectListing={
            showListingOnMap
          }
          showHeading={false}
          className={styles.listResults}
        />
      )}

      {listings.length > 0 ? (
        <ExploreMissingListingRequest
          compact
          initialQuery={searchQuery}
          initialType={requestType}
        />
      ) : null}
    </section>
  );
}
