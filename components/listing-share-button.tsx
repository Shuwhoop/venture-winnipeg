"use client";

import {
  useEffect,
  useState
} from "react";

import {
  trackBetaEvent
} from "@/lib/beta/client";

import type {
  Listing
} from "@/lib/types";

import styles from "./listing-share-button.module.css";

type ListingShareButtonProps = {
  listing: Listing;
  className?: string;
  source?: string;
};

export function ListingShareButton({
  listing,
  className = "",
  source = "listing-share-button"
}: ListingShareButtonProps) {
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => setMessage(""),
        2200
      );

    return () =>
      window.clearTimeout(timeout);
  }, [message]);

  async function handleShare() {
    const url =
      new URL(
        `/listings/${listing.slug}`,
        window.location.origin
      ).toString();

    const shareData = {
      title: listing.name,
      text: `${listing.name} on Venture`,
      url
    };

    try {
      if (
        typeof navigator.share ===
        "function"
      ) {
        await navigator.share(
          shareData
        );

        setMessage("Share sheet opened.");
      } else {
        await navigator.clipboard.writeText(
          url
        );

        setMessage("Link copied.");
      }

      trackBetaEvent({
        eventName: "listing_shared",
        pagePath:
          window.location.pathname,
        properties: {
          listingId: listing.id,
          listingSlug: listing.slug,
          listingType: listing.type,
          listingName: listing.name,
          source
        }
      });
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      setMessage(
        "Could not share this listing."
      );
    }
  }

  return (
    <span
      className={`${styles.wrap} ${className}`}
    >
      <button
        type="button"
        className={styles.button}
        aria-label={`Share ${listing.name}`}
        title="Share listing"
        onClick={() => {
          void handleShare();
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.6 6.8-4.1M8.6 13.4l6.8 4.1" />
        </svg>
      </button>

      {message ? (
        <span
          className={styles.message}
          role="status"
        >
          {message}
        </span>
      ) : null}
    </span>
  );
}
