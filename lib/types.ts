export type VerificationStatus =
  | "official_source"
  | "verified_venture"
  | "verified_business"
  | "community_reported"
  | "unverified";

export type ListingType =
  | "event"
  | "restaurant";

export type CatalogueKind =
  | "event"
  | "food"
  | "activity"
  | "nightlife"
  | "attraction"
  | "shopping";

export type ListingDurationSource =
  | "official"
  | "category_default"
  | "editor_estimate"
  | "venture_aggregate";

export type Listing = {
  id: string;
  slug: string;
  type: ListingType;

  name: string;
  category: string;
  subtitle: string;
  description: string;

  statusLabel: string;
  statusTone:
    | "purple"
    | "green"
    | "orange"
    | "amber";

  timeOrHours: string;
  price: string;
  distance: string;

  verification: VerificationStatus;
  lastChecked: string;

  rating?: number;
  ratingCount?: number;

  imageClass: string;
  imageUrl?: string | null;
  neighbourhood: string;

  catalogueKind?: CatalogueKind;
  suggestedDurationMinutes?: number;
  minimumDurationMinutes?: number;
  maximumDurationMinutes?: number;
  durationSource?: ListingDurationSource;
  isFixedTime?: boolean;

  venueName?: string;
  address?: string;

  officialUrl?: string;
  ticketUrl?: string;

  isOpenNow?: boolean | null;

  latitude?: number;
  longitude?: number;

  /*
   * Structured itinerary data.
   * These fields let Venture calculate
   * future outings without parsing
   * display text.
   */

  startAt?: string;
  endAt?: string;
  doorsAt?: string;
  timezone?: string;

  weeklyHours?: unknown;
  placeType?: string;

  minimumPriceCad?: number | null;
  maximumPriceCad?: number | null;
  priceLevel?: number | null;

  ageLabel?: string;
  indoorOutdoor?: string;

  searchTerms?: string[];
};