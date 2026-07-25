import "server-only";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import type {
  VerificationStatus
} from "@/lib/types";

export type PublicWeeklyHours =
  Record<string, unknown>;

export type PublicListingDetailBase = {
  id: string;
  slug: string;
  entityType: "place" | "event";
  name: string;
  shortDescription: string;
  fullDescription: string | null;
  primaryCategory: string;
  secondaryCategories: string[];
  tags: string[];
  neighbourhood: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  officialWebsite: string | null;
  primarySourceUrl: string | null;
  verificationStatus: VerificationStatus;
  warningMessage: string | null;
  sourceCheckedAt: string | null;
  freshnessExpiresAt: string | null;
  imageUrl: string | null;
  accessibilityNotes: string | null;
  parkingNotes: string | null;
  transitNotes: string | null;
};

export type PublicPlaceDetail =
  PublicListingDetailBase & {
    entityType: "place";
    placeType: string;
    officialPhone: string | null;
    officialEmail: string | null;
    priceLevel: number | null;
    cuisinePrimary: string | null;
    cuisineSecondary: string[];
    weeklyHours: PublicWeeklyHours;
    openStatus: string;
    menuUrl: string | null;
    reservationUrl: string | null;
    dietaryOptions: string[];
    atmosphereTags: string[];
    goodFor: string[];
  };

export type PublicEventDetail =
  PublicListingDetailBase & {
    entityType: "event";
    organizerName: string;
    startAt: string;
    endAt: string | null;
    doorsAt: string | null;
    timezone: string;
    priceType: string;
    minimumPriceCad: number | null;
    maximumPriceCad: number | null;
    ticketUrl: string | null;
    ticketStatus: string;
    ageLabel: string;
    indoorOutdoor: string;
    venueName: string | null;
  };

export type PublicListingDetail =
  | PublicPlaceDetail
  | PublicEventDetail;

type PlaceRow = {
  id: string;
  slug: string;
  place_type: string;
  name: string;
  short_description: string;
  full_description: string | null;
  primary_category: string;
  secondary_categories: string[] | null;
  tags: string[] | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  province: string;
  postal_code: string | null;
  neighbourhood: string | null;
  latitude: number | null;
  longitude: number | null;
  official_phone: string | null;
  official_email: string | null;
  official_website: string | null;
  price_level: number | null;
  cuisine_primary: string | null;
  cuisine_secondary: string[] | null;
  weekly_hours: PublicWeeklyHours | string | null;
  open_status: string;
  menu_url: string | null;
  reservation_url: string | null;
  dietary_options: string[] | null;
  atmosphere_tags: string[] | null;
  good_for: string[] | null;
  accessibility_notes: string | null;
  parking_notes: string | null;
  transit_notes: string | null;
  verification_status: VerificationStatus;
  warning_message: string | null;
  source_checked_at: string | null;
  freshness_expires_at: string | null;
  image_url: string | null;
  image_alt_text: string | null;
};

type VenueRow = {
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  province: string;
  postal_code: string | null;
  neighbourhood: string | null;
  latitude: number | null;
  longitude: number | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  full_description: string | null;
  primary_category: string;
  secondary_categories: string[] | null;
  tags: string[] | null;
  organizer_name: string;
  organizer_website: string | null;
  start_at: string;
  end_at: string | null;
  doors_at: string | null;
  timezone: string;
  price_type: string;
  minimum_price_cad: number | string | null;
  maximum_price_cad: number | string | null;
  ticket_url: string | null;
  ticket_status: string;
  age_label: string;
  indoor_outdoor: string;
  image_url: string | null;
  accessibility_notes: string | null;
  parking_notes: string | null;
  transit_notes: string | null;
  verification_status: VerificationStatus;
  warning_message: string | null;
  source_checked_at: string | null;
  freshness_expires_at: string | null;
  venue: VenueRow | VenueRow[] | null;
};

