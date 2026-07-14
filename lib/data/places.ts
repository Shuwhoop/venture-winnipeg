import "server-only";

import { createClient } from "@supabase/supabase-js";
import type {
  Listing,
  VerificationStatus
} from "@/lib/types";

type PlaceRow = {
  id: string;
  slug: string;
  place_type: string;
  name: string;
  short_description: string;
  primary_category: string;
  neighbourhood: string | null;
  price_level: number | null;
  cuisine_primary: string | null;
  open_status: string;
  verification_status: VerificationStatus;
  warning_message: string | null;
  source_checked_at: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
};

function getPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase public environment variables are missing."
    );
  }

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

function getPriceLabel(priceLevel: number | null): string {
  if (!priceLevel) {
    return "Price unavailable";
  }

  return "$".repeat(priceLevel);
}

function getOpenStatus(openStatus: string): {
  label: string;
  tone: Listing["statusTone"];
  details: string;
} {
  switch (openStatus) {
    case "open":
      return {
        label: "OPEN",
        tone: "green",
        details: "Open now"
      };

    case "temporarily_closed":
      return {
        label: "TEMPORARILY CLOSED",
        tone: "orange",
        details: "Temporarily closed"
      };

    case "permanently_closed":
      return {
        label: "CLOSED",
        tone: "orange",
        details: "Permanently closed"
      };

    default:
      return {
        label: "DETAILS UNCONFIRMED",
        tone: "amber",
        details: "Hours not confirmed"
      };
  }
}

function getLastCheckedLabel(
  sourceCheckedAt: string | null
): string {
  if (!sourceCheckedAt) {
    return "Source check pending";
  }

  const formattedDate = new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric"
  }).format(new Date(sourceCheckedAt));

  return `Checked ${formattedDate}`;
}

function convertPlaceToListing(place: PlaceRow): Listing {
  const price = getPriceLabel(place.price_level);
  const openStatus = getOpenStatus(place.open_status);

  const subtitleParts = [
    place.cuisine_primary ?? place.primary_category,
    price
  ];

  return {
    id: place.id,
    slug: place.slug,
    type: "restaurant",
    name: place.name,
    category: place.primary_category,
    subtitle: subtitleParts.join(" · "),
    statusLabel: openStatus.label,
    statusTone: openStatus.tone,
    timeOrHours: openStatus.details,
    price,
    distance: place.neighbourhood ?? "Winnipeg",
    verification: place.verification_status,
    lastChecked: getLastCheckedLabel(
      place.source_checked_at
    ),
    rating: place.google_rating ?? undefined,
    ratingCount: place.google_rating_count ?? undefined,
    imageClass: "image-food",
    neighbourhood: place.neighbourhood ?? "Winnipeg",
    description: place.short_description
  };
}

export async function getPublishedPlaceListings(
  limit = 10
): Promise<Listing[]> {
  const supabase = getPublicSupabaseClient();

  const { data, error } = await supabase
    .from("places")
    .select(`
      id,
      slug,
      place_type,
      name,
      short_description,
      primary_category,
      neighbourhood,
      price_level,
      cuisine_primary,
      open_status,
      verification_status,
      warning_message,
      source_checked_at,
      google_rating,
      google_rating_count
    `)
    .eq("status", "published")
    .neq("place_type", "event_venue")
    .in("place_type", [
      "restaurant",
      "cafe",
      "bakery_dessert",
      "bar_pub",
      "brewery",
      "food_truck",
      "fast_casual",
      "fine_dining",
      "late_night_food",
      "market"
    ])
    .order("published_at", {
      ascending: false
    })
    .limit(limit);

  if (error) {
    console.error(
      "Unable to load Venture places:",
      error
    );

    return [];
  }

  return (data as PlaceRow[]).map(
    convertPlaceToListing
  );
}
export async function getPublishedPlaceListingBySlug(
  slug: string
): Promise<Listing | null> {
  const supabase = getPublicSupabaseClient();

  const { data, error } = await supabase
    .from("places")
    .select(`
      id,
      slug,
      place_type,
      name,
      short_description,
      primary_category,
      neighbourhood,
      price_level,
      cuisine_primary,
      open_status,
      verification_status,
      warning_message,
      source_checked_at,
      google_rating,
      google_rating_count
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load Venture place:",
      error
    );

    return null;
  }

  if (!data) {
    return null;
  }

  return convertPlaceToListing(
    data as PlaceRow
  );
}