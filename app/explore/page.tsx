import Link from "next/link";

import {
  ExploreExperience
} from "@/components/explore-experience";

import {
  getPublishedEventListings
} from "@/lib/data/events";

import {
  getPublishedPlaceListings
} from "@/lib/data/places";

import type {
  Listing
} from "@/lib/types";

import styles from "./explore.module.css";

export const dynamic = "force-dynamic";

type ExploreFilter =
  | "all"
  | "events"
  | "food"
  | "open"
  | "verified";

type ExplorePageProps = {
  searchParams: Promise<{
    q?: string;
    filter?: string;
  }>;
};

function getValidFilter(
  filter: string | undefined
): ExploreFilter {
  if (
    filter === "events" ||
    filter === "food" ||
    filter === "open" ||
    filter === "verified"
  ) {
    return filter;
  }

  return "all";
}

function buildExploreHref(
  filter: ExploreFilter,
  search: string
): string {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set(
      "q",
      search.trim()
    );
  }

  if (filter !== "all") {
    params.set(
      "filter",
      filter
    );
  }

  const query = params.toString();

  return query
    ? `/explore?${query}`
    : "/explore";
}

function isVerified(
  listing: Listing
): boolean {
  return (
    listing.verification !== "unverified" &&
    listing.verification !== "community_reported"
  );
}

function matchesFilter(
  listing: Listing,
  filter: ExploreFilter
): boolean {
  switch (filter) {
    case "events":
      return listing.type === "event";

    case "food":
      return listing.type === "restaurant";

    case "open":
      return (
        listing.type === "restaurant" &&
        listing.isOpenNow === true
      );

    case "verified":
      return isVerified(listing);

    default:
      return true;
  }
}

export default async function ExplorePage({
  searchParams
}: ExplorePageProps) {
  const {
    q = "",
    filter: requestedFilter
  } = await searchParams;

  const activeFilter =
    getValidFilter(requestedFilter);

  const [
    databaseEvents,
    databasePlaces
  ] = await Promise.all([
    getPublishedEventListings(60),
    getPublishedPlaceListings(60)
  ]);

  const combinedListings: Listing[] = [
    ...databaseEvents,
    ...databasePlaces
  ];

  const normalizedSearch =
    q.trim().toLowerCase();

  const searchedListings =
    normalizedSearch.length === 0
      ? combinedListings
      : combinedListings.filter(
          (listing) => {
            const searchableText = [
              listing.name,
              listing.category,
              listing.subtitle,
              listing.neighbourhood,
              listing.description,
              listing.venueName ?? "",
              listing.address ?? "",
              ...(listing.searchTerms ?? [])
            ]
              .join(" ")
              .toLowerCase();

            return searchableText.includes(
              normalizedSearch
            );
          }
        );

  const filteredListings =
    searchedListings.filter(
      (listing) =>
        matchesFilter(
          listing,
          activeFilter
        )
    );

  const filters: {
    label: string;
    value: ExploreFilter;
    count: number;
  }[] = [
    {
      label: "All",
      value: "all",
      count: searchedListings.length
    },
    {
      label: "Events",
      value: "events",
      count: searchedListings.filter(
        (listing) =>
          matchesFilter(
            listing,
            "events"
          )
      ).length
    },
    {
      label: "Food & drink",
      value: "food",
      count: searchedListings.filter(
        (listing) =>
          matchesFilter(
            listing,
            "food"
          )
      ).length
    },
    {
      label: "Open now",
      value: "open",
      count: searchedListings.filter(
        (listing) =>
          matchesFilter(
            listing,
            "open"
          )
      ).length
    },
    {
      label: "Verified",
      value: "verified",
      count: searchedListings.filter(
        (listing) =>
          matchesFilter(
            listing,
            "verified"
          )
      ).length
    }
  ];

  const resultsEyebrow =
    activeFilter === "all"
      ? "WINNIPEG PICKS"
      : filters.find(
          (filter) =>
            filter.value === activeFilter
        )?.label.toUpperCase() ??
        "RESULTS";

  const requestType =
    activeFilter === "events"
      ? "event"
      : activeFilter === "food" ||
          activeFilter === "open"
        ? "restaurant"
        : "other";

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            DISCOVER YOUR CITY
          </span>

          <h1>Explore Winnipeg</h1>

          <p>
            Search trusted places and upcoming
            events, then switch between a clean
            list and a map whenever location
            matters.
          </p>
        </div>

        <div
          className={styles.heroBadge}
          aria-label={`${filteredListings.length} matching listings`}
        >
          <strong>
            {filteredListings.length}
          </strong>

          <span>
            {filteredListings.length === 1
              ? "MATCH"
              : "MATCHES"}
          </span>
        </div>
      </section>

      <section
        className={styles.discoveryControls}
        aria-label="Explore search and filters"
      >
        <form
          className={styles.searchForm}
          action="/explore"
        >
          <label
            className={styles.srOnly}
            htmlFor="explore-search"
          >
            Search Winnipeg listings
          </label>

          <span
            className={styles.searchIcon}
            aria-hidden="true"
          >
            ⌕
          </span>

          <input
            id="explore-search"
            name="q"
            defaultValue={q}
            placeholder="Restaurant, event, area..."
            autoComplete="off"
          />

          {activeFilter !== "all" ? (
            <input
              type="hidden"
              name="filter"
              value={activeFilter}
            />
          ) : null}

          <button type="submit">
            Search
          </button>
        </form>

        {q.trim() ? (
          <div className={styles.searchSummary}>
            <span>
              Results for <strong>“{q.trim()}”</strong>
            </span>

            <Link href="/explore">
              Clear search
            </Link>
          </div>
        ) : null}

        <div
          className={styles.filterRail}
          aria-label="Explore filters"
        >
          {filters.map((filter) => (
            <Link
              className={`${styles.filterChip} ${
                activeFilter === filter.value
                  ? styles.activeFilter
                  : ""
              }`}
              href={buildExploreHref(
                filter.value,
                q
              )}
              key={filter.value}
              aria-current={
                activeFilter === filter.value
                  ? "page"
                  : undefined
              }
            >
              <span>{filter.label}</span>
              <strong>{filter.count}</strong>
            </Link>
          ))}
        </div>
      </section>

      <ExploreExperience
        listings={filteredListings}
        eyebrow={resultsEyebrow}
        searchQuery={q.trim()}
        requestType={requestType}
      />
    </main>
  );
}
