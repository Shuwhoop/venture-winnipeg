import Link from "next/link";

import {
  DiscoveryFilterSheet
} from "@/components/discovery-filter-sheet";

import {
  ExploreExperience
} from "@/components/explore-experience";

import {
  getPublishedEventListings
} from "@/lib/data/events";

import {
  getPublishedPlaceListings
} from "@/lib/data/places";

import {
  matchesDiscoveryFilter,
  matchesDiscoveryPrice,
  matchesDiscoverySearch,
  matchesDiscoveryWhen,
  parseDiscoveryIntent,
  type DiscoveryFilter,
  type DiscoveryPrice,
  type DiscoveryWhen
} from "@/lib/discovery-intent";

import type {
  Listing
} from "@/lib/types";

import styles from "./explore.module.css";

export const dynamic = "force-dynamic";

type ExplorePageProps = {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    when?: string;
    price?: string;
    area?: string;
    new?: string;
    view?: string;
  }>;
};

function getValidFilter(
  value: string | undefined
): DiscoveryFilter | null {
  if (
    value === "all" ||
    value === "events" ||
    value === "food" ||
    value === "activities" ||
    value === "nightlife" ||
    value === "attractions" ||
    value === "shopping" ||
    value === "open" ||
    value === "verified"
  ) {
    return value;
  }

  return null;
}

function getValidWhen(
  value: string | undefined
): DiscoveryWhen | null {
  if (
    value === "any" ||
    value === "tonight" ||
    value === "weekend" ||
    value === "open"
  ) {
    return value;
  }

  return null;
}

function getValidPrice(
  value: string | undefined
): DiscoveryPrice | null {
  if (
    value === "any" ||
    value === "free" ||
    value === "under-20" ||
    value === "under-40"
  ) {
    return value;
  }

  return null;
}

function buildExploreHref({
  filter,
  search,
  when,
  price,
  area,
  newToMe
}: {
  filter: DiscoveryFilter;
  search: string;
  when: DiscoveryWhen;
  price: DiscoveryPrice;
  area: string;
  newToMe: boolean;
}) {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("q", search.trim());
  }

  if (filter !== "all") {
    params.set("filter", filter);
  }

  if (when !== "any") {
    params.set("when", when);
  }

  if (price !== "any") {
    params.set("price", price);
  }

  if (area) {
    params.set("area", area);
  }

  if (newToMe) {
    params.set("new", "1");
  }

  const query = params.toString();

  return query
    ? `/explore?${query}`
    : "/explore";
}

function readableWhen(
  when: DiscoveryWhen
) {
  if (when === "tonight") {
    return "Tonight";
  }

  if (when === "weekend") {
    return "This weekend";
  }

  if (when === "open") {
    return "Open now";
  }

  return null;
}

function readablePrice(
  price: DiscoveryPrice
) {
  if (price === "free") {
    return "Free";
  }

  if (price === "under-20") {
    return "Under $20";
  }

  if (price === "under-40") {
    return "Under $40";
  }

  return null;
}

