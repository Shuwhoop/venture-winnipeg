import Link from "next/link";

import {
  DiscoveryFilterSheet
} from "@/components/discovery-filter-sheet";

import {
  ExploreExperience
} from "@/components/explore-experience";

import {
  ExploreSearchForm
} from "@/components/explore-search-form";

import {
  parseDiscoveryIntent,
  type DiscoveryFilter,
  type DiscoveryOccasion,
  type DiscoveryPrice,
  type DiscoveryWhen
} from "@/lib/discovery-intent";

import {
  getExploreNeighbourhoods,
  mergeExploreListings,
  searchPublishedEvents,
  searchPublishedPlaces
} from "@/lib/explore-search";

import styles from "./explore.module.css";

export const dynamic = "force-dynamic";

const EXPLORE_PAGE_SIZE = 24;
const MAX_LOADED_RESULTS = 480;

type ExplorePageProps = {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    when?: string;
    price?: string;
    occasion?: string;
    area?: string;
    new?: string;
    near?: string;
    take?: string;
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


function getValidOccasion(
  value: string | undefined
): DiscoveryOccasion | null {
  if (
    value === "any" ||
    value === "date"
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
  occasion,
  area,
  newToMe,
  nearbyRequested,
  take
}: {
  filter: DiscoveryFilter;
  search: string;
  when: DiscoveryWhen;
  price: DiscoveryPrice;
  occasion: DiscoveryOccasion;
  area: string;
  newToMe: boolean;
  nearbyRequested?: boolean;
  take?: number;
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

  if (occasion !== "any") {
    params.set("occasion", occasion);
  }

  if (area) {
    params.set("area", area);
  }

  if (newToMe) {
    params.set("new", "1");
  }

  if (nearbyRequested) {
    params.set("near", "me");
  }

  if (
    take &&
    take > EXPLORE_PAGE_SIZE
  ) {
    params.set(
      "take",
      String(take)
    );
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
    occasion: requestedOccasion,
    area: requestedArea = "",
    new: requestedNew,
    near: requestedNear,
    take: requestedTakeValue
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

  const activeOccasion =
    getValidOccasion(requestedOccasion) ??
    intent.inferredOccasion ??
    "any";

  const activeArea =
    requestedArea.trim();

  const newToMe =
    requestedNew === "1" ||
    intent.newToMe;

  const nearbyRequested =
    requestedNear === "me";

  const parsedTake = Number(
    requestedTakeValue ??
      EXPLORE_PAGE_SIZE
  );

  const requestedTake = Math.min(
    MAX_LOADED_RESULTS,
    Math.max(
      EXPLORE_PAGE_SIZE,
      Math.ceil(
        (Number.isFinite(parsedTake)
          ? parsedTake
          : EXPLORE_PAGE_SIZE) /
          EXPLORE_PAGE_SIZE
      ) * EXPLORE_PAGE_SIZE
    )
  );

  const sourceLimit = nearbyRequested
    ? MAX_LOADED_RESULTS
    : Math.min(
        MAX_LOADED_RESULTS,
        requestedTake + 1
      );

  const [
    eventResult,
    placeResult,
    neighbourhoods
  ] = await Promise.all([
    searchPublishedEvents({
      search: intent.cleanedQuery,
      filter: activeFilter,
      when: activeWhen,
      price: activePrice,
      occasion: activeOccasion,
      area: activeArea,
      limit: sourceLimit
    }),
    searchPublishedPlaces({
      search: intent.cleanedQuery,
      filter: activeFilter,
      when: activeWhen,
      price: activePrice,
      occasion: activeOccasion,
      area: activeArea,
      limit: sourceLimit
    }),
    getExploreNeighbourhoods()
  ]);

  const combinedListings =
    mergeExploreListings(
      eventResult.listings,
      placeResult.listings,
      activeFilter
    );

  const nearbyPool = nearbyRequested
    ? combinedListings.slice(
        0,
        MAX_LOADED_RESULTS
      )
    : combinedListings;

  const filteredListings = nearbyRequested
    ? nearbyPool
    : nearbyPool.slice(
        0,
        requestedTake
      );

  const loadedResultCount = Math.min(
    nearbyPool.length,
    requestedTake
  );

  const hasMore =
    combinedListings.length >
      requestedTake ||
    eventResult.hasMore ||
    placeResult.hasMore;

  const nextTake = Math.min(
    MAX_LOADED_RESULTS,
    requestedTake +
      EXPLORE_PAGE_SIZE
  );

  const loadMoreHref =
    hasMore &&
    requestedTake <
      MAX_LOADED_RESULTS
      ? buildExploreHref({
          filter: activeFilter,
          search: q,
          when: activeWhen,
          price: activePrice,
          occasion: activeOccasion,
          area: activeArea,
          newToMe,
          nearbyRequested,
          take: nextTake
        })
      : null;

  const filters: {
    label: string;
    value: DiscoveryFilter;
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
      label: "Food & drink",
      value: "food"
    },
    {
      label: "Activities",
      value: "activities"
    },
    {
      label: "Nightlife",
      value: "nightlife"
    },
    {
      label: "Attractions",
      value: "attractions"
    },
    {
      label: "Open now",
      value: "open"
    },
    {
      label: "Verified",
      value: "verified"
    }
  ];

  const resultsEyebrow = nearbyRequested
    ? "NEAR YOU"
    : newToMe
      ? "NEW TO YOU"
      : activeOccasion === "date"
        ? "DATE IDEAS"
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
        : activeFilter === "nightlife"
          ? "bar"
          : "place";

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
              : activeFilter === "open"
                ? "Open now"
                : activeFilter === "verified"
                  ? "Verified"
                  : null,
    readableWhen(activeWhen),
    readablePrice(activePrice),
    activeOccasion === "date"
      ? "Date ideas"
      : null,
    activeArea || null,
    nearbyRequested ? "Nearest first" : null,
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
            Search naturally, shape the results,
            then switch between list and map when
            location matters.
          </p>
        </div>

        <div
          className={styles.heroBadge}
          aria-label={`${loadedResultCount} matching listings before visit-history filtering`}
        >
          <strong>
            {loadedResultCount}
            {hasMore ? "+" : ""}
          </strong>
          <span>LOADED</span>
        </div>
      </section>

      <section
        className={styles.discoveryControls}
        aria-label="Explore search and filters"
      >
        <ExploreSearchForm
          defaultQuery={q}
          currentFilter={activeFilter}
          currentWhen={activeWhen}
          currentPrice={activePrice}
          currentOccasion={activeOccasion}
          currentArea={activeArea}
          newToMe={newToMe}
          nearbyRequested={nearbyRequested}
          className={styles.searchForm}
          screenReaderClassName={styles.srOnly}
          iconClassName={styles.searchIcon}
        />

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
            currentOccasion={activeOccasion}
            currentArea={activeArea}
            newToMe={newToMe}
            nearbyRequested={nearbyRequested}
            neighbourhoods={neighbourhoods}
          />

          <div
            className={styles.filterRail}
            aria-label="Explore quick filters"
          >
            <Link
              className={`${styles.filterChip} ${
                nearbyRequested
                  ? styles.activeFilter
                  : ""
              }`}
              href={buildExploreHref({
                filter: activeFilter,
                search: q,
                when: activeWhen,
                price: activePrice,
                occasion: activeOccasion,
                area: activeArea,
                newToMe,
                nearbyRequested:
                  !nearbyRequested
              })}
              aria-current={
                nearbyRequested
                  ? "page"
                  : undefined
              }
            >
              <span>Near me</span>
            </Link>

            <Link
              className={`${styles.filterChip} ${
                activeOccasion === "date"
                  ? styles.activeFilter
                  : ""
              }`}
              href={buildExploreHref({
                filter: activeFilter,
                search: q,
                when: activeWhen,
                price: activePrice,
                occasion:
                  activeOccasion === "date"
                    ? "any"
                    : "date",
                area: activeArea,
                newToMe,
                nearbyRequested
              })}
              aria-current={
                activeOccasion === "date"
                  ? "page"
                  : undefined
              }
            >
              <span>Date ideas</span>
            </Link>

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
                  occasion: activeOccasion,
                  area: activeArea,
                  newToMe,
                  nearbyRequested
                })}
                key={filter.value}
                aria-current={
                  activeFilter === filter.value
                    ? "page"
                    : undefined
                }
              >
                <span>{filter.label}</span>
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
        hasMore={hasMore}
        loadMoreHref={loadMoreHref}
        pageSize={EXPLORE_PAGE_SIZE}
        nearbyRequested={nearbyRequested}
        resultLimit={requestedTake}
        analyticsContext={{
          filter: activeFilter,
          when: activeWhen,
          price: activePrice,
          occasion: activeOccasion,
          area: activeArea,
          newToMe
        }}
      />
    </main>
  );
}
