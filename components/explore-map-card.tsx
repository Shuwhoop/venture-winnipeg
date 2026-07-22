"use client";

import Link from "next/link";

import {
  SaveButton
} from "@/components/save-button";

import {
  trackBetaEvent
} from "@/lib/beta/client";

import type {
  Listing
} from "@/lib/types";

import styles from "@/app/explore/explore.module.css";

type ExploreMapCardProps = {
  listing: Listing;
  selected: boolean;
  onFocus: (listing: Listing) => void;
};

function getIcon(
  listing: Listing
): string {
  if (listing.type === "event") {
    return "🎟";
  }

  const text = `${listing.category} ${listing.name}`
    .toLowerCase();

  if (
    text.includes("bar") ||
    text.includes("pub") ||
    text.includes("cocktail") ||
    text.includes("brew")
  ) {
    return "🍸";
  }

  if (
    text.includes("cafe") ||
    text.includes("coffee") ||
    text.includes("bakery")
  ) {
    return "☕";
  }

  return "🍴";
}

export function ExploreMapCard({
  listing,
  selected,
  onFocus
}: ExploreMapCardProps) {
  return (
    <article
      className={`${styles.mapResultCard} ${
        selected
          ? styles.mapResultCardSelected
          : ""
      }`}
      data-listing-key={`${listing.type}-${listing.id}`}
    >
      <button
        type="button"
        className={styles.mapResultFocus}
        aria-label={`Show ${listing.name} on the map`}
        aria-pressed={selected}
        onClick={() =>
          onFocus(listing)
        }
      />

      <div
        className={styles.mapResultIcon}
        aria-hidden="true"
      >
        {getIcon(listing)}
      </div>

      <div className={styles.mapResultCopy}>
        <span className={styles.mapResultType}>
          {listing.type === "event"
            ? "EVENT"
            : listing.category.toUpperCase()}
        </span>

        <h3>{listing.name}</h3>

        <p>
          {listing.neighbourhood ||
            listing.address ||
            "Winnipeg"}
        </p>

        <div className={styles.mapResultMeta}>
          <span>{listing.timeOrHours}</span>
          <span>{listing.price}</span>
        </div>
      </div>

      <div className={styles.mapResultActions}>
        <SaveButton listing={listing} />

        <Link
          href={`/listings/${listing.slug}`}
          onClick={() => {
            trackBetaEvent({
              eventName: "listing_detail_opened",
              pagePath: window.location.pathname,
              properties: {
                listingId: listing.id,
                listingSlug: listing.slug,
                listingType: listing.type,
                listingName: listing.name,
                category: listing.category,
                neighbourhood: listing.neighbourhood,
                source: "explore-map-card"
              }
            });
          }}
        >
          Details
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
