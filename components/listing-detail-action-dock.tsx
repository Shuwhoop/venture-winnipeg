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
};

export function ListingDetailActionDock({
  listing
}: ListingDetailActionDockProps) {
  const listingKey =
    `${listing.type}-${listing.id}`;

  return (
    <section
      className={styles.panel}
      aria-labelledby="listing-plan-heading"
    >
      <div className={styles.heading}>
        <span>MAKE IT A PLAN</span>

        <h2 id="listing-plan-heading">
          Build around this
        </h2>

        <p>
          Keep this as the anchor and let Venture
          add nearby food, events or activities
          before it, after it, or on both sides.
        </p>
      </div>

      <Link
        className={styles.buildAction}
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
                "listing-detail-page"
            }
          });
        }}
      >
        <span className={styles.buildIcon}>
          <b aria-hidden="true">＋</b>
        </span>

        <span className={styles.buildCopy}>
          <small>ANCHOR THIS STOP</small>
          <strong>Build an outing</strong>
          <em>
            Add stops before, after or both
          </em>
        </span>

        <span
          className={styles.buildArrow}
          aria-hidden="true"
        >
          →
        </span>
      </Link>

      <div className={styles.utilityRow}>
        <div className={styles.utilityAction}>
          <SaveButton listing={listing} />

          <span>
            <strong>Save</strong>
            <small>Keep it for later</small>
          </span>
        </div>

        <div className={styles.utilityAction}>
          <ListingShareButton
            listing={listing}
            source="listing-detail-page"
          />

          <span>
            <strong>Share</strong>
            <small>Send this discovery</small>
          </span>
        </div>
      </div>
    </section>
  );
}
