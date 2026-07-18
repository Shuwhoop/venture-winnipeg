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

import VentureSavedEmptyState from "@/components/saved-empty-state/saved-empty-state";

import {
  SAVED_OUTINGS_EVENT,
  getSavedOutings,
  removeSavedOuting,
  type GeneratedOutingPlan
} from "@/lib/saved-outings";

import type {
  Listing
} from "@/lib/types";


const SAVED_LISTING_EVENTS = [
  "venture:saved-listings-updated",
  "venture:saved-listings-changed",
  "venture:saves-updated"
];


function isListing(
  value: unknown
): value is Listing {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const listing =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof listing.id ===
      "string" &&
    typeof listing.slug ===
      "string" &&
    typeof listing.name ===
      "string" &&
    (
      listing.type ===
        "event" ||
      listing.type ===
        "restaurant"
    )
  );
}


function extractListings(
  value: unknown
): Listing[] {
  if (
    Array.isArray(value)
  ) {
    return value.filter(
      isListing
    );
  }

  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return [];
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  const possibleCollections = [
    record.listings,
    record.savedListings,
    record.items,
    record.data
  ];

  return possibleCollections.flatMap(
    (collection) =>
      Array.isArray(
        collection
      )
        ? collection.filter(
            isListing
          )
        : []
  );
}


