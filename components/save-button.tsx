"use client";

import {
  useEffect,
  useState
} from "react";

import type { Listing } from "@/lib/types";

import {
  trackBetaEvent
} from "@/lib/beta/client";

import {
  isListingSaved,
  SAVED_LISTINGS_EVENT,
  toggleSavedListing
} from "@/lib/saved-listings";

type SaveButtonProps = {
  listing: Listing;
  className?: string;
};

export function SaveButton({
  listing,
  className = ""
}: SaveButtonProps) {
  const [saved, setSaved] =
    useState(false);

  useEffect(() => {
    function refreshSavedState() {
      setSaved(
        isListingSaved(listing)
      );
    }

    refreshSavedState();

    window.addEventListener(
      SAVED_LISTINGS_EVENT,
      refreshSavedState
    );

    window.addEventListener(
      "storage",
      refreshSavedState
    );

    return () => {
      window.removeEventListener(
        SAVED_LISTINGS_EVENT,
        refreshSavedState
      );

      window.removeEventListener(
        "storage",
        refreshSavedState
      );
    };
  }, [listing]);

  function handleSave() {
    const newSavedState =
      toggleSavedListing(listing);

    setSaved(newSavedState);

    trackBetaEvent({
      eventName:
        newSavedState
          ? "listing_saved"
          : "listing_unsaved",
      pagePath:
        window.location.pathname,
      properties: {
        listingId: listing.id,
        listingSlug: listing.slug,
        listingType: listing.type,
        listingName: listing.name,
        category: listing.category,
        neighbourhood: listing.neighbourhood
      }
    });
  }

  return (
    <button
        className={`save-button ${className} ${
        saved ? "saved" : ""
        }`}
      type="button"
      aria-label={
        saved
          ? `Remove ${listing.name} from saved listings`
          : `Save ${listing.name}`
      }
      aria-pressed={saved}
      title={
        saved
          ? "Remove from saved"
          : "Save listing"
      }
      onClick={handleSave}
    >
      <span aria-hidden="true">
        {saved ? "♥" : "♡"}
      </span>
    </button>
  );
}