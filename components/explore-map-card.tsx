"use client";

import Link from "next/link";

import {
  ListingShareButton
} from "@/components/listing-share-button";

import {
  SaveButton
} from "@/components/save-button";

import {
  VisitButton
} from "@/components/visit-button";

import {
  trackBetaEvent
} from "@/lib/beta/client";

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
  index: number;
  selected: boolean;
  userLocation: GeoPoint | null;
  onFocus: (listing: Listing) => void;
};

export function ExploreMapCard({
  listing,
  index,
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

  return (
    <article
      className={`${styles.mapResultCard} ${
        selected
          ? styles.mapResultCardSelected
          : ""
      }`}
      data-listing-key={listingKey}
      aria-label={`${index + 1}. ${listing.name}`}
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
        className={`${styles.mapResultNumber} ${
          listing.type === "event"
            ? styles.mapResultNumberEvent
            : styles.mapResultNumberPlace
        }`}
        aria-hidden="true"
      >
        {index + 1}
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

      <div className={styles.mapResultUtilityActions}>
        <SaveButton listing={listing} />

        <ListingShareButton
          listing={listing}
        />

        <VisitButton
          listing={listing}
          fallbackEventDate={
            listing.startAt ?? null
          }
          compact
        />
      </div>

      <div className={styles.mapResultPrimaryActions}>
        <Link
          href={`/listings/${listing.slug}`}
          onClick={() => {
            trackBetaEvent({
              eventName: "listing_card_selected",
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
          Details
          <span aria-hidden="true">→</span>
        </Link>

        <Link
          className={styles.mapResultBuildAction}
          href={`/build-outing?anchor=${encodeURIComponent(
            listingKey
          )}`}
          onClick={() => {
            trackBetaEvent({
              eventName:
                "outing_builder_opened",
              pagePath:
                window.location.pathname,
              properties: {
                listingId: listing.id,
                listingSlug: listing.slug,
                listingType: listing.type,
                listingName: listing.name,
                source:
                  "explore-map-card"
              }
            });
          }}
        >
          Build around this
          <span aria-hidden="true">＋</span>
        </Link>
      </div>
    </article>
  );
}
