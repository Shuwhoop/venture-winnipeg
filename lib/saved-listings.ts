"use client";

import {
  clearSyncDeletion,
  queueSyncDeletion
} from "@/lib/account-sync-storage";

import type {
  Listing
} from "@/lib/types";

export const SAVED_LISTINGS_STORAGE_KEY =
  "venture:saved-listings:v1";

export const SAVED_LISTINGS_EVENT =
  "venture:saved-listings-changed";

const LEGACY_SAVED_LISTINGS_EVENTS = [
  "venture:saved-listings-updated",
  "venture:saves-updated"
];

export type SavedListingReference = {
  id: string;
  slug: string;
  type: Listing["type"];
  savedAt: string;
  updatedAt?: string;
  snapshot?: Listing;
};

export function savedListingKey(
  listing: Pick<
    SavedListingReference,
    "id" | "type"
  >
) {
  return `${listing.type}:${listing.id}`;
}

export function isListingSnapshot(
  value: unknown
): value is Listing {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const listing = value as Record<
    string,
    unknown
  >;

  return (
    typeof listing.id === "string" &&
    typeof listing.slug === "string" &&
    typeof listing.name === "string" &&
    typeof listing.category === "string" &&
    typeof listing.subtitle === "string" &&
    typeof listing.description === "string" &&
    (
      listing.type === "event" ||
      listing.type === "restaurant"
    )
  );
}

function isSavedListingReference(
  value: unknown
): value is SavedListingReference {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const item = value as Record<
    string,
    unknown
  >;

  return (
    typeof item.id === "string" &&
    typeof item.slug === "string" &&
    (
      item.type === "event" ||
      item.type === "restaurant"
    ) &&
    typeof item.savedAt === "string" &&
    (
      item.updatedAt === undefined ||
      typeof item.updatedAt === "string"
    ) &&
    (
      item.snapshot === undefined ||
      isListingSnapshot(item.snapshot)
    )
  );
}

function notifySavedListingsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      SAVED_LISTINGS_EVENT
    )
  );

  for (const eventName of
    LEGACY_SAVED_LISTINGS_EVENTS) {
    window.dispatchEvent(
      new CustomEvent(eventName)
    );
  }
}

export function getSavedListingReferences():
  SavedListingReference[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        SAVED_LISTINGS_STORAGE_KEY
      );

    if (!storedValue) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(storedValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      isSavedListingReference
    );
  } catch {
    return [];
  }
}

export function writeSavedListingReferences(
  listings: SavedListingReference[]
) {
  if (typeof window === "undefined") {
    return;
  }

  const seen = new Set<string>();

  const normalized = listings
    .filter(isSavedListingReference)
    .filter((listing) => {
      const key = savedListingKey(listing);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((first, second) =>
      (second.updatedAt ?? second.savedAt)
        .localeCompare(
          first.updatedAt ?? first.savedAt
        )
    )
    .slice(0, 200);

  const nextValue =
    JSON.stringify(normalized);

  if (
    window.localStorage.getItem(
      SAVED_LISTINGS_STORAGE_KEY
    ) === nextValue
  ) {
    return;
  }

  window.localStorage.setItem(
    SAVED_LISTINGS_STORAGE_KEY,
    nextValue
  );

  notifySavedListingsChanged();
}

export function getSavedListingSnapshots():
  Listing[] {
  return getSavedListingReferences()
    .map((reference) =>
      reference.snapshot
    )
    .filter(isListingSnapshot);
}

export function isListingSaved(
  listing: Pick<
    Listing,
    "id" | "slug" | "type"
  >
): boolean {
  return getSavedListingReferences().some(
    (savedListing) =>
      savedListing.id === listing.id &&
      savedListing.type === listing.type
  );
}

export function removeSavedListing(
  listing: Pick<
    Listing,
    "id" | "type"
  >
) {
  const key = savedListingKey(listing);

  writeSavedListingReferences(
    getSavedListingReferences().filter(
      (savedListing) =>
        savedListingKey(savedListing) !== key
    )
  );

  queueSyncDeletion(
    "listing",
    key
  );
}

export function toggleSavedListing(
  listing: Pick<
    Listing,
    "id" | "slug" | "type"
  > & Partial<Listing>
): boolean {
  const savedListings =
    getSavedListingReferences();

  const key = savedListingKey(listing);

  const alreadySaved =
    savedListings.some(
      (savedListing) =>
        savedListingKey(savedListing) === key
    );

  if (alreadySaved) {
    writeSavedListingReferences(
      savedListings.filter(
        (savedListing) =>
          savedListingKey(savedListing) !== key
      )
    );

    queueSyncDeletion(
      "listing",
      key
    );

    return false;
  }

  const timestamp =
    new Date().toISOString();

  clearSyncDeletion(
    "listing",
    key
  );

  const possibleSnapshot: unknown =
    listing;

  const updatedListings = [
    {
      id: listing.id,
      slug: listing.slug,
      type: listing.type,
      savedAt: timestamp,
      updatedAt: timestamp,
      snapshot:
        isListingSnapshot(
          possibleSnapshot
        )
          ? possibleSnapshot
          : undefined
    },
    ...savedListings
  ];

  writeSavedListingReferences(
    updatedListings
  );

  return true;
}

export function enrichSavedListingSnapshots(
  listings: Listing[]
) {
  if (listings.length === 0) {
    return;
  }

  const snapshots = new Map(
    listings.map((listing) => [
      savedListingKey(listing),
      listing
    ])
  );

  const now = new Date().toISOString();

  writeSavedListingReferences(
    getSavedListingReferences().map(
      (reference) => {
        const snapshot = snapshots.get(
          savedListingKey(reference)
        );

        if (!snapshot) {
          return reference;
        }

        return {
          ...reference,
          slug: snapshot.slug,
          snapshot,
          updatedAt:
            reference.updatedAt ?? now
        };
      }
    )
  );
}
