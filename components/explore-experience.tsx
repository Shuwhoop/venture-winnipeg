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

import {
  listingIsInsideBounds,
  type GeoPoint,
  type MapBounds
} from "@/lib/explore-map-utils";

import {
  getEventOccurrenceKey,
  getVisitHistory,
  VISIT_HISTORY_EVENT,
  visitListingKey
} from "@/lib/visit-history";

import type {
  Listing
} from "@/lib/types";

import styles from "@/app/explore/explore.module.css";

type ExploreExperienceProps = {
  listings: Listing[];
  eyebrow: string;
  searchQuery: string;
  newToMeOnly?: boolean;
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

function hasVisitedListing(
  listing: Listing,
  visits: ReturnType<
    typeof getVisitHistory
  >
) {
  const listingKey =
    visitListingKey(listing);

  if (listing.type === "restaurant") {
    return visits.some(
      (visit) =>
        visit.listingKey ===
        listingKey
    );
  }

  const occurrenceKey =
    getEventOccurrenceKey(listing);

  return visits.some(
    (visit) =>
      visit.listingKey ===
        listingKey &&
      (
        !occurrenceKey ||
        !visit.eventOccurrenceKey ||
        visit.eventOccurrenceKey ===
          occurrenceKey
      )
  );
}

export function ExploreExperience({
  listings,
  eyebrow,
  searchQuery,
  newToMeOnly = false,
  requestType = "other"
}: ExploreExperienceProps) {
  const workbenchRef =
    useRef<HTMLElement>(null);

  const resultRailRef =
    useRef<HTMLDivElement>(null);

  const railScrollTimeoutRef =
    useRef<number | null>(null);

  const [view, setView] =
    useState<ExploreView>("list");

  const [selectedListingKey, setSelectedListingKey] =
    useState<string | null>(null);

  const [selectionVersion, setSelectionVersion] =
    useState(0);

  const [fitVersion, setFitVersion] =
    useState(0);

  const [visitVersion, setVisitVersion] =
    useState(0);

  const [visitHistoryReady, setVisitHistoryReady] =
    useState(false);

  const [pendingBounds, setPendingBounds] =
    useState<MapBounds | null>(null);

  const [activeBounds, setActiveBounds] =
    useState<MapBounds | null>(null);

  const [mapHasMoved, setMapHasMoved] =
    useState(false);

  const [userLocation, setUserLocation] =
    useState<GeoPoint | null>(null);

  useEffect(() => {
    function refreshVisitHistory() {
      setVisitVersion(
        (current) => current + 1
      );
    }

    setVisitHistoryReady(true);
    refreshVisitHistory();

    window.addEventListener(
      VISIT_HISTORY_EVENT,
      refreshVisitHistory
    );

    window.addEventListener(
      "storage",
      refreshVisitHistory
    );

    return () => {
      window.removeEventListener(
        VISIT_HISTORY_EVENT,
        refreshVisitHistory
      );

      window.removeEventListener(
        "storage",
        refreshVisitHistory
      );
    };
  }, []);

  const historyFilteredListings =
    useMemo(() => {
      if (
        !newToMeOnly ||
        !visitHistoryReady
      ) {
        return listings;
      }

      const visits =
        getVisitHistory();

      return listings.filter(
        (listing) =>
          !hasVisitedListing(
            listing,
            visits
          )
      );
    }, [
      listings,
      newToMeOnly,
      visitHistoryReady,
      visitVersion
    ]);

  const visibleListings =
    useMemo(() => {
      if (!activeBounds) {
        return historyFilteredListings;
      }

      return historyFilteredListings.filter(
        (listing) =>
          listingIsInsideBounds(
            listing,
            activeBounds
          )
      );
    }, [
      activeBounds,
      historyFilteredListings
    ]);

  const pendingAreaCount =
    useMemo(() => {
      if (!pendingBounds) {
        return historyFilteredListings.length;
      }

      return historyFilteredListings.filter(
        (listing) =>
          listingIsInsideBounds(
            listing,
            pendingBounds
          )
      ).length;
    }, [
      historyFilteredListings,
      pendingBounds
    ]);

  useEffect(() => {
    if (!selectedListingKey) {
      return;
    }

    const selectedStillExists =
      visibleListings.some(
        (listing) =>
          getListingKey(listing) ===
          selectedListingKey
      );

    if (!selectedStillExists) {
      setSelectedListingKey(
        visibleListings[0]
          ? getListingKey(
              visibleListings[0]
            )
          : null
      );
    }
  }, [
    selectedListingKey,
    visibleListings
  ]);

  const selectedListing = useMemo(
    () =>
      visibleListings.find(
        (listing) =>
          getListingKey(listing) ===
          selectedListingKey
      ) ?? null,
    [
      visibleListings,
      selectedListingKey
    ]
  );

  const updateSelection =
    useCallback(
      (
        listing: Listing,
        scrollCard: boolean
      ) => {
        const listingKey =
          getListingKey(listing);

        setSelectedListingKey(
          listingKey
        );

        setSelectionVersion(
          (current) => current + 1
        );

        if (!scrollCard) {
          return;
        }

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

  const selectListing =
    useCallback(
      (listing: Listing) => {
        updateSelection(
          listing,
          true
        );
      },
      [updateSelection]
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

  const synchronizeRailSelection =
    useCallback(() => {
      const rail =
        resultRailRef.current;

      if (!rail) {
        return;
      }

      const railBounds =
        rail.getBoundingClientRect();

      const railCenter =
        railBounds.left +
        railBounds.width / 2;

      let nearestKey: string | null =
        null;

      let nearestDistance =
        Number.POSITIVE_INFINITY;

      rail
        .querySelectorAll<HTMLElement>(
          "[data-listing-key]"
        )
        .forEach((card) => {
          const cardBounds =
            card.getBoundingClientRect();

          const cardCenter =
            cardBounds.left +
            cardBounds.width / 2;

          const distance =
            Math.abs(
              cardCenter - railCenter
            );

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestKey =
              card.dataset.listingKey ??
              null;
          }
        });

      if (
        !nearestKey ||
        nearestKey === selectedListingKey
      ) {
        return;
      }

      const listing =
        visibleListings.find(
          (candidate) =>
            getListingKey(candidate) ===
            nearestKey
        );

      if (listing) {
        updateSelection(
          listing,
          false
        );
      }
    }, [
      selectedListingKey,
      updateSelection,
      visibleListings
    ]);

  function handleRailScroll() {
    if (
      railScrollTimeoutRef.current !==
      null
    ) {
      window.clearTimeout(
        railScrollTimeoutRef.current
      );
    }

    railScrollTimeoutRef.current =
      window.setTimeout(() => {
        synchronizeRailSelection();
        railScrollTimeoutRef.current =
          null;
      }, 120);
  }

  useEffect(() => {
    return () => {
      if (
        railScrollTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          railScrollTimeoutRef.current
        );
      }
    };
  }, []);

  function changeView(
    nextView: ExploreView
  ) {
    setView(nextView);

    if (
      nextView === "map" &&
      !selectedListingKey &&
      visibleListings[0]
    ) {
      selectListing(
        visibleListings[0]
      );
    }
  }

  const handleViewportChanged =
    useCallback(
      (bounds: MapBounds) => {
        setPendingBounds(bounds);
        setMapHasMoved(true);
      },
      []
    );

  function searchThisArea() {
    if (!pendingBounds) {
      return;
    }

    const matches =
      historyFilteredListings.filter(
        (listing) =>
          listingIsInsideBounds(
            listing,
            pendingBounds
          )
      );

    setActiveBounds(pendingBounds);
    setMapHasMoved(false);

    setSelectedListingKey(
      matches[0]
        ? getListingKey(matches[0])
        : null
    );

    setSelectionVersion(
      (current) => current + 1
    );
  }

  function showAllWinnipeg() {
    setActiveBounds(null);
    setPendingBounds(null);
    setMapHasMoved(false);
    setFitVersion(
      (current) => current + 1
    );

    const firstListing =
      historyFilteredListings[0];

    setSelectedListingKey(
      firstListing
        ? getListingKey(firstListing)
        : null
    );
  }

  const hasBaseMatches =
    historyFilteredListings.length > 0;

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
            {visibleListings.length}{" "}
            {visibleListings.length === 1
              ? "place to explore"
              : "places to explore"}
          </strong>

          {activeBounds ? (
            <small>
              Showing the selected map area.
            </small>
          ) : newToMeOnly ? (
            <small>
              Visited matches are hidden.
            </small>
          ) : null}
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
          : newToMeOnly
            ? `${visibleListings.length} unvisited matches shown.`
            : "List view opened."}
      </div>

      {!hasBaseMatches ? (
        <div className={styles.emptyRequestStack}>
          <section className={styles.emptyState}>
            <div aria-hidden="true">
              {newToMeOnly ? "✦" : "⌕"}
            </div>

            <h2>
              {newToMeOnly
                ? "No new matches here"
                : "No matches yet"}
            </h2>

            <p>
              {newToMeOnly
                ? "Broaden the neighbourhood, timing or budget, or turn off New to me to include familiar favourites."
                : "Try a broader neighbourhood, category, venue, or search term, or send Venture the missing listing below."}
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
              listings={visibleListings}
              selectedListingKey={
                selectedListingKey
              }
              selectionVersion={
                selectionVersion
              }
              fitVersion={fitVersion}
              isVisible
              userLocation={userLocation}
              onSelectListing={
                selectListing
              }
              onViewportChanged={
                handleViewportChanged
              }
              onUserLocationChange={
                setUserLocation
              }
            />

            {mapHasMoved && pendingBounds ? (
              <button
                type="button"
                className={styles.searchAreaButton}
                onClick={searchThisArea}
              >
                <span aria-hidden="true">⌖</span>
                Search this area
                <strong>
                  {pendingAreaCount}
                </strong>
              </button>
            ) : null}

            {activeBounds ? (
              <button
                type="button"
                className={styles.showAllAreaButton}
                onClick={showAllWinnipeg}
              >
                Show all Winnipeg
              </button>
            ) : null}

            <div className={styles.mapTip}>
              <span aria-hidden="true">↔</span>
              Swipe cards to move between pins
            </div>
          </div>

          {visibleListings.length > 0 ? (
            <div
              className={styles.mapResultRail}
              ref={resultRailRef}
              aria-label="Listings shown on map"
              onScroll={handleRailScroll}
            >
              {visibleListings.map(
                (listing, index) => (
                  <ExploreMapCard
                    key={getListingKey(listing)}
                    listing={listing}
                    index={index}
                    selected={
                      selectedListingKey ===
                      getListingKey(listing)
                    }
                    userLocation={
                      userLocation
                    }
                    onFocus={selectListing}
                  />
                )
              )}
            </div>
          ) : (
            <section className={styles.mapAreaEmpty}>
              <span aria-hidden="true">⌖</span>

              <div>
                <strong>
                  Nothing fits this map area
                </strong>

                <small>
                  Move the map and search again, or show all Winnipeg listings.
                </small>
              </div>

              <button
                type="button"
                onClick={showAllWinnipeg}
              >
                Show all
              </button>
            </section>
          )}
        </div>
      ) : visibleListings.length > 0 ? (
        <PersonalizedExploreResults
          listings={visibleListings}
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
      ) : (
        <section className={styles.emptyState}>
          <div aria-hidden="true">⌖</div>

          <h2>
            Nothing fits this map area
          </h2>

          <p>
            Return to the map, search another area, or show all Winnipeg listings.
          </p>

          <button
            type="button"
            className={styles.emptyShowAllButton}
            onClick={showAllWinnipeg}
          >
            Show all Winnipeg
          </button>
        </section>
      )}

      {hasBaseMatches ? (
        <ExploreMissingListingRequest
          compact
          initialQuery={searchQuery}
          initialType={requestType}
        />
      ) : null}
    </section>
  );
}
