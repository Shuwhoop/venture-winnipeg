"use client";

import Link from "next/link";

import {
  ListingShareButton
} from "@/components/listing-share-button";
import {
  SaveButton
} from "@/components/save-button";
import {
  trackBetaEvent
} from "@/lib/beta/client";
import type {
  Listing
} from "@/lib/types";

import styles from "./listing-detail-action-dock.module.css";

type ListingDetailActionDockProps = {
  listing: Listing;
  directionsUrl: string | null;
};

function DirectionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 12 16-8-7 16-2.2-6.8L4 12Z" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

export function ListingDetailActionDock({
  listing,
  directionsUrl
}: ListingDetailActionDockProps) {
  const listingKey = `${listing.type}-${listing.id}`;

  return (
    <aside
      className={styles.dock}
      aria-label="Save, share or plan with this listing"
    >
      <div className={styles.utilityRow}>
        <div className={styles.utilityAction}>
          <SaveButton listing={listing} />
          <span>Save</span>
        </div>

        <div className={styles.utilityAction}>
          <ListingShareButton
            listing={listing}
            source="listing-detail"
          />
          <span>Share</span>
        </div>

        {directionsUrl ? (
          <a
            className={styles.directionsAction}
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              trackBetaEvent({
                eventName: "listing_directions_opened",
                pagePath: window.location.pathname,
                properties: {
                  listingId: listing.id,
                  listingSlug: listing.slug,
                  listingType: listing.type,
                  listingName: listing.name,
                  source: "listing-detail-dock"
                }
              });
            }}
          >
            <DirectionIcon />
            <span>Directions</span>
          </a>
        ) : null}
      </div>

      <Link
        className={styles.buildAction}
        href={`/build-outing?anchor=${encodeURIComponent(listingKey)}`}
        onClick={() => {
          trackBetaEvent({
            eventName: "outing_builder_opened",
            pagePath: window.location.pathname,
            properties: {
              listingId: listing.id,
              listingSlug: listing.slug,
              listingType: listing.type,
              listingName: listing.name,
              source: "listing-detail-dock"
            }
          });
        }}
      >
        <span>
          <small>MAKE A PLAN</small>
          <strong>Build around this</strong>
        </span>
        <b aria-hidden="true"><PlanIcon /></b>
      </Link>
    </aside>
  );
}
