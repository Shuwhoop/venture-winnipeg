"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  trackBetaEvent
} from "@/lib/beta/client";

import type {
  DiscoveryFilter,
  DiscoveryOccasion,
  DiscoveryPrice,
  DiscoveryWhen
} from "@/lib/discovery-intent";

const RECENT_SEARCHES_KEY =
  "venture-explore-recent-searches-v1";

const suggestedSearches = [
  "date ideas",
  "cheap food downtown",
  "free events tonight",
  "coffee near university",
  "live music this weekend",
  "something open now"
];

type ExploreSearchFormProps = {
  defaultQuery: string;
  currentFilter: DiscoveryFilter;
  currentWhen: DiscoveryWhen;
  currentPrice: DiscoveryPrice;
  currentOccasion: DiscoveryOccasion;
  currentArea: string;
  newToMe: boolean;
  nearbyRequested?: boolean;
  className: string;
  screenReaderClassName: string;
  iconClassName: string;
};

function loadRecentSearches(): string[] {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(
        RECENT_SEARCHES_KEY
      ) ?? "[]"
    );

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (value): value is string =>
          typeof value === "string"
      )
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 5);
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query) {
    return;
  }

  try {
    const existing =
      loadRecentSearches();

    const next = [
      query,
      ...existing.filter(
        (value) =>
          value.toLowerCase() !==
          query.toLowerCase()
      )
    ].slice(0, 5);

    window.localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(next)
    );
  } catch {
    // Search still works when storage is unavailable.
  }
}

export function ExploreSearchForm({
  defaultQuery,
  currentFilter,
  currentWhen,
  currentPrice,
  currentOccasion,
  currentArea,
  newToMe,
  nearbyRequested = false,
  className,
  screenReaderClassName,
  iconClassName
}: ExploreSearchFormProps) {
  const [recentSearches, setRecentSearches] =
    useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(
      loadRecentSearches()
    );
  }, []);

  const searchOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...recentSearches,
          ...suggestedSearches
        ])
      ),
    [recentSearches]
  );

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    const formData =
      new FormData(event.currentTarget);

    const query = String(
      formData.get("q") ?? ""
    ).trim();

    saveRecentSearch(query);

    trackBetaEvent({
      eventName: "discovery_search_submitted",
      pagePath: window.location.pathname,
      properties: {
        surface: "explore",
        interaction: "search-submitted",
        query,
        queryLength: query.length,
        nearbyRequested
      }
    });
  }

  return (
    <form
      className={className}
      action="/explore"
      onSubmit={handleSubmit}
    >
      <label
        className={screenReaderClassName}
        htmlFor="explore-search"
      >
        Search Winnipeg listings
      </label>

      <span
        className={iconClassName}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      </span>

      <input
        id="explore-search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Try “free events tonight”"
        autoComplete="off"
        list="venture-explore-suggestions"
      />

      <datalist id="venture-explore-suggestions">
        {searchOptions.map((option) => (
          <option
            value={option}
            key={option}
          />
        ))}
      </datalist>

      {currentFilter !== "all" ? (
        <input
          type="hidden"
          name="filter"
          value={currentFilter}
        />
      ) : null}

      {currentWhen !== "any" ? (
        <input
          type="hidden"
          name="when"
          value={currentWhen}
        />
      ) : null}

      {currentPrice !== "any" ? (
        <input
          type="hidden"
          name="price"
          value={currentPrice}
        />
      ) : null}

      {currentOccasion !== "any" ? (
        <input
          type="hidden"
          name="occasion"
          value={currentOccasion}
        />
      ) : null}

      {currentArea ? (
        <input
          type="hidden"
          name="area"
          value={currentArea}
        />
      ) : null}

      {newToMe ? (
        <input
          type="hidden"
          name="new"
          value="1"
        />
      ) : null}

      {nearbyRequested ? (
        <input
          type="hidden"
          name="near"
          value="me"
        />
      ) : null}

      <button type="submit">
        Search
      </button>
    </form>
  );
}
