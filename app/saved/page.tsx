"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  SavedSyncBanner
} from "@/components/account-sync/account-sync";

import {
  SavedListingCard
} from "@/components/saved/saved-listing-card";

import VentureSavedEmptyState from
  "@/components/saved-empty-state/saved-empty-state";

import {
  trackBetaEvent
} from "@/lib/beta/client";

import {
  enrichSavedListingSnapshots,
  getSavedListingReferences,
  isListingSaved,
  isListingSnapshot,
  removeSavedListing,
  SAVED_LISTINGS_EVENT,
  savedListingKey,
  toggleSavedListing
} from "@/lib/saved-listings";

import {
  getSavedOutings,
  removeSavedOuting,
  saveOuting,
  SAVED_OUTINGS_EVENT,
  type GeneratedOutingPlan
} from "@/lib/saved-outings";

import type {
  Listing
} from "@/lib/types";

import styles from "./saved-v1.module.css";

type SavedView =
  | "all"
  | "places"
  | "events"
  | "outings";

type UndoItem =
  | {
      kind: "listing";
      label: string;
      listing: Listing;
    }
  | {
      kind: "outing";
      label: string;
      outing: GeneratedOutingPlan;
    };

const viewOptions: Array<{
  value: SavedView;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "places", label: "Places" },
  { value: "events", label: "Events" },
  { value: "outings", label: "Outings" }
];

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function EmptySearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.8" />
      <path d="m15.5 15.5 4.5 4.5" />
      <path d="M8 8l5 5M13 8l-5 5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function formatPlanDate(dateValue: string) {
  const [year, month, day] =
    dateValue.split("-").map(Number);

  if (!year || !month || !day) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Winnipeg"
    }
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12
      )
    )
  );
}

function formatCost(value: number | null) {
  if (value === null) {
    return "Cost not confirmed";
  }

  if (value === 0) {
    return "Free";
  }

  return new Intl.NumberFormat(
    "en-CA",
    {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0
    }
  ).format(value);
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en-CA");
}

function listingMatchesSearch(
  listing: Listing,
  query: string
) {
  if (!query) {
    return true;
  }

  return [
    listing.name,
    listing.category,
    listing.subtitle,
    listing.neighbourhood,
    listing.address,
    listing.venueName,
    ...(listing.searchTerms ?? [])
  ]
    .filter(Boolean)
    .some((value) =>
      String(value)
        .toLocaleLowerCase("en-CA")
        .includes(query)
    );
}

function outingMatchesSearch(
  outing: GeneratedOutingPlan,
  query: string
) {
  if (!query) {
    return true;
  }

  return [
    outing.title,
    outing.date,
    outing.transportation,
    outing.anchorListingName,
    ...outing.stops.flatMap((stop) => [
      stop.listing.name,
      stop.listing.category,
      stop.listing.neighbourhood
    ])
  ]
    .filter(Boolean)
    .some((value) =>
      String(value)
        .toLocaleLowerCase("en-CA")
        .includes(query)
    );
}

async function loadSavedListings() {
  const references =
    getSavedListingReferences();

  if (references.length === 0) {
    return [];
  }

  const listingsByKey = new Map<
    string,
    Listing
  >();

  for (const reference of references) {
    if (isListingSnapshot(reference.snapshot)) {
      listingsByKey.set(
        savedListingKey(reference),
        reference.snapshot
      );
    }
  }

  const missingReferences = references.filter(
    (reference) =>
      !listingsByKey.has(
        savedListingKey(reference)
      )
  );

  if (
    missingReferences.length > 0 &&
    window.navigator.onLine
  ) {
    try {
      const response = await fetch(
        "/api/saved-listings",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            items: missingReferences.map(
              (reference) => ({
                slug: reference.slug,
                type: reference.type
              })
            )
          }),
          cache: "no-store"
        }
      );

      const result: unknown =
        await response.json();

      if (response.ok) {
        const possibleListings =
          result &&
          typeof result === "object" &&
          Array.isArray(
            (result as Record<string, unknown>)
              .listings
          )
            ? (result as {
                listings: unknown[];
              }).listings
            : [];

        const resolvedListings =
          possibleListings.filter(
            isListingSnapshot
          );

        enrichSavedListingSnapshots(
          resolvedListings
        );

        for (const listing of
          resolvedListings) {
          listingsByKey.set(
            savedListingKey(listing),
            listing
          );
        }
      }
    } catch {
      // Existing snapshots keep Saved useful during weak connections.
    }
  }

  return references
    .map((reference) =>
      listingsByKey.get(
        savedListingKey(reference)
      )
    )
    .filter(isListingSnapshot);
}

