"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  ListingCard
} from "@/components/listing-card";

import {
  getSavedListingReferences,
  SAVED_LISTINGS_EVENT
} from "@/lib/saved-listings";

import type {
  Listing
} from "@/lib/types";

type LoadState =
  | "loading"
  | "ready"
  | "error";

export default function SavedPage() {
  const [
    listings,
    setListings
  ] = useState<Listing[]>([]);

  const [
    loadState,
    setLoadState
  ] = useState<LoadState>(
    "loading"
  );

  const loadSavedListings =
    useCallback(async () => {
      const savedReferences =
        getSavedListingReferences();

      if (
        savedReferences.length === 0
      ) {
        setListings([]);
        setLoadState("ready");
        return;
      }

      setLoadState("loading");

      try {
        const response = await fetch(
          "/api/saved-listings",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              items:
                savedReferences.map(
                  (reference) => ({
                    slug:
                      reference.slug,
                    type:
                      reference.type
                  })
                )
            })
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Saved listings could not be loaded."
          );
        }

        setListings(
          Array.isArray(
            result.listings
          )
            ? result.listings
            : []
        );

        setLoadState("ready");
      } catch (error) {
        console.error(
          "Unable to display saved listings:",
          error
        );

        setLoadState("error");
      }
    }, []);

  useEffect(() => {
    loadSavedListings();

    function handleSavedChange() {
      loadSavedListings();
    }

    window.addEventListener(
      SAVED_LISTINGS_EVENT,
      handleSavedChange
    );

    window.addEventListener(
      "storage",
      handleSavedChange
    );

    return () => {
      window.removeEventListener(
        SAVED_LISTINGS_EVENT,
        handleSavedChange
      );

      window.removeEventListener(
        "storage",
        handleSavedChange
      );
    };
  }, [loadSavedListings]);

  if (loadState === "loading") {
    return (
      <section className="empty-state">
        <div>♡</div>

        <h1>Loading saved listings</h1>

        <p>
          Checking the latest listing
          information.
        </p>
      </section>
    );
  }

  if (loadState === "error") {
    return (
      <section className="empty-state">
        <div>!</div>

        <h1>
          Saved listings could not load
        </h1>

        <p>
          Your bookmarks are still stored
          in this browser. Try refreshing
          the page.
        </p>

        <button
          type="button"
          onClick={loadSavedListings}
        >
          Try again
        </button>
      </section>
    );
  }

  if (listings.length === 0) {
    return (
      <section className="empty-state">
        <div>♡</div>

        <h1>No saved listings yet</h1>

        <p>
          Tap the heart on an event or food
          listing and it will appear here.
        </p>

        <Link href="/explore">
          Explore Winnipeg
        </Link>
      </section>
    );
  }

  return (
    <>
      <div className="page-heading">
        <span>YOUR PICKS</span>
        <h1>Saved</h1>

        <p className="page-description">
          Stored in this browser and
          refreshed using Venture’s latest
          listing information.
        </p>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span>SAVED LISTINGS</span>

            <h2>
              {listings.length}{" "}
              {listings.length === 1
                ? "listing"
                : "listings"}
            </h2>
          </div>
        </div>

        <div className="vertical-list">
          {listings.map((listing) => (
            <ListingCard
              key={`${listing.type}-${listing.id}`}
              listing={listing}
            />
          ))}
        </div>
      </section>
    </>
  );
}