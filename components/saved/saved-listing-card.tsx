"use client";

import Link from "next/link";

import type { CSSProperties } from "react";

import type { Listing } from "@/lib/types";

import styles from "@/app/saved/saved-v1.module.css";

type SavedListingCardProps = {
  listing: Listing;
  onRemove: (listing: Listing) => void;
};

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M7.8 16.8c2.3-1.5 1.7-4.5 4.4-5.4 1.3-.4 2.6-.1 4-1.8" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

export function SavedListingCard({
  listing,
  onRemove
}: SavedListingCardProps) {
  const imageStyle: CSSProperties | undefined = listing.imageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(20, 16, 18, 0.03), rgba(20, 16, 18, 0.42)), url("${listing.imageUrl.replaceAll('"', "%22")}")`
      }
    : undefined;

  const anchorKey = `${listing.type}:${listing.id}`;

  return (
    <article className={styles.listingCard}>
      <div
        className={`${styles.listingImage} ${listing.imageClass}`}
        style={imageStyle}
      >
        <span className={`${styles.status} ${styles[listing.statusTone]}`}>
          {listing.statusLabel}
        </span>

        <button
          className={styles.removeHeart}
          type="button"
          aria-label={`Remove ${listing.name} from Saved`}
          title="Remove from Saved"
          onClick={() => onRemove(listing)}
        >
          <HeartIcon />
        </button>
      </div>

      <div className={styles.listingContent}>
        <div className={styles.listingTitleRow}>
          <div>
            <span>{listing.type === "event" ? "EVENT" : listing.category.toUpperCase()}</span>
            <h3>{listing.name}</h3>
          </div>
          <strong>{listing.price}</strong>
        </div>

        <p>{listing.subtitle}</p>

        <div className={styles.listingFacts}>
          <span>{listing.timeOrHours}</span>
          <span>{listing.neighbourhood}</span>
          {listing.distance ? <span>{listing.distance}</span> : null}
        </div>

        <div className={styles.listingActions}>
          <Link
            className={styles.secondaryAction}
            href={`/build-outing?anchor=${encodeURIComponent(anchorKey)}`}
          >
            <RouteIcon />
            Build around it
          </Link>

          <Link
            className={styles.primaryAction}
            href={`/listings/${listing.slug}`}
          >
            View
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </article>
  );
}
