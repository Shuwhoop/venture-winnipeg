"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import styles from "./page.module.css";


type QueueKind =
  | "all"
  | "restaurant"
  | "event";


type QueueSource =
  | "all"
  | "public"
  | "import";


type QueueStatus =
  | "all"
  | "pending"
  | "in_review"
  | "needs_changes"
  | "draft";


type ModerationCard =
  HTMLDetailsElement & {
    dataset: DOMStringMap & {
      kind?: string;
      search?: string;
      source?: string;
      status?: string;
    };
  };


export default function ModerationQueueTools({
  totalCount
}: {
  totalCount: number;
}) {
  const [query, setQuery] =
    useState("");

  const [kind, setKind] =
    useState<QueueKind>("all");

  const [source, setSource] =
    useState<QueueSource>("all");

  const [status, setStatus] =
    useState<QueueStatus>("all");

  const [visibleCount, setVisibleCount] =
    useState(totalCount);

  const normalizedQuery =
    useMemo(
      () =>
        query
          .trim()
          .toLowerCase(),
      [query]
    );

  useEffect(() => {
    const cards =
      Array.from(
        document.querySelectorAll<ModerationCard>(
          '[data-moderation-card="true"]'
        )
      );

    let nextVisibleCount = 0;

    for (const card of cards) {
      const matchesQuery =
        !normalizedQuery ||
        (
          card.dataset.search ?? ""
        ).includes(
          normalizedQuery
        );

      const matchesKind =
        kind === "all" ||
        card.dataset.kind === kind;

      const matchesSource =
        source === "all" ||
        card.dataset.source === source;

      const matchesStatus =
        status === "all" ||
        card.dataset.status === status;

      const visible =
        matchesQuery &&
        matchesKind &&
        matchesSource &&
        matchesStatus;

      card.hidden = !visible;

      if (visible) {
        nextVisibleCount += 1;
      }
    }

    setVisibleCount(
      nextVisibleCount
    );
  }, [
    kind,
    normalizedQuery,
    source,
    status
  ]);

  function clearFilters() {
    setQuery("");
    setKind("all");
    setSource("all");
    setStatus("all");
  }

  function setOpenState(
    open: boolean
  ) {
    const cards =
      Array.from(
        document.querySelectorAll<ModerationCard>(
          '[data-moderation-card="true"]'
        )
      );

    for (const card of cards) {
      if (
        open &&
        card.hidden
      ) {
        continue;
      }

      card.open = open;
    }
  }

  return (
    <section
      aria-label="Search moderation queue"
      className={
        styles.queueTools
      }
    >
      <div
        className={
          styles.queueToolsHeading
        }
      >
        <div>
          <span>
            FIND A LISTING
          </span>

          <strong>
            Search before you expand
          </strong>

          <p>
            Find a restaurant, event,
            address, neighbourhood,
            category, or submitter.
          </p>
        </div>

        <div
          aria-live="polite"
          className={
            styles.resultCount
          }
        >
          <strong>
            {visibleCount}
          </strong>

          <small>
            of {totalCount} visible
          </small>
        </div>
      </div>

      <div
        className={
          styles.queueFilters
        }
      >
        <label
          className={
            styles.searchField
          }
        >
          <span>
            Search
          </span>

          <div>
            <span
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              onChange={
                (event) =>
                  setQuery(
                    event.target.value
                  )
              }
              placeholder="Try 1928, Garry St., Downtown, comedy..."
              type="search"
              value={query}
            />
          </div>
        </label>

        <label>
          <span>
            Listing type
          </span>

          <select
            onChange={
              (event) =>
                setKind(
                  event.target.value as QueueKind
                )
            }
            value={kind}
          >
            <option value="all">
              Restaurants and events
            </option>

            <option value="restaurant">
              Restaurants only
            </option>

            <option value="event">
              Events only
            </option>
          </select>
        </label>

        <label>
          <span>
            Source
          </span>

          <select
            onChange={
              (event) =>
                setSource(
                  event.target.value as QueueSource
                )
            }
            value={source}
          >
            <option value="all">
              Every source
            </option>

            <option value="public">
              Public submissions
            </option>

            <option value="import">
              Imported inventory
            </option>
          </select>
        </label>

        <label>
          <span>
            Status
          </span>

          <select
            onChange={
              (event) =>
                setStatus(
                  event.target.value as QueueStatus
                )
            }
            value={status}
          >
            <option value="all">
              Every status
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="in_review">
              In review
            </option>

            <option value="needs_changes">
              Needs changes
            </option>

            <option value="draft">
              Draft imports
            </option>
          </select>
        </label>
      </div>

      <div
        className={
          styles.queueToolActions
        }
      >
        <button
          onClick={clearFilters}
          type="button"
        >
          Clear filters
        </button>

        <button
          onClick={() =>
            setOpenState(true)
          }
          type="button"
        >
          Expand visible
        </button>

        <button
          onClick={() =>
            setOpenState(false)
          }
          type="button"
        >
          Collapse all
        </button>
      </div>

      {visibleCount === 0 ? (
        <p
          className={
            styles.noMatches
          }
        >
          Nothing matches those filters.
          Try part of the name, address,
          neighbourhood, or category.
        </p>
      ) : null}
    </section>
  );
}
