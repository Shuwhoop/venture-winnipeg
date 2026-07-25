"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  PROFILE_PREFERENCES_KEY,
  loadPreferences,
  type VenturePreferences
} from "@/lib/profile-preferences";

import {
  ListingCard
} from "@/components/listing-card";

import type {
  Listing
} from "@/lib/types";

type PersonalizedExploreResultsProps = {
  listings: Listing[];
  eyebrow: string;
  selectedListingKey?: string | null;
  onSelectListing?: (listing: Listing) => void;
  showHeading?: boolean;
  className?: string;
};
const interestKeywords: Record<
  string,
  string[]
> = {
  Food: [
    "food",
    "restaurant",
    "market",
    "dining",
    "cafe",
    "coffee",
    "cuisine"
  ],

  "Live music": [
    "live music",
    "concert",
    "music",
    "band",
    "festival"
  ],

  Comedy: [
    "comedy",
    "comedian",
    "stand-up",
    "standup"
  ],

  Sports: [
    "sports",
    "game",
    "hockey",
    "football",
    "soccer",
    "basketball"
  ],

  Markets: [
    "market",
    "vendors",
    "shopping",
    "local goods"
  ],

  Arts: [
    "art",
    "arts",
    "gallery",
    "museum",
    "theatre",
    "theater",
    "anime",
    "cosplay"
  ],

  Gaming: [
    "gaming",
    "game",
    "anime",
    "cosplay",
    "tabletop",
    "esports"
  ],

  Nightlife: [
    "nightlife",
    "nightclub",
    "club",
    "bar",
    "cocktail",
    "late night"
  ],

  "Outdoor activities": [
    "outdoor",
    "park",
    "trail",
    "walking",
    "cycling",
    "festival"
  ]
};

const outingStyleKeywords: Record<
  string,
  string[]
