export type VerificationStatus =
  | "official_source"
  | "verified_venture"
  | "verified_business"
  | "community_reported"
  | "unverified";

export type ListingType = "event" | "restaurant";

export type Listing = {
  id: string;
  slug: string;
  type: ListingType;
  name: string;
  category: string;
  subtitle: string;
  statusLabel: string;
  statusTone: "purple" | "green" | "orange" | "amber";
  timeOrHours: string;
  price: string;
  distance: string;
  verification: VerificationStatus;
  lastChecked: string;
  rating?: number;
  ratingCount?: number;
  imageClass: string;
  neighbourhood: string;
  description: string;

  venueName?: string;
  address?: string;
  officialUrl?: string;
  ticketUrl?: string;
};