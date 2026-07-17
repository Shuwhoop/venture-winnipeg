"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  ListingCard
} from "@/components/listing-card";

import {
  getSavedListingReferences,
  SAVED_LISTINGS_EVENT
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

type ListingLoadState =
  | "loading"
  | "ready"
  | "error";

function formatPlanDate(
  dateValue: string
): string {
  const [
    year,
    month,
    day
  ] = dateValue
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone:
        "America/Winnipeg"
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

function formatCost(
  value: number | null
): string {
  if (value === null) {
    return "Total incomplete";
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

export default function SavedPage() {
  const [
    listings,
    setListings
  ] = useState<Listing[]>([]);

  const [
    outings,
    setOutings
  ] = useState<
    GeneratedOutingPlan[]
  >([]);

  const [
    listingLoadState,
    setListingLoadState
  ] =
    useState<ListingLoadState>(
      "loading"
    );

  const refreshSavedOutings =
    useCallback(() => {
      setOutings(
        getSavedOutings()
      );
    }, []);

  const loadSavedListings =
    useCallback(async () => {
      const savedReferences =
        getSavedListingReferences();

      if (
        savedReferences.length === 0
      ) {
        setListings([]);
        setListingLoadState(
          "ready"
        );
        return;
      }

      setListingLoadState(
        "loading"
      );

      try {
        const response =
          await fetch(
            "/api/saved-listings",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  items:
                    savedReferences.map(
                      (reference) => ({
                        slug:
                          reference.slug,

                        type:
                          reference.type
                      })
                    )
                })
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Saved listings could not be loaded."
          );
        }

        setListings(
          Array.isArray(
            result.listings
          )
            ? result.listings
            : []
        );

        setListingLoadState(
          "ready"
        );
      } catch (error) {
        console.error(
          "Unable to display saved listings:",
          error
        );

        setListingLoadState(
          "error"
        );
      }
    }, []);

  useEffect(() => {
    refreshSavedOutings();

    void loadSavedListings();

    function handleSavedChange() {
      refreshSavedOutings();
      void loadSavedListings();
    }

    window.addEventListener(
      SAVED_LISTINGS_EVENT,
      handleSavedChange
    );

    window.addEventListener(
      SAVED_OUTINGS_EVENT,
      handleSavedChange
    );

    window.addEventListener(
      "storage",
      handleSavedChange
    );

    return () => {
      window.removeEventListener(
        SAVED_LISTINGS_EVENT,
        handleSavedChange
      );

      window.removeEventListener(
        SAVED_OUTINGS_EVENT,
        handleSavedChange
      );

      window.removeEventListener(
        "storage",
        handleSavedChange
      );
    };
  }, [
    loadSavedListings,
    refreshSavedOutings
  ]);

  function handleRemoveOuting(
    planId: string
  ) {
    removeSavedOuting(planId);
    refreshSavedOutings();
  }

  const hasSavedContent =
    outings.length > 0 ||
    listings.length > 0;

  if (
    listingLoadState ===
      "loading" &&
    !hasSavedContent
  ) {
    return (
      <section className="empty-state">
        <div>♡</div>

        <h1>
          Loading your saved plans
        </h1>

        <p>
          Checking your outings and
          refreshing the latest listing
          information.
        </p>
      </section>
    );
  }

  if (
    listingLoadState ===
      "ready" &&
    !hasSavedContent
  ) {
    return (
      <section className="empty-state">
        <div>♡</div>

        <h1>
          Nothing saved yet
        </h1>

        <p>
          Save a complete outing or tap
          the heart on an individual
          Winnipeg listing.
        </p>

        <div className="saved-empty-actions">
          <Link href="/build-outing">
            Build an outing
          </Link>

          <Link href="/explore">
            Explore Winnipeg
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="page-heading">
        <span>YOUR PLANS</span>

        <h1>Saved</h1>

        <p className="page-description">
          Outings and listings stored
          in this browser for easy
          access later.
        </p>
      </div>

      {outings.length > 0 ? (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <span>
                SAVED OUTINGS
              </span>

              <h2>
                {outings.length}{" "}
                {outings.length === 1
                  ? "outing"
                  : "outings"}
              </h2>
            </div>

            <Link href="/build-outing">
              Build another
            </Link>
          </div>

          <div className="saved-outing-grid">
            {outings.map(
              (outing) => (
                <article
                  className="saved-outing-card"
                  key={outing.planId}
                >
                  <div className="saved-outing-card-top">
                    <div>
                      <span>
                        SAVED PLAN
                      </span>

                      <h3>
                        {outing.title}
                      </h3>
                    </div>

                    <span className="saved-outing-stop-badge">
                      {
                        outing.stops
                          .length
                      }{" "}
                      {outing.stops
                        .length === 1
                        ? "stop"
                        : "stops"}
                    </span>
                  </div>

                  <div className="saved-outing-meta">
                    <span>
                      {formatPlanDate(
                        outing.date
                      )}
                    </span>

                    <span>
                      {
                        outing.requestedDuration
                      }
                    </span>

                    <span>
                      {
                        outing.transportation
                      }
                    </span>

                    <span>
                      {formatCost(
                        outing.estimatedTotalCad
                      )}
                    </span>
                  </div>

                  {outing.stops.length >
                  0 ? (
                    <div className="saved-outing-stop-preview">
                      {outing.stops
                        .slice(0, 3)
                        .map(
                          (stop) => (
                            <div
                              key={`${stop.listing.type}-${stop.listing.id}`}
                            >
                              <b>
                                {
                                  stop.order
                                }
                              </b>

                              <span>
                                <small>
                                  {
                                    stop.startTime
                                  }
                                </small>

                                <strong>
                                  {
                                    stop
                                      .listing
                                      .name
                                  }
                                </strong>
                              </span>
                            </div>
                          )
                        )}
                    </div>
                  ) : (
                    <p className="saved-outing-no-stops">
                      This saved plan
                      does not contain
                      any stops.
                    </p>
                  )}

                  <div className="saved-outing-actions">
                    <Link
                      href={`/saved/outings/${outing.planId}`}
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
              )
            )}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span>
              SAVED LISTINGS
            </span>

            <h2>
              {listings.length}{" "}
              {listings.length === 1
                ? "listing"
                : "listings"}
            </h2>
          </div>

          <Link href="/explore">
            Explore
          </Link>
        </div>

        {listingLoadState ===
        "loading" ? (
          <section className="saved-inline-state">
            <p>
              Refreshing saved listing
              information…
            </p>
          </section>
        ) : null}

        {listingLoadState ===
        "error" ? (
          <section className="saved-inline-state error">
            <p>
              Your bookmarks are still
              stored in this browser,
              but their latest details
              could not be loaded.
            </p>

            <button
              type="button"
              onClick={() => {
                void loadSavedListings();
              }}
            >
              Try again
            </button>
          </section>
        ) : null}

        {listingLoadState ===
          "ready" &&
        listings.length > 0 ? (
          <div className="vertical-list">
            {listings.map(
              (listing) => (
                <ListingCard
                  key={`${listing.type}-${listing.id}`}
                  listing={listing}
                />
              )
            )}
          </div>
        ) : null}

        {listingLoadState ===
          "ready" &&
        listings.length === 0 ? (
          <section className="saved-inline-state">
            <p>
              No individual listings
              have been saved yet.
            </p>

            <Link href="/explore">
              Browse listings
            </Link>
          </section>
        ) : null}
      </section>
    </>
  );
}