export default function SavedPage() {
  const [ready, setReady] =
    useState(false);
  const [listings, setListings] =
    useState<Listing[]>([]);
  const [outings, setOutings] =
    useState<GeneratedOutingPlan[]>([]);
  const [view, setView] =
    useState<SavedView>("all");
  const [search, setSearch] =
    useState("");
  const [undoItem, setUndoItem] =
    useState<UndoItem | null>(null);

  const undoTimer = useRef<number | null>(null);

  const refreshSaved = useCallback(
    async () => {
      setListings(
        await loadSavedListings()
      );
      setOutings(getSavedOutings());
      setReady(true);
    },
    []
  );

  useEffect(() => {
    const refresh = () => {
      void refreshSaved();
    };

    const refreshWhenVisible = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        refresh();
      }
    };

    refresh();

    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener(
      SAVED_LISTINGS_EVENT,
      refresh
    );
    window.addEventListener(
      SAVED_OUTINGS_EVENT,
      refresh
    );
    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible
    );

    return () => {
      window.removeEventListener(
        "storage",
        refresh
      );
      window.removeEventListener(
        "focus",
        refresh
      );
      window.removeEventListener(
        SAVED_LISTINGS_EVENT,
        refresh
      );
      window.removeEventListener(
        SAVED_OUTINGS_EVENT,
        refresh
      );
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      );

      if (undoTimer.current) {
        window.clearTimeout(
          undoTimer.current
        );
      }
    };
  }, [refreshSaved]);

  const query = useMemo(
    () => normalizeSearch(search),
    [search]
  );

  const counts = useMemo(() => {
    const places = listings.filter(
      (listing) =>
        listing.type === "restaurant"
    ).length;

    const events = listings.filter(
      (listing) =>
        listing.type === "event"
    ).length;

    return {
      total: listings.length + outings.length,
      places,
      events,
      outings: outings.length
    };
  }, [listings, outings]);

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) => {
        if (view === "outings") {
          return false;
        }

        if (
          view === "places" &&
          listing.type !== "restaurant"
        ) {
          return false;
        }

        if (
          view === "events" &&
          listing.type !== "event"
        ) {
          return false;
        }

        return listingMatchesSearch(
          listing,
          query
        );
      }),
    [listings, query, view]
  );

  const filteredOutings = useMemo(
    () =>
      outings.filter((outing) => {
        if (
          view === "places" ||
          view === "events"
        ) {
          return false;
        }

        return outingMatchesSearch(
          outing,
          query
        );
      }),
    [outings, query, view]
  );

  function showUndo(item: UndoItem) {
    if (undoTimer.current) {
      window.clearTimeout(
        undoTimer.current
      );
    }

    setUndoItem(item);

    undoTimer.current =
      window.setTimeout(() => {
        setUndoItem(null);
        undoTimer.current = null;
      }, 7000);
  }

  function handleRemoveListing(listing: Listing) {
    removeSavedListing(listing);
    setListings((current) =>
      current.filter(
        (item) =>
          savedListingKey(item) !==
          savedListingKey(listing)
      )
    );

    showUndo({
      kind: "listing",
      label: listing.name,
      listing
    });

    trackBetaEvent({
      eventName: "listing_unsaved",
      pagePath: "/saved",
      properties: {
        listingId: listing.id,
        listingType: listing.type,
        listingName: listing.name
      }
    });
  }

  function handleRemoveOuting(
    outing: GeneratedOutingPlan
  ) {
    removeSavedOuting(outing.planId);
    setOutings((current) =>
      current.filter(
        (item) =>
          item.planId !== outing.planId
      )
    );

    showUndo({
      kind: "outing",
      label: outing.title,
      outing
    });

    trackBetaEvent({
      eventName: "outing_unsaved",
      pagePath: "/saved",
      properties: {
        planId: outing.planId,
        outingTitle: outing.title
      }
    });
  }

  function handleUndo() {
    if (!undoItem) {
      return;
    }

    if (undoItem.kind === "listing") {
      if (!isListingSaved(undoItem.listing)) {
        toggleSavedListing(undoItem.listing);
      }
    } else {
      saveOuting(undoItem.outing);
    }

    if (undoTimer.current) {
      window.clearTimeout(
        undoTimer.current
      );
      undoTimer.current = null;
    }

    setUndoItem(null);
    void refreshSaved();
  }

  function selectView(nextView: SavedView) {
    setView(nextView);
  }

  if (!ready) {
    return (
      <main className={styles.page}>
        <section className={styles.loading}>
          <div className={styles.loadingMark}>
            <HeartIcon />
          </div>
          <h1>Opening your saves</h1>
          <p>
            Gathering your places and complete outings.
          </p>
        </section>
      </main>
    );
  }

  const isEmpty =
    listings.length === 0 &&
    outings.length === 0;

  if (isEmpty) {
    return (
      <>
        <SavedSyncBanner />
        <VentureSavedEmptyState />
      </>
    );
  }

  const hasFilteredResults =
    filteredListings.length > 0 ||
    filteredOutings.length > 0;

  return (
    <main className={styles.page}>
      <SavedSyncBanner />

      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <span className={styles.eyebrow}>
              YOUR WINNIPEG COLLECTION
            </span>
            <h1>Saved</h1>
            <p>
              Keep the places and plans worth coming back to.
            </p>
          </div>

          <div className={styles.heroHeart}>
            <HeartIcon />
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <strong>{counts.total}</strong>
            <span>Total</span>
          </div>
          <div className={styles.stat}>
            <strong>{counts.places}</strong>
            <span>Places</span>
          </div>
          <div className={styles.stat}>
            <strong>{counts.events}</strong>
            <span>Events</span>
          </div>
          <div className={styles.stat}>
            <strong>{counts.outings}</strong>
            <span>Outings</span>
          </div>
        </div>
      </header>

      <section
        className={styles.controls}
        aria-label="Filter saved items"
      >
        <div className={styles.search}>
          <SearchIcon />
          <input
            type="search"
            value={search}
            placeholder="Search your saved collection"
            aria-label="Search saved places and outings"
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          {search ? (
            <button
              className={styles.clearSearch}
              type="button"
              aria-label="Clear saved search"
              onClick={() => setSearch("")}
            >
              Ãƒâ€”
            </button>
          ) : null}
        </div>

        <div className={styles.tabs}>
          {viewOptions.map((option) => (
            <button
              className={`${styles.tab} ${
                view === option.value
                  ? styles.tabActive
                  : ""
              }`}
              type="button"
              aria-pressed={view === option.value}
              key={option.value}
              onClick={() =>
                selectView(option.value)
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {hasFilteredResults ? (
        <>
          {filteredOutings.length > 0 ? (
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>
                    COMPLETE PLANS
                  </span>
                  <h2>
                    {filteredOutings.length}{" "}
                    {filteredOutings.length === 1
                      ? "outing"
                      : "outings"}
                  </h2>
                </div>
                <Link href="/build-outing">
                  Build another
                </Link>
              </div>

              <div className={styles.outingGrid}>
                {filteredOutings.map((outing) => (
                  <article
                    className={styles.outingCard}
                    key={outing.planId}
                  >
                    <div className={styles.outingTop}>
                      <div>
                        <span className={styles.eyebrow}>
                          SAVED OUTING
                        </span>
                        <h3>{outing.title}</h3>
                      </div>
                      <span className={styles.stopBadge}>
                        {outing.stops.length}{" "}
                        {outing.stops.length === 1
                          ? "stop"
                          : "stops"}
                      </span>
                    </div>

                    <div className={styles.outingMeta}>
                      <span>
                        {formatPlanDate(outing.date)}
                      </span>
                      <span>
                        {outing.requestedStartTime}
                      </span>
                      <span>
                        {outing.transportation}
                      </span>
                      <span>
                        {formatCost(
                          outing.estimatedTotalCad
                        )}
                      </span>
                    </div>

                    <div className={styles.routePreview}>
                      {outing.stops
                        .slice(0, 3)
                        .map((stop) => (
                          <div
                            className={styles.routeStop}
                            key={`${stop.listing.type}-${stop.listing.id}-${stop.order}`}
                          >
                            <b>{stop.order}</b>
                            <span>
                              <small>{stop.startTime}</small>
                              <strong>
                                {stop.listing.name}
                              </strong>
                            </span>
                          </div>
                        ))}
                    </div>

                    <div className={styles.cardActions}>
                      <Link
                        className={styles.primaryAction}
                        href={`/saved/outings/${encodeURIComponent(
                          outing.planId
                        )}`}
                      >
                        Open outing
                        <ArrowIcon />
                      </Link>
                      <button
                        className={styles.removeAction}
                        type="button"
                        onClick={() =>
                          handleRemoveOuting(outing)
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {filteredListings.length > 0 ? (
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>
                    INDIVIDUAL PICKS
                  </span>
                  <h2>
                    {filteredListings.length}{" "}
                    {filteredListings.length === 1
                      ? "listing"
                      : "listings"}
                  </h2>
                </div>
                <Link href="/explore">
                  Explore more
                </Link>
              </div>

              <div className={styles.listingGrid}>
                {filteredListings.map((listing) => (
                  <SavedListingCard
                    key={`${listing.type}-${listing.id}`}
                    listing={listing}
                    onRemove={handleRemoveListing}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className={styles.filteredEmpty}>
          <EmptySearchIcon />
          <h2>No saved matches</h2>
          <p>
            Try another search or switch to a different section of your collection.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setView("all");
            }}
          >
            Show everything
          </button>
        </section>
      )}

      {undoItem ? (
        <div
          className={styles.undoToast}
          role="status"
          aria-live="polite"
        >
          <span>
            Removed {undoItem.label}
          </span>
          <button
            type="button"
            onClick={handleUndo}
          >
            Undo
          </button>
        </div>
      ) : null}
    </main>
  );
}