function deduplicateListings(
  listings: Listing[]
): Listing[] {
  const seen =
    new Set<string>();

  return listings.filter(
    (listing) => {
      const key =
        `${listing.type}-${listing.id}`;

      if (
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}


function readBrowserSavedListings():
  Listing[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const collected:
    Listing[] = [];

  for (
    let index = 0;
    index <
      window.localStorage.length;
    index += 1
  ) {
    const key =
      window.localStorage.key(
        index
      );

    if (
      !key ||
      !key
        .toLowerCase()
        .includes("saved")
    ) {
      continue;
    }

    const rawValue =
      window.localStorage.getItem(
        key
      );

    if (!rawValue) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(
          rawValue
        );

      collected.push(
        ...extractListings(
          parsed
        )
      );
    } catch {
      /*
       * Ignore unrelated browser
       * values that are not JSON.
       */
    }
  }

  return deduplicateListings(
    collected
  );
}


async function readApiSavedListings():
  Promise<Listing[]> {
  try {
    const response =
      await fetch(
        "/api/saved-listings",
        {
          cache:
            "no-store"
        }
      );

    if (!response.ok) {
      return [];
    }

    const result:
      unknown =
        await response.json();

    return deduplicateListings(
      extractListings(
        result
      )
    );
  } catch {
    return [];
  }
}


function formatPlanDate(
  dateValue: string
): string {
  const [
    year,
    month,
    day
  ] =
    dateValue
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
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

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
  value:
    number |
    null
): string {
  if (
    value === null
  ) {
    return "Price not confirmed";
  }

  if (
    value === 0
  ) {
    return "Free";
  }

  return new Intl.NumberFormat(
    "en-CA",
    {
      style:
        "currency",

      currency:
        "CAD",

      maximumFractionDigits:
        0
    }
  ).format(value);
}


export default function SavedPage() {
  const [
    ready,
    setReady
  ] =
    useState(false);

  const [
    listings,
    setListings
  ] =
    useState<Listing[]>(
      []
    );

  const [
    outings,
    setOutings
  ] =
    useState<
      GeneratedOutingPlan[]
    >(
      []
    );


  const refreshSaved =
    useCallback(
      async () => {
        const browserListings =
          readBrowserSavedListings();

        const apiListings =
          await readApiSavedListings();

        setListings(
          deduplicateListings([
            ...browserListings,
            ...apiListings
          ])
        );

        setOutings(
          getSavedOutings()
        );

        setReady(true);
      },
      []
    );


  useEffect(
    () => {
      const refresh =
        () => {
          void refreshSaved();
        };

      const refreshWhenVisible =
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            refresh();
          }
        };

      refresh();

      window.addEventListener(
        "storage",
        refresh
      );

      window.addEventListener(
        "focus",
        refresh
      );

      window.addEventListener(
        SAVED_OUTINGS_EVENT,
        refresh
      );

      for (
        const eventName
        of SAVED_LISTING_EVENTS
      ) {
        window.addEventListener(
          eventName,
          refresh
        );
      }

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
          SAVED_OUTINGS_EVENT,
          refresh
        );

        for (
          const eventName
          of SAVED_LISTING_EVENTS
        ) {
          window.removeEventListener(
            eventName,
            refresh
          );
        }

        document.removeEventListener(
          "visibilitychange",
          refreshWhenVisible
        );
      };
    },
    [
      refreshSaved
    ]
  );


  function handleRemoveOuting(
    planId: string
  ) {
    removeSavedOuting(
      planId
    );

    setOutings(
      (
        currentOutings
      ) =>
        currentOutings.filter(
          (outing) =>
            outing.planId !==
            planId
        )
    );
  }


  if (!ready) {
    return (
      <section
        className="empty-state"
      >
        <div
          aria-hidden="true"
        >
          ♡
        </div>

        <h1>
          Opening your saves
        </h1>

        <p>
          Gathering your listings
          and complete outings.
        </p>
      </section>
    );
  }


  if (
    listings.length ===
      0 &&
    outings.length ===
      0
  ) {
    return (
      <VentureSavedEmptyState />
    );
  }


  return (
    <main
      className="saved-page"
    >
      <header
        className="section-heading"
      >
        <div>
          <span>
            YOUR COLLECTION
          </span>

          <h1>
            Saved
          </h1>

          <p>
            Restaurants, events,
            and complete Winnipeg
            outings you kept for
            later.
          </p>
        </div>
      </header>

      <section
        className="section-block"
      >
        <div
          className="section-heading"
        >
          <div>
            <span>
              COMPLETE PLANS
            </span>

            <h2>
              {outings.length}{" "}
              {
                outings.length ===
                1
                  ? "outing"
                  : "outings"
              }
            </h2>
          </div>

          <Link
            href="/build-outing"
          >
            Build another
          </Link>
        </div>

        {
          outings.length >
          0
            ? (
              <div
                className="saved-outing-grid"
              >
                {
                  outings.map(
                    (outing) => (
                      <article
                        className="saved-outing-card"
                        key={
                          outing.planId
                        }
                      >
                        <div
                          className="saved-outing-card-top"
                        >
                          <div>
                            <span>
                              SAVED OUTING
                            </span>

                            <h3>
                              {
                                outing.title
                              }
                            </h3>
                          </div>

                          <span
                            className="saved-outing-stop-badge"
                          >
                            {
                              outing.stops
                                .length
                            }{" "}
                            {
                              outing.stops
                                .length ===
                              1
                                ? "stop"
                                : "stops"
                            }
                          </span>
                        </div>

                        <div
                          className="saved-outing-meta"
                        >
                          <span>
                            {
                              formatPlanDate(
                                outing.date
                              )
                            }
                          </span>

                          <span>
                            {
                              outing
                                .requestedStartTime
                            }
                          </span>

                          <span>
                            {
                              outing
                                .transportation
                            }
                          </span>

                          <span>
                            {
                              formatCost(
                                outing
                                  .estimatedTotalCad
                              )
                            }
                          </span>
                        </div>

                        {
                          outing.stops
                            .length >
                          0
                            ? (
                              <div
                                className="saved-outing-stop-preview"
                              >
                                {
                                  outing.stops
                                    .slice(
                                      0,
                                      3
                                    )
                                    .map(
                                      (
                                        stop
                                      ) => (
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
                                                stop.listing
                                                  .name
                                              }
                                            </strong>
                                          </span>
                                        </div>
                                      )
                                    )
                                }
                              </div>
                            )
                            : (
                              <p
                                className="saved-outing-no-stops"
                              >
                                No stops are stored
                                in this outing.
                              </p>
                            )
                        }

                        <div
                          className="saved-outing-actions"
                        >
                          <Link
                            href={`/saved/outings/${encodeURIComponent(
                              outing.planId
                            )}`}
                          >
                            Open outing
                          </Link>

                          <button
                            type="button"
                            onClick={
                              () =>
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
                  )
                }
              </div>
            )
            : (
              <div
                className="saved-inline-state"
              >
                <p>
                  No complete outings
                  saved yet.
                </p>

                <Link
                  href="/build-outing"
                >
                  Build an outing
                </Link>
              </div>
            )
        }
      </section>

      <section
        className="section-block"
      >
        <div
          className="section-heading"
        >
          <div>
            <span>
              INDIVIDUAL PICKS
            </span>

            <h2>
              {listings.length}{" "}
              {
                listings.length ===
                1
                  ? "listing"
                  : "listings"
              }
            </h2>
          </div>

          <Link
            href="/explore"
          >
            Explore more
          </Link>
        </div>

        {
          listings.length >
          0
            ? (
              <div
                className="vertical-list"
              >
                {
                  listings.map(
                    (listing) => (
                      <ListingCard
                        key={`${listing.type}-${listing.id}`}
                        listing={
                          listing
                        }
                      />
                    )
                  )
                }
              </div>
            )
            : (
              <div
                className="saved-inline-state"
              >
                <p>
                  Tap the heart on
                  any event or food
                  listing to keep it
                  here.
                </p>

                <Link
                  href="/explore"
                >
                  Explore Winnipeg
                </Link>
              </div>
            )
        }
      </section>
    </main>
  );
}