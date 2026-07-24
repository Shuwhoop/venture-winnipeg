"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  trackBetaEvent
} from "@/lib/beta/client";

import type {
  Listing
} from "@/lib/types";

import {
  addVisit,
  getVisitHistory,
  isListingVisited,
  removeLatestVisitForListing,
  VISIT_HISTORY_EVENT
} from "@/lib/visit-history";

import styles from "./visit-button.module.css";

type VisitButtonProps = {
  listing: Listing;
  fallbackEventDate?: string | null;
  className?: string;
  compact?: boolean;
};

export function VisitButton({
  listing,
  fallbackEventDate = null,
  className = "",
  compact = false
}: VisitButtonProps) {
  const [visited, setVisited] =
    useState(false);
  const [visitCount, setVisitCount] =
    useState(0);
  const [message, setMessage] =
    useState("");

  const listingKey = useMemo(
    () => `${listing.type}-${listing.id}`,
    [listing.id, listing.type]
  );

  useEffect(() => {
    function refresh() {
      setVisited(
        isListingVisited(
          listing,
          fallbackEventDate
        )
      );

      setVisitCount(
        getVisitHistory().filter(
          (visit) =>
            visit.listingKey === listingKey
        ).length
      );
    }

    refresh();

    window.addEventListener(
      VISIT_HISTORY_EVENT,
      refresh
    );
    window.addEventListener(
      "storage",
      refresh
    );

    return () => {
      window.removeEventListener(
        VISIT_HISTORY_EVENT,
        refresh
      );
      window.removeEventListener(
        "storage",
        refresh
      );
    };
  }, [
    fallbackEventDate,
    listing,
    listingKey
  ]);

  function handleToggle() {
    if (visited) {
      const removed =
        removeLatestVisitForListing(
          listing,
          fallbackEventDate
        );

      if (!removed) {
        return;
      }

      setMessage(
        "Latest visit removed."
      );

      trackBetaEvent({
        eventName: "visit_removed",
        pagePath:
          window.location.pathname,
        properties: {
          listingId: listing.id,
          listingSlug: listing.slug,
          listingType: listing.type,
          listingName: listing.name
        }
      });

      return;
    }

    addVisit(listing, {
      source: "manual",
      fallbackEventDate
    });

    setMessage(
      "Added to your Venture history."
    );

    trackBetaEvent({
      eventName: "visit_logged",
      pagePath:
        window.location.pathname,
      properties: {
        listingId: listing.id,
        listingSlug: listing.slug,
        listingType: listing.type,
        listingName: listing.name,
        source: "manual"
      }
    });
  }

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(
      () => setMessage(""),
      2400
    );

    return () =>
      window.clearTimeout(timeout);
  }, [message]);

  return (
    <div
      className={`${styles.wrap} ${
        compact ? styles.compact : ""
      } ${className}`}
    >
      <button
        type="button"
        className={`${styles.button} ${
          visited ? styles.visited : ""
        }`}
        aria-pressed={visited}
        onClick={handleToggle}
      >
        <span
          className={styles.icon}
          aria-hidden="true"
        >
          {visited ? "✓" : "+"}
        </span>

        <span className={styles.copy}>
          <strong>
            {visited
              ? "Visited"
              : "I went here"}
          </strong>

          {!compact ? (
            <small>
              {visited
                ? visitCount > 1
                  ? `${visitCount} visits logged`
                  : "Tap to undo the latest visit"
                : "Teach Venture what is new to you"}
            </small>
          ) : null}
        </span>
      </button>

      {message ? (
        <span
          className={styles.message}
          role="status"
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