export default async function ExplorePage({
  searchParams
}: ExplorePageProps) {
  const {
    q = "",
    filter: requestedFilter,
    when: requestedWhen,
    price: requestedPrice,
    area: requestedArea = "",
    new: requestedNew,
    view: requestedView
  } = await searchParams;

  const intent =
    parseDiscoveryIntent(q);

  const activeFilter =
    getValidFilter(requestedFilter) ??
    intent.inferredFilter ??
    "all";

  const activeWhen =
    getValidWhen(requestedWhen) ??
    intent.inferredWhen ??
    "any";

  const activePrice =
    getValidPrice(requestedPrice) ??
    intent.inferredPrice ??
    "any";

  const activeArea =
    requestedArea.trim();

  const newToMe =
    requestedNew === "1" ||
    intent.newToMe;

  const [databaseEvents, databasePlaces] =
    await Promise.all([
      getPublishedEventListings(100),
      getPublishedPlaceListings(100)
    ]);

  const combinedListings: Listing[] = [
    ...databaseEvents,
    ...databasePlaces
  ];

  const neighbourhoods = Array.from(
    new Set(
      combinedListings
        .map((listing) =>
          listing.neighbourhood.trim()
        )
        .filter(Boolean)
    )
  ).sort((first, second) =>
    first.localeCompare(second)
  );

  const searchAndAdvancedMatches =
    combinedListings.filter(
      (listing) =>
        matchesDiscoverySearch(
          listing,
          intent.cleanedQuery
        ) &&
        matchesDiscoveryPrice(
          listing,
          activePrice
        ) &&
        matchesDiscoveryWhen(
          listing,
          activeWhen
        ) &&
        (
          !activeArea ||
          listing.neighbourhood
            .toLowerCase()
            .includes(
              activeArea.toLowerCase()
            )
        )
    );

  const filteredListings =
    searchAndAdvancedMatches.filter(
      (listing) =>
        matchesDiscoveryFilter(
          listing,
          activeFilter
        )
    );

  const filters: {
    label: string;
    value: DiscoveryFilter;
    count: number;
  }[] = [
    {
      label: "All",
      value: "all",
      count:
        searchAndAdvancedMatches.length
    },
    {
      label: "Events",
      value: "events",
      count:
        searchAndAdvancedMatches.filter(
          (listing) =>
            matchesDiscoveryFilter(
              listing,
              "events"
            )
        ).length
    },
    {
      label: "Food & drink",
      value: "food",
      count:
        searchAndAdvancedMatches.filter(
          (listing) =>
            matchesDiscoveryFilter(
              listing,
              "food"
            )
        ).length
    },
    {
      label: "Activities",
      value: "activities",
      count:
        searchAndAdvancedMatches.filter(
          (listing) =>
            matchesDiscoveryFilter(
              listing,
              "activities"
            )
        ).length
    },
    {
      label: "Nightlife",
      value: "nightlife",
      count:
        searchAndAdvancedMatches.filter(
          (listing) =>
            matchesDiscoveryFilter(
              listing,
              "nightlife"
            )
        ).length
    },
    {
      label: "Attractions",
      value: "attractions",
      count:
        searchAndAdvancedMatches.filter(
          (listing) =>
            matchesDiscoveryFilter(
              listing,
              "attractions"
            )
        ).length
    },
    {
      label: "Shopping",
      value: "shopping",
      count:
        searchAndAdvancedMatches.filter(
          (listing) =>
            matchesDiscoveryFilter(
              listing,
              "shopping"
            )
        ).length
    },
    {
      label: "Open now",
      value: "open",
      count:
        searchAndAdvancedMatches.filter(
          (listing) =>
            matchesDiscoveryFilter(
              listing,
              "open"
            )
        ).length
    },
    {
      label: "Verified",
      value: "verified",
      count:
        searchAndAdvancedMatches.filter(
          (listing) =>
            matchesDiscoveryFilter(
              listing,
              "verified"
            )
        ).length
    }
  ];

  const resultsEyebrow = newToMe
    ? "NEW TO YOU"
    : activeFilter === "all"
      ? "WINNIPEG PICKS"
      : filters.find(
          (filter) =>
            filter.value ===
            activeFilter
        )?.label.toUpperCase() ??
        "RESULTS";

  const requestType =
    activeFilter === "events"
      ? "event"
      : activeFilter === "food" ||
          activeFilter === "open"
        ? "restaurant"
        : activeFilter === "activities" ||
            activeFilter === "nightlife" ||
            activeFilter === "attractions" ||
            activeFilter === "shopping"
          ? "place"
          : "other";

  const interpretedLabels = [
    activeFilter === "events"
      ? "Events"
      : activeFilter === "food"
        ? "Food & drink"
        : activeFilter === "activities"
          ? "Activities"
          : activeFilter === "nightlife"
            ? "Nightlife"
            : activeFilter === "attractions"
              ? "Attractions"
              : activeFilter === "shopping"
                ? "Shopping"
                : null,
    readableWhen(activeWhen),
    readablePrice(activePrice),
    activeArea || null,
    newToMe ? "New to me" : null
  ].filter(
    (value): value is string =>
      Boolean(value)
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            DISCOVER YOUR CITY
          </span>

          <h1>Explore Winnipeg</h1>

          <p>
            Browse Winnipeg events, restaurants,
            activities and attractions, then use the
            map when location matters.
          </p>
        </div>

        <div
          className={styles.heroBadge}
          aria-label={`${filteredListings.length} matching listings before visit-history filtering`}
        >
          <strong>{filteredListings.length}</strong>
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
            placeholder="Try “escape rooms” or “free events tonight”"
            autoComplete="off"
          />

          <button type="submit">
            Search
          </button>
        </form>

        {q.trim() ||
        interpretedLabels.length > 0 ? (
          <div
            className={styles.interpretation}
          >
            <div>
              <span>
                {intent.interpreted
                  ? "VENTURE UNDERSTOOD"
                  : "ACTIVE SEARCH"}
              </span>

              <p>
                {intent.cleanedQuery
                  ? `Searching for “${intent.cleanedQuery}”`
                  : "Showing the city through your selected filters."}
              </p>
            </div>

            {interpretedLabels.length > 0 ? (
              <div
                className={styles.intentChips}
              >
                {interpretedLabels.map(
                  (label) => (
                    <b key={label}>{label}</b>
                  )
                )}
              </div>
            ) : null}

            <Link href="/explore">
              Clear
            </Link>
          </div>
        ) : null}

        <div
          className={styles.filterActionRow}
        >
          <DiscoveryFilterSheet
            searchQuery={q}
            currentFilter={activeFilter}
            currentWhen={activeWhen}
            currentPrice={activePrice}
            currentArea={activeArea}
            newToMe={newToMe}
            neighbourhoods={neighbourhoods}
          />

          <div
            className={styles.filterRail}
            aria-label="Explore quick filters"
          >
            {filters.map((filter) => (
              <Link
                className={`${styles.filterChip} ${
                  activeFilter === filter.value
                    ? styles.activeFilter
                    : ""
                }`}
                href={buildExploreHref({
                  filter: filter.value,
                  search: q,
                  when: activeWhen,
                  price: activePrice,
                  area: activeArea,
                  newToMe
                })}
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
        </div>
      </section>

      <ExploreExperience
        listings={filteredListings}
        eyebrow={resultsEyebrow}
        searchQuery={q.trim()}
        requestType={requestType}
        newToMeOnly={newToMe}
        initialView={
          requestedView === "map"
            ? "map"
            : "list"
        }
      />
    </main>
  );
}