> = {
  "Date nights": [
    "date",
    "dinner",
    "romantic",
    "restaurant",
    "live music",
    "theatre"
  ],

  "Student-friendly": [
    "student",
    "free",
    "affordable",
    "market",
    "festival",
    "gaming"
  ],

  "Solo outings": [
    "solo",
    "museum",
    "gallery",
    "market",
    "cafe",
    "workshop"
  ],

  Friends: [
    "friends",
    "group",
    "festival",
    "music",
    "comedy",
    "gaming",
    "sports"
  ],

  "Family plans": [
    "family",
    "kids",
    "children",
    "all ages",
    "market"
  ],

  "Last-minute plans": [
    "tonight",
    "today",
    "open now",
    "drop-in"
  ]
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getListingText(
  listing: Listing
): string {
  return [
    listing.name,
    listing.category,
    listing.subtitle,
    listing.neighbourhood,
    listing.description,
    listing.venueName ?? "",
    listing.address ?? "",
    listing.price,
    listing.statusLabel,
    listing.timeOrHours
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function includesAny(
  text: string,
  keywords: string[]
): boolean {
  return keywords.some((keyword) =>
    text.includes(normalize(keyword))
  );
}

function getHighestPrice(
  price: string
): number | null {
  if (
    price.toLowerCase().includes("free")
  ) {
    return 0;
  }

  const matches = price.match(
    /\d+(?:\.\d+)?/g
  );

  if (!matches) {
    return null;
  }

  const values = matches
    .map(Number)
    .filter(Number.isFinite);

  return values.length > 0
    ? Math.max(...values)
    : null;
}

function calculatePreferenceScore(
  listing: Listing,
  preferences: VenturePreferences
): number {
  const listingText =
    getListingText(listing);

  let score = 0;

  for (
    const interest of
    preferences.interests
  ) {
    const keywords =
      interestKeywords[interest] ?? [
        interest
      ];

    if (
      includesAny(
        listingText,
        keywords
      )
    ) {
      score += 5;
    }
  }

  const listingNeighbourhood =
    normalize(
      listing.neighbourhood ?? ""
    );

  for (
    const neighbourhood of
    preferences.neighbourhoods
  ) {
    const normalizedNeighbourhood =
      normalize(neighbourhood);

    if (
      listingNeighbourhood.includes(
        normalizedNeighbourhood
      ) ||
      listingText.includes(
        normalizedNeighbourhood
      )
    ) {
      score += 6;
    }
  }

  for (
    const outingStyle of
    preferences.outingStyles
  ) {
    const keywords =
      outingStyleKeywords[
        outingStyle
      ] ?? [outingStyle];

    if (
      includesAny(
        listingText,
        keywords
      )
    ) {
      score += 3;
    }

    if (
      outingStyle ===
        "Last-minute plans" &&
      listing.isOpenNow === true
    ) {
      score += 4;
    }
  }

  const highestPrice =
    getHighestPrice(
      listing.price ?? ""
    );

  if (
    preferences.budget === "free" &&
    highestPrice === 0
  ) {
    score += 5;
  }

  if (
    preferences.budget ===
      "under-40" &&
    highestPrice !== null &&
    highestPrice <= 40
  ) {
    score += 4;
  }

  if (
    preferences.budget ===
      "under-80" &&
    highestPrice !== null &&
    highestPrice <= 80
  ) {
    score += 3;
  }

  if (
    preferences.alcoholFree
  ) {
    const alcoholFreeKeywords = [
      "alcohol-free",
      "alcohol free",
      "family",
      "market",
      "museum",
      "gallery",
      "cafe",
      "coffee",
      "outdoor"
    ];

    const alcoholFocusedKeywords = [
      "nightclub",
      "cocktail",
      "brewery",
      "bar",
      "nightlife"
    ];

    if (
      includesAny(
        listingText,
        alcoholFreeKeywords
      )
    ) {
      score += 3;
    }

    if (
      includesAny(
        listingText,
        alcoholFocusedKeywords
      )
    ) {
      score -= 2;
    }
  }

  return score;
}

function hasUsefulPreferences(
  preferences: VenturePreferences
): boolean {
  return (
    preferences.interests.length > 0 ||
    preferences.neighbourhoods.length >
      0 ||
    preferences.outingStyles.length >
      0 ||
    preferences.budget !== "flexible" ||
    preferences.alcoholFree
  );
}

export function PersonalizedExploreResults({
  listings,
  eyebrow,
  selectedListingKey = null,
  onSelectListing,
  showHeading = true,
  className = ""
}: PersonalizedExploreResultsProps) {
  const [
    preferences,
    setPreferences
  ] =
    useState<VenturePreferences | null>(
      null
    );

  const [
    personalizationActive,
    setPersonalizationActive
  ] = useState(false);

  useEffect(() => {
    function refreshPreferences() {
      const storedPreferences =
        window.localStorage.getItem(
          PROFILE_PREFERENCES_KEY
        );

      if (!storedPreferences) {
        setPreferences(null);
        setPersonalizationActive(false);
        return;
      }

      const loadedPreferences =
        loadPreferences();

      setPreferences(
        loadedPreferences
      );

      setPersonalizationActive(
        hasUsefulPreferences(
          loadedPreferences
        )
      );
    }

    refreshPreferences();

    window.addEventListener(
      "storage",
      refreshPreferences
    );

    return () => {
      window.removeEventListener(
        "storage",
        refreshPreferences
      );
    };
  }, []);

  const rankedListings =
    useMemo(() => {
      if (
        !personalizationActive ||
        !preferences ||
        onSelectListing
      ) {
        return listings;
      }

      return listings
        .map((listing, index) => ({
          listing,
          index,
          score:
            calculatePreferenceScore(
              listing,
              preferences
            )
        }))
        .sort((first, second) => {
          if (
            second.score !== first.score
          ) {
            return (
              second.score - first.score
            );
          }

          return first.index - second.index;
        })
        .map(
          (result) => result.listing
        );
    }, [
      listings,
      preferences,
      personalizationActive,
      onSelectListing
    ]);

  return (
    <section className={`section-block ${className}`}>
      {showHeading ? (
        <div className="section-heading">
          <div>
            <span>{eyebrow}</span>

            <h2>
              {rankedListings.length}{" "}
              {rankedListings.length === 1
                ? "listing"
                : "listings"}
            </h2>
          </div>
        </div>
      ) : null}

      {personalizationActive &&
      preferences &&
      !onSelectListing ? (
        <div className="personalization-note">
          <span aria-hidden="true">
            ✦
          </span>

          <p>
            Personalized for{" "}
            <strong>
              {preferences.displayName ||
                "you"}
            </strong>

            <small>
              Better matches are ranked
              first. No listings are hidden.
            </small>
          </p>
        </div>
      ) : null}

      {rankedListings.length > 0 ? (
        <div className="vertical-list">
          {rankedListings.map(
            (listing) => (
          <ListingCard
            key={`${listing.type}-${listing.id}`}
            listing={listing}
            selected={
              selectedListingKey ===
              `${listing.type}-${listing.id}`
            }
            onSelect={onSelectListing}
          />
            )
          )}
        </div>
      ) : (
        <section className="empty-results">
          <h3>No matching listings</h3>

          <p>
            Try another filter, event,
            venue, cuisine, category, or
            neighbourhood.
          </p>
        </section>
      )}
    </section>
  );
}