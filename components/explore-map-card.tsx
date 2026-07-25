"use client";

import Link from "next/link";

import {
  SaveButton
} from "@/components/save-button";

import {
  trackBetaEvent
} from "@/lib/beta/client";

import {
  getCatalogueIcon,
  getCatalogueKind,
  getCatalogueLabel
} from "@/lib/catalogue";

import {
  getListingProximity,
  type GeoPoint
} from "@/lib/explore-map-utils";

import type {
  Listing
} from "@/lib/types";

import styles from "@/app/explore/explore.module.css";

type ExploreMapCardProps = {
  listing: Listing;
  selected: boolean;
  userLocation: GeoPoint | null;
  onFocus: (listing: Listing) => void;
};

export function ExploreMapCard({
  listing,
  selected,
  userLocation,
  onFocus
}: ExploreMapCardProps) {
  const proximity =
    getListingProximity(
      listing,
      userLocation
    );

  const listingKey =
    `${listing.type}-${listing.id}`;

  const catalogueKind =
    listing.catalogueKind ??
    getCatalogueKind(listing);

  return (
    <article
      className={`${styles.mapResultCard} ${
        selected
          ? styles.mapResultCardSelected
          : ""
      }`}
      data-listing-key={listingKey}
      aria-label={listing.name}
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
        className={`${styles.mapResultCategoryIcon} ${styles[`mapResultCategory_${catalogueKind}`] ?? ""}`}
        aria-hidden="true"
      >
        {getCatalogueIcon(catalogueKind)}
      </div>

      <div className={styles.mapResultCopy}>
        <span className={styles.mapResultType}>
          {getCatalogueLabel(
            catalogueKind
          ).toUpperCase()}
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

        <div className={styles.mapResultProximity}>
          <span>
            {proximity?.distanceLabel ||
              listing.distance ||
              "Winnipeg"}
          </span>

          {proximity ? (
            <span>
              {proximity.travelLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.mapResultSaveAction}>
        <SaveButton listing={listing} />
      </div>

      <div className={styles.mapResultPrimaryActions}>
        <Link
          href={`/listings/${listing.slug}`}
          onClick={() => {
            trackBetaEvent({
              eventName: "listing_detail_opened",
              pagePath:
                window.location.pathname,
              properties: {
                listingId: listing.id,
                listingSlug: listing.slug,
                listingType: listing.type,
                listingName: listing.name,
                category: listing.category,
                neighbourhood:
                  listing.neighbourhood,
                source: "explore-map-card"
              }
            });
          }}
        >
          View details
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