const placeFields = `
  id,
  slug,
  place_type,
  name,
  short_description,
  full_description,
  primary_category,
  secondary_categories,
  tags,
  address_line1,
  address_line2,
  city,
  province,
  postal_code,
  neighbourhood,
  latitude,
  longitude,
  official_phone,
  official_email,
  official_website,
  price_level,
  cuisine_primary,
  cuisine_secondary,
  weekly_hours,
  open_status,
  menu_url,
  reservation_url,
  dietary_options,
  atmosphere_tags,
  good_for,
  accessibility_notes,
  parking_notes,
  transit_notes,
  verification_status,
  warning_message,
  source_checked_at,
  freshness_expires_at,
  image_url,
  image_alt_text
`;

const eventFields = `
  id,
  slug,
  title,
  short_description,
  full_description,
  primary_category,
  secondary_categories,
  tags,
  organizer_name,
  organizer_website,
  start_at,
  end_at,
  doors_at,
  timezone,
  price_type,
  minimum_price_cad,
  maximum_price_cad,
  ticket_url,
  ticket_status,
  age_label,
  indoor_outdoor,
  image_url,
  accessibility_notes,
  parking_notes,
  transit_notes,
  verification_status,
  warning_message,
  source_checked_at,
  freshness_expires_at,
  venue:places (
    name,
    address_line1,
    address_line2,
    city,
    province,
    postal_code,
    neighbourhood,
    latitude,
    longitude
  )
`;

