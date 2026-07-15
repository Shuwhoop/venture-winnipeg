import Link from "next/link";

import {
  CityMap
} from "@/components/city-map";

import {
  PersonalizedExploreResults
} from "@/components/personalized-explore-results";

import {
  getPublishedEventListings
} from "@/lib/data/events";

import {
  getPublishedPlaceListings
} from "@/lib/data/places";

import type {
  Listing
} from "@/lib/types";

export const dynamic =
  "force-dynamic";

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
  const params =
    new URLSearchParams();

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

  const query =
    params.toString();

  return query
    ? `/explore?${query}`
    : "/explore";
}

function isVerified(
  listing: Listing
): boolean {
  return (
    listing.verification !==
      "unverified" &&
    listing.verification !==
      "community_reported"
  );
}

export default async function ExplorePage({
  searchParams
}: ExplorePageProps) {
  const {
    q = "",
    filter: requestedFilter
  } = await searchParams;

  const activeFilter =
    getValidFilter(
      requestedFilter
    );

  const [
    databaseEvents,
    databasePlaces
  ] = await Promise.all([
    getPublishedEventListings(25),
    getPublishedPlaceListings(25)
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
              listing.address ?? ""
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
      (listing) => {
        switch (activeFilter) {
          case "events":
            return (
              listing.type ===
              "event"
            );

          case "food":
            return (
              listing.type ===
              "restaurant"
            );

          case "open":
            return (
              listing.type ===
                "restaurant" &&
              listing.isOpenNow ===
                true
            );

          case "verified":
            return isVerified(
              listing
            );

          default:
            return true;
        }
      }
    );

  const filters: {
    label: string;
    value: ExploreFilter;
  }[] = [
    {
      label: "All",
      value: "all"
    },
    {
      label: "Events",
      value: "events"
    },
    {
      label: "Food",
      value: "food"
    },
    {
      label: "Open now",
      value: "open"
    },
    {
      label: "Verified only",
      value: "verified"
    }
  ];

  const resultsEyebrow =
    activeFilter === "all"
      ? "RESULTS"
      : activeFilter.toUpperCase();

  return (
    <>
      <div className="page-heading">
        <span>CITYWIDE</span>

        <h1>
          Explore Winnipeg
        </h1>
      </div>

      <form
        className="search-field"
        action="/explore"
      >
        <label htmlFor="search">
          Search
        </label>

        <input
          id="search"
          name="q"
          defaultValue={q}
          placeholder="Try anime downtown"
        />

        {activeFilter !== "all" ? (
          <input
            type="hidden"
            name="filter"
            value={activeFilter}
          />
        ) : null}
      </form>

      <div
        className="chips"
        aria-label="Explore filters"
      >
        {filters.map((filter) => (
          <Link
            className={`filter-chip ${
              activeFilter ===
              filter.value
                ? "active"
                : ""
            }`}
            href={buildExploreHref(
              filter.value,
              q
            )}
            key={filter.value}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <CityMap />

      <PersonalizedExploreResults
        listings={filteredListings}
        eyebrow={resultsEyebrow}
      />
    </>
  );
}