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

  const [announcement, setAnnouncement] =
    useState("");

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
    setAnnouncement(
      newSavedState
        ? `${listing.name} saved.`
        : `${listing.name} removed from saved.`
    );

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
    <>
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
        <svg
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
        </svg>
      </button>

      <span
        className="sr-only"
        role="status"
        aria-live="polite"
      >
        {announcement}
      </span>
    </>
  );
}