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

type ListingCardProps = {
  listing: Listing;
  selected?: boolean;
  onSelect?: (listing: Listing) => void;
};

const verificationCopy: Record<
  Listing["verification"],
  string
> = {
  official_source: "Official source",
  verified_venture: "Verified by Venture",
  verified_business: "Verified business",
  community_reported: "Community reported",
  unverified: "Unverified"
};

export function ListingCard({
  listing,
  selected = false,
  onSelect
}: ListingCardProps) {
  const warning =
    listing.verification === "community_reported" ||
    listing.verification === "unverified";

  return (
    <article
      className={`listing-card ${
        selected ? "is-selected" : ""
      }`}
    >
      {onSelect ? (
        <button
          className="listing-card-link listing-card-map-target"
          type="button"
          aria-label={`Show ${listing.name} on the map`}
          aria-pressed={selected}
          onClick={() => {
            trackBetaEvent({
              eventName: "listing_map_selected",
              pagePath: window.location.pathname,
              properties: {
                listingId: listing.id,
                listingSlug: listing.slug,
                listingType: listing.type,
                listingName: listing.name,
                category: listing.category,
                neighbourhood: listing.neighbourhood
              }
            });

            onSelect(listing);
          }}
        />
      ) : (
        <Link
          className="listing-card-link"
          href={`/listings/${listing.slug}`}
          aria-label={`View ${listing.name}`}
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
                source: "listing-card"
              }
            });
          }}
        />
      )}

      <div
        className={`listing-image ${listing.imageClass}`}
        style={
          listing.imageUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(20, 16, 18, 0.06), rgba(20, 16, 18, 0.34)), url("${listing.imageUrl.replaceAll('"', '%22')}")`
              }
            : undefined
        }
      >
        <span
          className={`status-badge ${listing.statusTone}`}
        >
          {listing.statusLabel}
        </span>

        <SaveButton listing={listing} />
      </div>

      <div className="listing-body">
        <h3>{listing.name}</h3>

        <p>{listing.subtitle}</p>

        <div className="listing-meta">
          <span>{listing.timeOrHours}</span>
          <span>{listing.distance}</span>
        </div>

        <div className="listing-footer">
          <strong>
            {listing.rating
              ? `${listing.rating} ★ Google Maps`
              : listing.price}
          </strong>

          <span
            className={
              warning
                ? "trust warning"
                : "trust"
            }
          >
            {warning ? "!" : "✓"}{" "}
            {verificationCopy[listing.verification]}
          </span>
        </div>

        {onSelect ? (
          <div className="listing-card-actions">
            <span>
              {selected
                ? "Shown on map"
                : "Show on map"}
            </span>

            <Link
              className="listing-card-view-link"
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
                    source: "map-card"
                  }
                });
              }}
            >
              View details
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}