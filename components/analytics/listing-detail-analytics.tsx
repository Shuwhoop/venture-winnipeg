"use client";

import {
  useEffect
} from "react";

import {
  trackBetaEvent
} from "@/lib/beta/client";

import type {
  Listing
} from "@/lib/types";

export function ListingDetailAnalytics({
  listing
}: {
  listing: Listing;
}) {
  useEffect(() => {
    trackBetaEvent({
      eventName:
        "listing_detail_opened",
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
        source: "listing-detail-page"
      }
    });
  }, [listing]);

  return null;
}
