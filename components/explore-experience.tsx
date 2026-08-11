"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent
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
  trackBetaEvent
} from "@/lib/beta/client";

import {
  getListingProximity,
  listingIsInsideBounds,
  NEARBY_LOCATION_STORAGE_KEY,
  parseStoredGeoPoint,
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
  hasMore?: boolean;
  loadMoreHref?: string | null;
  pageSize?: number;
  nearbyRequested?: boolean;
  resultLimit?: number;
  analyticsContext?: {
    filter: string;
    when: string;
    price: string;
    occasion: string;
    area: string;
    newToMe: boolean;
  };
};

type ExploreView =
  | "list"
  | "map";

type ExploreSort =
  | "recommended"
  | "nearest"
  | "open"
  | "name";

type NearbyLocationStatus =
  | "idle"
  | "missing"
  | "locating"
  | "ready"
  | "error";

function getListingKey(
  listing: Listing
): string {
  return `${listing.type}-${listing.id}`;
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches
    ? "auto"
    : "smooth";
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
  requestType = "other",
  hasMore = false,
  loadMoreHref = null,
  pageSize = 24,
  nearbyRequested = false,
  resultLimit = 24,
  analyticsContext
}: ExploreExperienceProps) {
  const workbenchRef =
    useRef<HTMLElement>(null);

  const resultRailRef =
    useRef<HTMLDivElement>(null);

  const railScrollTimeoutRef =
    useRef<number | null>(null);

  const zeroResultTrackedRef =
    useRef("");

  const resultViewTrackedRef =
    useRef("");

  const [view, setView] =
    useState<ExploreView>("map");

  // VENTURE EXPLORE MAP-FIRST V1.0

  const [sort, setSort] =
    useState<ExploreSort>(
      nearbyRequested
        ? "nearest"
        : "recommended"
    );

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

  const [nearbyLocationStatus, setNearbyLocationStatus] =
    useState<NearbyLocationStatus>("idle");

  const updateUserLocation =
    useCallback(
      (location: GeoPoint) => {
        setUserLocation(location);

        if (nearbyRequested) {
          setNearbyLocationStatus("ready");

          try {
            window.sessionStorage.setItem(
              NEARBY_LOCATION_STORAGE_KEY,
              JSON.stringify(location)
            );
          } catch {
            // Distance sorting still works for this render.
          }
        }
      },
      [nearbyRequested]
    );

  useEffect(() => {
    setSort(
      nearbyRequested
        ? "nearest"
        : "recommended"
    );
  }, [nearbyRequested]);

  useEffect(() => {
    if (!nearbyRequested) {
      setNearbyLocationStatus("idle");
      setUserLocation(null);
      return;
    }

    try {
      const storedLocation =
        parseStoredGeoPoint(
          window.sessionStorage.getItem(
            NEARBY_LOCATION_STORAGE_KEY
          )
        );

      if (storedLocation) {
        setUserLocation(storedLocation);
        setNearbyLocationStatus("ready");
        return;
      }
    } catch {
      setNearbyLocationStatus("error");
      return;
    }

    setNearbyLocationStatus("missing");
  }, [nearbyRequested]);

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

  const distanceReadyListings =
    useMemo(() => {
      if (!userLocation) {
        return listings;
      }

      return listings.map((listing) => {
        const proximity =
          getListingProximity(
            listing,
            userLocation
          );

        return proximity
          ? {
              ...listing,
              distance:
                proximity.distanceLabel
            }
          : listing;
      });
    }, [listings, userLocation]);

  const historyFilteredListings =
    useMemo(() => {
      if (
        !newToMeOnly ||
        !visitHistoryReady
      ) {
        return distanceReadyListings;
      }

      const visits =
        getVisitHistory();

      return distanceReadyListings.filter(
        (listing) =>
          !hasVisitedListing(
            listing,
            visits
          )
      );
    }, [
      distanceReadyListings,
      newToMeOnly,
      visitHistoryReady,
      visitVersion
    ]);

  const sortedListings =
    useMemo(() => {
      const indexed =
        historyFilteredListings.map(
          (listing, index) => ({
            listing,
            index
          })
        );

      if (sort === "name") {
        return indexed
          .sort((first, second) =>
            first.listing.name.localeCompare(
              second.listing.name
            )
          )
          .map((entry) => entry.listing);
      }

      if (sort === "open") {
        return indexed
          .sort((first, second) => {
            const openDifference =
              Number(
                second.listing.isOpenNow ===
                  true
              ) -
              Number(
                first.listing.isOpenNow ===
                  true
              );

            return openDifference !== 0
              ? openDifference
              : first.index - second.index;
          })
          .map((entry) => entry.listing);
      }

      if (
        sort === "nearest" &&
        userLocation
      ) {
        return indexed
          .map((entry) => ({
            ...entry,
            distance:
              getListingProximity(
                entry.listing,
                userLocation
              )?.distanceKilometres ??
              Number.POSITIVE_INFINITY
          }))
          .sort((first, second) =>
            first.distance !== second.distance
              ? first.distance - second.distance
              : first.index - second.index
          )
          .map((entry) => entry.listing);
      }

      return historyFilteredListings;
    }, [
      historyFilteredListings,
      sort,
      userLocation
    ]);

  const visibleListings =
    useMemo(() => {
      const areaListings = !activeBounds
        ? sortedListings
        : sortedListings.filter(
            (listing) =>
              listingIsInsideBounds(
                listing,
                activeBounds
              )
          );

      return areaListings.slice(
        0,
        Math.max(1, resultLimit)
      );
    }, [
      activeBounds,
      sortedListings,
      resultLimit
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
              behavior: preferredScrollBehavior(),
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

        trackBetaEvent({
          eventName:
            "discovery_view_changed",
          pagePath:
            window.location.pathname,
          properties: {
            surface: "explore",
            view: "map",
            source:
              "listing-card-map-action"
          }
        });

        window.requestAnimationFrame(
          () => {
            workbenchRef.current?.scrollIntoView({
              behavior: preferredScrollBehavior(),
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

    trackBetaEvent({
      eventName:
        "discovery_view_changed",
      pagePath:
        window.location.pathname,
      properties: {
        surface: "explore",
        view: nextView
      }
    });

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

  function handleViewKeyDown(
    event: KeyboardEvent<HTMLDivElement>
  ) {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight"
    ) {
      return;
    }

    event.preventDefault();

    const nextView: ExploreView =
      view === "list"
        ? "map"
        : "list";

    changeView(nextView);

    window.requestAnimationFrame(() => {
      document
        .getElementById(
          `explore-${nextView}-tab`
        )
        ?.focus();
    });
  }

  function handleResultRailKeyDown(
    event: KeyboardEvent<HTMLDivElement>
  ) {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight"
    ) {
      return;
    }

    event.preventDefault();

    const reducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    event.currentTarget.scrollBy({
      left:
        (event.key === "ArrowRight" ? 1 : -1) *
        Math.max(
          240,
          event.currentTarget.clientWidth * 0.86
        ),
      behavior:
        reducedMotion
          ? "auto"
          : "smooth"
    });
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

  function locateForNearby() {
    trackBetaEvent({
      eventName: "discovery_filter_selected",
      pagePath: window.location.pathname,
      properties: {
        surface: "explore",
        filter: "near-me",
        interaction: "nearby-location-requested"
      }
    });

    if (!navigator.geolocation) {
      setNearbyLocationStatus("error");
      return;
    }

    setNearbyLocationStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateUserLocation({
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude
        });

        trackBetaEvent({
          eventName: "discovery_filter_selected",
          pagePath: window.location.pathname,
          properties: {
            surface: "explore",
            filter: "near-me",
            interaction: "nearby-location-resolved",
            result: "granted"
          }
        });
      },
      (error) => {
        setNearbyLocationStatus("error");

        trackBetaEvent({
          eventName: "discovery_filter_selected",
          pagePath: window.location.pathname,
          properties: {
            surface: "explore",
            filter: "near-me",
            interaction: "nearby-location-resolved",
            result:
              error.code ===
              error.PERMISSION_DENIED
                ? "denied"
                : "unavailable"
          }
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  const hasBaseMatches =
    historyFilteredListings.length > 0;

  useEffect(() => {
    const trackingKey = JSON.stringify([
      searchQuery,
      visibleListings.length,
      hasMore,
      nearbyRequested,
      analyticsContext
    ]);

    if (
      resultViewTrackedRef.current ===
      trackingKey
    ) {
      return;
    }

    resultViewTrackedRef.current =
      trackingKey;

    trackBetaEvent({
      eventName:
        "discovery_results_viewed",
      pagePath:
        window.location.pathname,
      properties: {
        surface: "explore",
        query:
          searchQuery.trim(),
        queryLength:
          searchQuery.trim().length,
        resultCount:
          visibleListings.length,
        hasMore,
        nearbyRequested,
        filter:
          analyticsContext?.filter ?? "all",
        when:
          analyticsContext?.when ?? "any",
        price:
          analyticsContext?.price ?? "any",
        occasion:
          analyticsContext?.occasion ?? "any",
        areaSelected:
          Boolean(analyticsContext?.area),
        newToMe:
          analyticsContext?.newToMe ??
          newToMeOnly
      }
    });
  }, [
    analyticsContext,
    hasMore,
    nearbyRequested,
    newToMeOnly,
    searchQuery,
    visibleListings.length
  ]);

  useEffect(() => {
    const normalizedSearch =
      searchQuery.trim();

    if (
      hasBaseMatches ||
      !normalizedSearch
    ) {
      return;
    }

    const trackingKey =
      `${normalizedSearch}:${requestType}`;

    if (
      zeroResultTrackedRef.current ===
      trackingKey
    ) {
      return;
    }

    zeroResultTrackedRef.current =
      trackingKey;

    trackBetaEvent({
      eventName: "discovery_zero_results",
      pagePath: window.location.pathname,
      properties: {
        surface: "explore",
        interaction: "zero-results",
        query: normalizedSearch,
        requestType
      }
    });
  }, [
    hasBaseMatches,
    requestType,
    searchQuery
  ]);

  function changeSort(
    nextSort: ExploreSort
  ) {
    setSort(nextSort);

    trackBetaEvent({
      eventName: "discovery_sort_changed",
      pagePath: window.location.pathname,
      properties: {
        surface: "explore",
        interaction: "sort-changed",
        sort: nextSort
      }
    });
  }

  return (
    <section
      className={styles.workbench}
      ref={workbenchRef}
      aria-label="Explore results"
    >
      {nearbyRequested ? (
        <div
          className={styles.nearbyStatus}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">⌖</span>

          <div>
            <strong>Nearest first</strong>
            <small>
              {nearbyLocationStatus === "ready"
                ? "Sorted by distance. Your coordinates stay in this browser tab."
                : nearbyLocationStatus === "locating"
                  ? "Finding your location..."
                  : nearbyLocationStatus === "error"
                    ? "Location is unavailable. You can still browse by neighbourhood."
                    : "Use your location to sort the loaded Winnipeg listings by distance."}
            </small>
          </div>

          {nearbyLocationStatus !== "ready" ? (
            <button
              type="button"
              onClick={locateForNearby}
              disabled={
                nearbyLocationStatus ===
                "locating"
              }
            >
              {nearbyLocationStatus === "locating"
                ? "Locating..."
                : "Use my location"}
            </button>
          ) : null}
        </div>
      ) : null}

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
          ) : hasMore ? (
            <small>
              More matches are available.
            </small>
          ) : null}
        </div>

        <label className={styles.sortControl}>
          <span>Sort</span>

          <select
            value={sort}
            onChange={(event) =>
              changeSort(
                event.target.value as
                  ExploreSort
              )
            }
          >
            <option value="recommended">
              Recommended
            </option>

            {nearbyRequested ? (
              <option value="nearest">
                Nearest
              </option>
            ) : null}

            <option value="open">
              Open first
            </option>

            <option value="name">
              Name A–Z
            </option>
          </select>
        </label>

        <div
          className={styles.viewSwitcher}
          role="tablist"
          aria-label="Choose results view"
          onKeyDown={handleViewKeyDown}
        >
          <button
            type="button"
            id="explore-map-tab"
            role="tab"
            aria-selected={view === "map"}
            aria-controls="explore-map-panel"
            tabIndex={view === "map" ? 0 : -1}
            disabled={!hasBaseMatches}
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
                  <button
            type="button"
            id="explore-list-tab"
            role="tab"
            aria-selected={view === "list"}
            aria-controls="explore-list-panel"
            tabIndex={view === "list" ? 0 : -1}
            disabled={!hasBaseMatches}
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

            <div className={styles.recoveryLinks}>
              <Link href="/explore">
                Show everything
              </Link>

              <Link href="/explore?occasion=date">
                Try date ideas
              </Link>

              <Link href="/explore?when=open">
                See what is open
              </Link>
            </div>
          </section>

          <ExploreMissingListingRequest
            initialQuery={searchQuery}
            initialType={requestType}
          />
        </div>
      ) : view === "map" ? (
        <div
          id="explore-map-panel"
          className={styles.mapMode}
          role="tabpanel"
          aria-labelledby="explore-map-tab"
          tabIndex={0}
        >
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
                updateUserLocation
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
              role="region"
              aria-label="Listings shown on map. Use left and right arrow keys to scroll."
              tabIndex={0}
              onKeyDown={handleResultRailKeyDown}
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
        <div
          id="explore-list-panel"
          role="tabpanel"
          aria-labelledby="explore-list-tab"
          tabIndex={0}
        >
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
        </div>
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

      {hasMore && loadMoreHref ? (
        <div className={styles.loadMorePanel}>
          <div>
            <span>KEEP EXPLORING</span>
            <strong>More Winnipeg is waiting</strong>
            <small>
              Add the next {pageSize} matches without losing your search.
            </small>
          </div>

          <Link href={loadMoreHref}>
            Show {pageSize} more
            <b aria-hidden="true">↓</b>
          </Link>
        </div>
      ) : null}

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
