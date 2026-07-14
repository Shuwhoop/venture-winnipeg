import type { Listing } from "@/lib/types";

export const SAVED_LISTINGS_STORAGE_KEY =
  "venture:saved-listings:v1";

export const SAVED_LISTINGS_EVENT =
  "venture:saved-listings-changed";

export type SavedListingReference = {
  id: string;
  slug: string;
  type: Listing["type"];
  savedAt: string;
};

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
    typeof item.savedAt === "string"
  );
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

    const parsed = JSON.parse(storedValue);

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

function writeSavedListings(
  listings: SavedListingReference[]
) {
  window.localStorage.setItem(
    SAVED_LISTINGS_STORAGE_KEY,
    JSON.stringify(listings)
  );

  window.dispatchEvent(
    new CustomEvent(
      SAVED_LISTINGS_EVENT
    )
  );
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

export function toggleSavedListing(
  listing: Pick<
    Listing,
    "id" | "slug" | "type"
  >
): boolean {
  const savedListings =
    getSavedListingReferences();

  const alreadySaved =
    savedListings.some(
      (savedListing) =>
        savedListing.id === listing.id &&
        savedListing.type === listing.type
    );

  if (alreadySaved) {
    writeSavedListings(
      savedListings.filter(
        (savedListing) =>
          !(
            savedListing.id ===
              listing.id &&
            savedListing.type ===
              listing.type
          )
      )
    );

    return false;
  }

  const updatedListings = [
    {
      id: listing.id,
      slug: listing.slug,
      type: listing.type,
      savedAt: new Date().toISOString()
    },
    ...savedListings
  ].slice(0, 100);

  writeSavedListings(updatedListings);

  return true;
}