"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  SavedSyncBanner
} from "@/components/account-sync/account-sync";

import {
  ListingCard
} from "@/components/listing-card";

import VentureSavedEmptyState from
  "@/components/saved-empty-state/saved-empty-state";

import {
  enrichSavedListingSnapshots,
  getSavedListingReferences,
  isListingSnapshot,
  SAVED_LISTINGS_EVENT,
  savedListingKey
} from "@/lib/saved-listings";

import {
  getSavedOutings,
  removeSavedOuting,
  SAVED_OUTINGS_EVENT,
  type GeneratedOutingPlan
} from "@/lib/saved-outings";

import type {
  Listing
} from "@/lib/types";

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
    return "Price not confirmed";
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
    };
  }, [refreshSaved]);

  function handleRemoveOuting(planId: string) {
    removeSavedOuting(planId);
    setOutings((current) =>
      current.filter(
        (outing) =>
          outing.planId !== planId
      )
    );
  }

  if (!ready) {
    return (
      <section className="empty-state">
        <div aria-hidden="true">♡</div>
        <h1>Opening your saves</h1>
        <p>
          Gathering your listings and complete outings.
        </p>
      </section>
    );
  }

  const isEmpty =
    listings.length === 0 &&
    outings.length === 0;

  return (
    <main className="saved-page">
      <SavedSyncBanner />

      {isEmpty ? (
        <VentureSavedEmptyState />
      ) : (
        <>
          <header className="section-heading">
            <div>
              <span>YOUR COLLECTION</span>
              <h1>Saved</h1>
              <p>
                Restaurants, events, and complete Winnipeg outings you kept
                for later.
              </p>
            </div>
          </header>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <span>COMPLETE PLANS</span>
                <h2>
                  {outings.length} {outings.length === 1
                    ? "outing"
                    : "outings"}
                </h2>
              </div>
              <Link href="/build-outing">
                Build another
              </Link>
            </div>

            {outings.length > 0 ? (
              <div className="saved-outing-grid">
                {outings.map((outing) => (
                  <article
                    className="saved-outing-card"
                    key={outing.planId}
                  >
                    <div className="saved-outing-card-top">
                      <div>
                        <span>SAVED OUTING</span>
                        <h3>{outing.title}</h3>
                      </div>
                      <span className="saved-outing-stop-badge">
                        {outing.stops.length} {outing.stops.length === 1
                          ? "stop"
                          : "stops"}
                      </span>
                    </div>

                    <div className="saved-outing-meta">
                      <span>{formatPlanDate(outing.date)}</span>
                      <span>{outing.requestedStartTime}</span>
                      <span>{outing.transportation}</span>
                      <span>{formatCost(outing.estimatedTotalCad)}</span>
                    </div>

                    {outing.stops.length > 0 ? (
                      <div className="saved-outing-stop-preview">
                        {outing.stops.slice(0, 3).map((stop) => (
                          <div
                            key={`${stop.listing.type}-${stop.listing.id}`}
                          >
                            <b>{stop.order}</b>
                            <span>
                              <small>{stop.startTime}</small>
                              <strong>{stop.listing.name}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="saved-outing-no-stops">
                        No stops are stored in this outing.
                      </p>
                    )}

                    <div className="saved-outing-actions">
                      <Link
                        href={`/saved/outings/${encodeURIComponent(
                          outing.planId
                        )}`}
                      >
                        Open outing
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveOuting(
                            outing.planId
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="saved-inline-state">
                <p>No complete outings saved yet.</p>
                <Link href="/build-outing">
                  Build an outing
                </Link>
              </div>
            )}
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <span>INDIVIDUAL PICKS</span>
                <h2>
                  {listings.length} {listings.length === 1
                    ? "listing"
                    : "listings"}
                </h2>
              </div>
              <Link href="/explore">
                Explore more
              </Link>
            </div>

            {listings.length > 0 ? (
              <div className="vertical-list">
                {listings.map((listing) => (
                  <ListingCard
                    key={`${listing.type}-${listing.id}`}
                    listing={listing}
                  />
                ))}
              </div>
            ) : (
              <div className="saved-inline-state">
                <p>
                  Tap the heart on any event or food listing to keep it here.
                </p>
                <Link href="/explore">
                  Explore Winnipeg
                </Link>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
