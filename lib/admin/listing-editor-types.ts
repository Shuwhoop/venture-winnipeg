export type AdminListingEntityType =
  | "place"
  | "event";

export type AdminListingSource = {
  id: string | null;
  sourceUrl: string;
  lastCheckedAt: string | null;
};

export type AdminVenueOption = {
  id: string;
  name: string;
  neighbourhood: string | null;
  status: string;
};

export type AdminPlaceEditorRecord = {
  entityType: "place";
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  placeType: string;
  primaryCategory: string;
  secondaryCategories: string[];
  tags: string[];
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  neighbourhood: string;
  latitude: number | null;
  longitude: number | null;
  officialPhone: string;
  officialEmail: string;
  officialWebsite: string;
  priceLevel: number | null;
  cuisinePrimary: string;
  weeklyHours: Record<string, unknown>;
  openStatus: string;
  menuUrl: string;
  reservationUrl: string;
  accessibilityNotes: string;
  parkingNotes: string;
  transitNotes: string;
  status: string;
  verificationStatus: string;
  warningMessage: string;
  sourceCheckedAt: string | null;
  freshnessExpiresAt: string | null;
  source: AdminListingSource;
};

export type AdminEventEditorRecord = {
  entityType: "event";
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  primaryCategory: string;
  secondaryCategories: string[];
  tags: string[];
  venueId: string;
  organizerName: string;
  organizerWebsite: string;
  startAt: string;
  endAt: string | null;
  doorsAt: string | null;
  timezone: string;
  priceType: string;
  minimumPriceCad: number | null;
  maximumPriceCad: number | null;
  feesIncluded: boolean | null;
  ticketUrl: string;
  ticketStatus: string;
  ageMinimum: number | null;
  ageLabel: string;
  indoorOutdoor: string;
  accessibilityNotes: string;
  parkingNotes: string;
  transitNotes: string;
  status: string;
  verificationStatus: string;
  warningMessage: string;
  sourceCheckedAt: string | null;
  freshnessExpiresAt: string | null;
  expiresAt: string;
  source: AdminListingSource;
};

export type AdminListingEditorRecord =
  | AdminPlaceEditorRecord
  | AdminEventEditorRecord;

export type AdminListingEditorData = {
  record: AdminListingEditorRecord;
  venues: AdminVenueOption[];
};

export type AdminListingUpdateResult = {
  ok: true;
  publicPath: string;
  message: string;
};
