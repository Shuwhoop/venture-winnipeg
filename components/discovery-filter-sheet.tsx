"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useRouter
} from "next/navigation";

import {
  createPortal
} from "react-dom";

import type {
  DiscoveryFilter,
  DiscoveryOccasion,
  DiscoveryPrice,
  DiscoveryWhen
} from "@/lib/discovery-intent";

import styles from "./discovery-filter-sheet.module.css";

type DiscoveryFilterSheetProps = {
  searchQuery: string;
  currentFilter: DiscoveryFilter;
  currentWhen: DiscoveryWhen;
  currentPrice: DiscoveryPrice;
  currentOccasion: DiscoveryOccasion;
  currentArea: string;
  newToMe: boolean;
  nearbyRequested?: boolean;
  neighbourhoods: string[];
};

export function DiscoveryFilterSheet({
  searchQuery,
  currentFilter,
  currentWhen,
  currentPrice,
  currentOccasion,
  currentArea,
  newToMe,
  nearbyRequested = false,
  neighbourhoods
}: DiscoveryFilterSheetProps) {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);
  const [filter, setFilter] =
    useState<DiscoveryFilter>(
      currentFilter === "open"
        ? "food"
        : currentFilter
    );
  const [when, setWhen] =
    useState<DiscoveryWhen>(
      currentFilter === "open"
        ? "open"
        : currentWhen
    );
  const [price, setPrice] =
    useState(currentPrice);
  const [occasion, setOccasion] =
    useState(currentOccasion);
  const [area, setArea] =
    useState(currentArea);
  const [onlyNew, setOnlyNew] =
    useState(newToMe);
  const [nearby, setNearby] =
    useState(nearbyRequested);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFilter(
      currentFilter === "open"
        ? "food"
        : currentFilter
    );
    setWhen(
      currentFilter === "open"
        ? "open"
        : currentWhen
    );
    setPrice(currentPrice);
    setOccasion(currentOccasion);
    setArea(currentArea);
    setOnlyNew(newToMe);
    setNearby(nearbyRequested);
  }, [
    open,
    currentFilter,
    currentWhen,
    currentPrice,
    currentOccasion,
    currentArea,
    newToMe,
    nearbyRequested
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);

  const activeCount = useMemo(
    () =>
      [
        currentFilter !== "all",
        currentWhen !== "any",
        currentPrice !== "any",
        currentOccasion !== "any",
        Boolean(currentArea),
        nearbyRequested,
        newToMe
      ].filter(Boolean).length,
    [
      currentFilter,
      currentWhen,
      currentPrice,
      currentOccasion,
      currentArea,
      nearbyRequested,
      newToMe
    ]
  );

  function buildUrl(
    options?: {
      clear?: boolean;
    }
  ) {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set(
        "q",
        searchQuery.trim()
      );
    }

    if (!options?.clear) {
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
        params.set(
          "occasion",
          occasion
        );
      }

      if (area) {
        params.set("area", area);
      }

      if (onlyNew) {
        params.set("new", "1");
      }

      if (nearby) {
        params.set("near", "me");
      }
    }

    const query = params.toString();

    return query
      ? `/explore?${query}`
      : "/explore";
  }

  function applyFilters() {
    setOpen(false);
    router.push(buildUrl());
  }

  function clearFilters() {
    setFilter("all");
    setWhen("any");
    setPrice("any");
    setOccasion("any");
    setArea("");
    setOnlyNew(false);
    setNearby(false);
    setOpen(false);
    router.push(
      buildUrl({
        clear: true
      })
    );
  }

  const sheet = open &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            className={styles.backdrop}
            role="presentation"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setOpen(false);
              }
            }}
          >
            <section
              className={styles.sheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="discovery-filter-title"
            >
              <div
                className={styles.handle}
                aria-hidden="true"
              />

              <header
                className={styles.header}
              >
                <div>
                  <span>SHAPE THE SEARCH</span>
                  <h2
                    id="discovery-filter-title"
                  >
                    Filters
                  </h2>
                </div>

                <button
                  type="button"
                  className={styles.close}
                  onClick={() =>
                    setOpen(false)
                  }
                  aria-label="Close filters"
                >
                  ×
                </button>
              </header>

              <div
                className={styles.scrollArea}
              >
                <fieldset
                  className={styles.group}
                >
                  <legend>What</legend>

                  <div
                    className={styles.segmented}
                  >
                    {(
                      [
                        ["all", "Everything"],
                        ["events", "Events"],
                        ["food", "Food"],
                        ["activities", "Activities"],
                        ["nightlife", "Nightlife"],
                        ["attractions", "Attractions"],
                        ["verified", "Verified"]
                      ] as const
                    ).map(
                      ([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          className={
                            filter === value
                              ? styles.selected
                              : ""
                          }
                          onClick={() =>
                            setFilter(value)
                          }
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                </fieldset>

                <fieldset
                  className={styles.group}
                >
                  <legend>When</legend>

                  <div
                    className={styles.optionGrid}
                  >
                    {(
                      [
                        ["any", "Any time", "See the full city"],
                        ["tonight", "Tonight", "Plans that work today"],
                        ["weekend", "Weekend", "Friday through Sunday"],
                        ["open", "Open now", "Walk in right now"]
                      ] as const
                    ).map(
                      ([value, label, copy]) => (
                        <button
                          type="button"
                          key={value}
                          className={
                            when === value
                              ? styles.selectedCard
                              : ""
                          }
                          onClick={() =>
                            setWhen(value)
                          }
                        >
                          <strong>{label}</strong>
                          <small>{copy}</small>
                        </button>
                      )
                    )}
                  </div>
                </fieldset>

                <fieldset
                  className={styles.group}
                >
                  <legend>Budget</legend>

                  <div
                    className={styles.segmented}
                  >
                    {(
                      [
                        ["any", "Any"],
                        ["free", "Free"],
                        ["under-20", "Under $20"],
                        ["under-40", "Under $40"]
                      ] as const
                    ).map(
                      ([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          className={
                            price === value
                              ? styles.selected
                              : ""
                          }
                          onClick={() =>
                            setPrice(value)
                          }
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                </fieldset>

                <fieldset
                  className={styles.group}
                >
                  <legend>Occasion</legend>

                  <div
                    className={styles.segmented}
                  >
                    {(
                      [
                        ["any", "Any vibe"],
                        ["date", "Date ideas"]
                      ] as const
                    ).map(
                      ([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          className={
                            occasion === value
                              ? styles.selected
                              : ""
                          }
                          onClick={() =>
                            setOccasion(value)
                          }
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                </fieldset>

                <label
                  className={styles.selectLabel}
                >
                  <span>Neighbourhood</span>

                  <select
                    value={area}
                    onChange={(event) =>
                      setArea(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Anywhere in Winnipeg
                    </option>

                    {neighbourhoods.map(
                      (neighbourhood) => (
                        <option
                          value={neighbourhood}
                          key={neighbourhood}
                        >
                          {neighbourhood}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <button
                  type="button"
                  className={`${styles.newToggle} ${
                    nearby
                      ? styles.newToggleActive
                      : ""
                  }`}
                  aria-pressed={nearby}
                  onClick={() =>
                    setNearby(
                      (current) => !current
                    )
                  }
                >
                  <span aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
                      <circle cx="12" cy="10" r="2.2" />
                    </svg>
                  </span>

                  <p>
                    <strong>Near me</strong>
                    <small>
                      Ask for location only after
                      you apply this filter.
                    </small>
                  </p>

                  <b aria-hidden="true">
                    {nearby ? "✓" : ""}
                  </b>
                </button>

                <button
                  type="button"
                  className={`${styles.newToggle} ${
                    onlyNew
                      ? styles.newToggleActive
                      : ""
                  }`}
                  aria-pressed={onlyNew}
                  onClick={() =>
                    setOnlyNew(
                      (current) => !current
                    )
                  }
                >
                  <span aria-hidden="true">
                    ✦
                  </span>

                  <p>
                    <strong>New to me</strong>
                    <small>
                      Hide restaurants and event
                      occurrences you have already
                      marked as visited.
                    </small>
                  </p>

                  <b aria-hidden="true">
                    {onlyNew ? "✓" : ""}
                  </b>
                </button>
              </div>

              <footer
                className={styles.footer}
              >
                <button
                  type="button"
                  className={styles.clear}
                  onClick={clearFilters}
                >
                  Clear
                </button>

                <button
                  type="button"
                  className={styles.apply}
                  onClick={applyFilters}
                >
                  Show matches
                </button>
              </footer>
            </section>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M4 7h16M7 12h10M10 17h4" />
        </svg>

        Filters

        {activeCount > 0 ? (
          <b>{activeCount}</b>
        ) : null}
      </button>

      {sheet}
    </>
  );
}