function parseWeeklyHours(
  value: PublicWeeklyHours | string | null
): PublicWeeklyHours {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as PublicWeeklyHours;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function numberOrNull(
  value: number | string | null
): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function getVenue(
  value: VenueRow | VenueRow[] | null
): VenueRow | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

async function getPrimarySourceUrl(
  entityType: "place" | "event",
  entityId: string
): Promise<string | null> {
  const supabase =
    getSupabaseAdminClient();

  const { data, error } =
    await supabase
      .from("listing_sources")
      .select("source_url,is_primary,last_checked_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("is_primary", {
        ascending: false
      })
      .order("last_checked_at", {
        ascending: false,
        nullsFirst: false
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    console.error(
      "Unable to load primary listing source",
      {
        entityType,
        entityId,
        message: error.message
      }
    );

    return null;
  }

  return data?.source_url ?? null;
}

function isTommysPizzeriaDetail(
  value: {
    slug: string;
    name: string;
  }
): boolean {
  const slug =
    value.slug.toLowerCase();
  const listingName =
    value.name.toLowerCase();

  return (
    slug.includes("tommy") &&
    slug.includes("pizz")
  ) || (
    listingName.includes("tommy") &&
    listingName.includes("pizz")
  );
}

function getPlaceImageUrl(
  row: {
    slug: string;
    name: string;
    image_url?: string | null;
  }
): string | null {
  if (row.image_url) {
    return row.image_url;
  }

  return isTommysPizzeriaDetail(row)
    ? "/listing-icons/tommys-pizzeria.jpg"
    : null;
}

function placeToDetail(
  row: PlaceRow,
  primarySourceUrl: string | null
): PublicPlaceDetail {
  return {
    id: row.id,
    slug: row.slug,
    entityType: "place",
    name: row.name,
    shortDescription:
      row.short_description,
    fullDescription:
      row.full_description,
    primaryCategory:
      row.primary_category,
    secondaryCategories:
      row.secondary_categories ?? [],
    tags: row.tags ?? [],
    neighbourhood: row.neighbourhood,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    officialWebsite:
      row.official_website,
    primarySourceUrl,
    verificationStatus:
      row.verification_status,
    warningMessage: row.warning_message,
    sourceCheckedAt:
      row.source_checked_at,
    freshnessExpiresAt:
      row.freshness_expires_at,
    imageUrl: getPlaceImageUrl(row),
    accessibilityNotes:
      row.accessibility_notes,
    parkingNotes: row.parking_notes,
    transitNotes: row.transit_notes,
    placeType: row.place_type,
    officialPhone: row.official_phone,
    officialEmail: row.official_email,
    priceLevel: row.price_level,
    cuisinePrimary: row.cuisine_primary,
    cuisineSecondary:
      row.cuisine_secondary ?? [],
    weeklyHours:
      parseWeeklyHours(row.weekly_hours),
    openStatus: row.open_status,
    menuUrl: row.menu_url,
    reservationUrl:
      row.reservation_url,
    dietaryOptions:
      row.dietary_options ?? [],
    atmosphereTags:
      row.atmosphere_tags ?? [],
    goodFor: row.good_for ?? []
  };
}

function eventToDetail(
  row: EventRow,
  primarySourceUrl: string | null
): PublicEventDetail {
  const venue = getVenue(row.venue);

  return {
    id: row.id,
    slug: row.slug,
    entityType: "event",
    name: row.title,
    shortDescription:
      row.short_description,
    fullDescription:
      row.full_description,
    primaryCategory:
      row.primary_category,
    secondaryCategories:
      row.secondary_categories ?? [],
    tags: row.tags ?? [],
    neighbourhood:
      venue?.neighbourhood ?? null,
    addressLine1:
      venue?.address_line1 ?? null,
    addressLine2:
      venue?.address_line2 ?? null,
    city: venue?.city ?? "Winnipeg",
    province:
      venue?.province ?? "Manitoba",
    postalCode:
      venue?.postal_code ?? null,
    latitude:
      numberOrNull(
        venue?.latitude ?? null
      ),
    longitude:
      numberOrNull(
        venue?.longitude ?? null
      ),
    officialWebsite:
      row.organizer_website,
    primarySourceUrl,
    verificationStatus:
      row.verification_status,
    warningMessage: row.warning_message,
    sourceCheckedAt:
      row.source_checked_at,
    freshnessExpiresAt:
      row.freshness_expires_at,
    imageUrl: row.image_url,
    accessibilityNotes:
      row.accessibility_notes,
    parkingNotes: row.parking_notes,
    transitNotes: row.transit_notes,
    organizerName: row.organizer_name,
    startAt: row.start_at,
    endAt: row.end_at,
    doorsAt: row.doors_at,
    timezone:
      row.timezone || "America/Winnipeg",
    priceType: row.price_type,
    minimumPriceCad:
      numberOrNull(
        row.minimum_price_cad
      ),
    maximumPriceCad:
      numberOrNull(
        row.maximum_price_cad
      ),
    ticketUrl: row.ticket_url,
    ticketStatus: row.ticket_status,
    ageLabel: row.age_label,
    indoorOutdoor:
      row.indoor_outdoor,
    venueName: venue?.name ?? null
  };
}

export async function getPublishedListingDetailBySlug(
  slug: string
): Promise<PublicListingDetail | null> {
  const supabase =
    getSupabaseAdminClient();

  const placeResult =
    await supabase
      .from("places")
      .select(placeFields)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

  if (placeResult.error) {
    console.error(
      "Unable to load public place detail",
      placeResult.error
    );
  }

  if (placeResult.data) {
    const place =
      placeResult.data as unknown as
        PlaceRow;

    return placeToDetail(
      place,
      await getPrimarySourceUrl(
        "place",
        place.id
      )
    );
  }

  const eventResult =
    await supabase
      .from("events")
      .select(eventFields)
      .eq("slug", slug)
      .eq("status", "published")
      .gt(
        "expires_at",
        new Date().toISOString()
      )
      .maybeSingle();

  if (eventResult.error) {
    console.error(
      "Unable to load public event detail",
      eventResult.error
    );
  }

  if (!eventResult.data) {
    return null;
  }

  const event =
    eventResult.data as unknown as
      EventRow;

  return eventToDetail(
    event,
    await getPrimarySourceUrl(
      "event",
      event.id
    )
  );
}
