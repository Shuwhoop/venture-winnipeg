import "server-only";

import { reportDataAccessError } from "@/lib/network-errors";

import {
  eventFields,
  eventToListing,
  type EventRow
} from "@/lib/data/events";

import {
  convertPlaceToListing,
  placeFields,
  type PlaceRow
} from "@/lib/data/places";

import {
  matchesDiscoveryFilter,
  matchesDiscoveryOccasion,
  matchesDiscoveryPrice,
  matchesDiscoveryWhen,
  type DiscoveryFilter,
  type DiscoveryOccasion,
  type DiscoveryPrice,
  type DiscoveryWhen
} from "@/lib/discovery-intent";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import type {
  Listing,
  VerificationStatus
} from "@/lib/types";

const FOOD_PLACE_TYPES = [
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
] as const;

const NIGHTLIFE_PLACE_TYPES = [
  "bar_pub",
  "brewery",
  "late_night_food"
] as const;

const EXPLORE_PLACE_TYPES = [
  ...FOOD_PLACE_TYPES,
  ...NIGHTLIFE_PLACE_TYPES,
  "market",
  "activity",
  "attraction"
] as const;

const TRUSTED_STATUSES: VerificationStatus[] = [
  "official_source",
  "verified_venture",
  "verified_business"
];

const MAX_SCAN_BATCHES = 50;
const MAX_SEARCH_TOKENS = 8;

type ExploreSearchOptions = {
  search: string;
  filter: DiscoveryFilter;
  when: DiscoveryWhen;
  price: DiscoveryPrice;
  occasion: DiscoveryOccasion;
  area: string;
  limit: number;
};

export type ExploreSearchResult = {
  listings: Listing[];
  hasMore: boolean;
};

function normalizeSearchTokens(
  value: string
): string[] {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return Array.from(
    new Set(normalized)
  ).slice(0, MAX_SEARCH_TOKENS);
}

function safeIlikePattern(
  value: string
): string {
  return `%${value
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()}%`;
}

function placeTypeFilter(
  filter: DiscoveryFilter
): readonly string[] | null {
  if (filter === "food") {
    return FOOD_PLACE_TYPES;
  }

  if (filter === "activities") {
    return ["activity"];
  }

  if (filter === "nightlife") {
    return NIGHTLIFE_PLACE_TYPES;
  }

  if (filter === "attractions") {
    return ["attraction"];
  }

  return null;
}

function skipPlaces(
  filter: DiscoveryFilter,
  price: DiscoveryPrice
): boolean {
  return (
    filter === "events" ||
    price === "free"
  );
}

function skipEvents(
  filter: DiscoveryFilter,
  when: DiscoveryWhen
): boolean {
  return (
    filter === "food" ||
    filter === "activities" ||
    filter === "nightlife" ||
    filter === "attractions" ||
    filter === "open" ||
    when === "open"
  );
}

export async function searchPublishedPlaces({
  search,
  filter,
  when,
  price,
  occasion,
  area,
  limit
}: ExploreSearchOptions): Promise<ExploreSearchResult> {
  if (skipPlaces(filter, price)) {
    return {
      listings: [],
      hasMore: false
    };
  }

  const supabase =
    getSupabaseAdminClient();

  const requestedLimit = Math.max(
    1,
    Math.min(1000, Math.round(limit))
  );

  const target = requestedLimit + 1;
  const batchSize = Math.min(
    200,
    Math.max(48, target * 2)
  );

  const tokens =
    normalizeSearchTokens(search);

  const normalizedArea =
    area.trim();

  const requestedTypes =
    placeTypeFilter(filter);

  const collected: Listing[] = [];
  let rawOffset = 0;
  let totalRaw = Number.POSITIVE_INFINITY;
  let batches = 0;

  while (
    collected.length < target &&
    rawOffset < totalRaw &&
    batches < MAX_SCAN_BATCHES
  ) {
    let query = supabase
      .from("places")
      .select(placeFields, {
        count: "exact"
      })
      .eq("status", "published")
      .neq("place_type", "event_venue")
      .in(
        "place_type",
        requestedTypes ??
          EXPLORE_PLACE_TYPES
      );

    if (filter === "verified") {
      query = query.in(
        "verification_status",
        TRUSTED_STATUSES
      );
    }

    if (normalizedArea) {
      query = query.ilike(
        "neighbourhood",
        safeIlikePattern(
          normalizedArea
        )
      );
    }

    if (price === "under-20") {
      query = query.lte(
        "price_level",
        1
      );
    }

    if (price === "under-40") {
      query = query.lte(
        "price_level",
        2
      );
    }

    for (const token of tokens) {
      const pattern =
        safeIlikePattern(token);

      query = query.or(
        [
          `name.ilike.${pattern}`,
          `short_description.ilike.${pattern}`,
          `full_description.ilike.${pattern}`,
          `primary_category.ilike.${pattern}`,
          `neighbourhood.ilike.${pattern}`,
          `cuisine_primary.ilike.${pattern}`,
          `address_line1.ilike.${pattern}`
        ].join(",")
      );
    }

    const { data, error, count } =
      await query
        .order("published_at", {
          ascending: false,
          nullsFirst: false
        })
        .order("id", {
          ascending: true
        })
        .range(
          rawOffset,
          rawOffset + batchSize - 1
        );

    if (error) {
      reportDataAccessError(
        "Unable to search Venture places",
        error
      );

      return {
        listings: [],
        hasMore: false
      };
    }

    const rows =
      (data ?? []) as unknown as PlaceRow[];

    totalRaw = count ??
      rawOffset + rows.length;

    rawOffset += rows.length;
    batches += 1;

    const matchingRows = rows
      .map(convertPlaceToListing)
      .filter((listing) =>
        matchesDiscoveryFilter(
          listing,
          filter
        ) &&
        matchesDiscoveryWhen(
          listing,
          when
        ) &&
        matchesDiscoveryPrice(
          listing,
          price
        ) &&
        matchesDiscoveryOccasion(
          listing,
          occasion
        )
      );

    collected.push(...matchingRows);

    if (rows.length < batchSize) {
      break;
    }
  }

  return {
    listings: collected.slice(
      0,
      requestedLimit
    ),
    hasMore:
      collected.length > requestedLimit ||
      rawOffset < totalRaw
  };
}

export async function searchPublishedEvents({
  search,
  filter,
  when,
  price,
  occasion,
  area,
  limit
}: ExploreSearchOptions): Promise<ExploreSearchResult> {
  if (skipEvents(filter, when)) {
    return {
      listings: [],
      hasMore: false
    };
  }

  const supabase =
    getSupabaseAdminClient();

  const requestedLimit = Math.max(
    1,
    Math.min(1000, Math.round(limit))
  );

  const target = requestedLimit + 1;
  const batchSize = Math.min(
    200,
    Math.max(48, target * 2)
  );

  const tokens =
    normalizeSearchTokens(search);

  const normalizedArea =
    area.trim();

  const selectedFields = normalizedArea
    ? eventFields.replace(
        "venue:places (",
        "venue:places!inner ("
      )
    : eventFields;

  const collected: Listing[] = [];
  let rawOffset = 0;
  let totalRaw = Number.POSITIVE_INFINITY;
  let batches = 0;

  while (
    collected.length < target &&
    rawOffset < totalRaw &&
    batches < MAX_SCAN_BATCHES
  ) {
    let query = supabase
      .from("events")
      .select(selectedFields, {
        count: "exact"
      })
      .eq("status", "published")
      .gt(
        "expires_at",
        new Date().toISOString()
      );

    if (filter === "verified") {
      query = query.in(
        "verification_status",
        TRUSTED_STATUSES
      );
    }

    if (normalizedArea) {
      query = query.ilike(
        "venue.neighbourhood",
        safeIlikePattern(
          normalizedArea
        )
      );
    }

    if (price === "free") {
      query = query.eq(
        "price_type",
        "free"
      );
    }

    if (price === "under-20") {
      query = query.or(
        "price_type.eq.free,minimum_price_cad.lte.20,maximum_price_cad.lte.20"
      );
    }

    if (price === "under-40") {
      query = query.or(
        "price_type.eq.free,minimum_price_cad.lte.40,maximum_price_cad.lte.40"
      );
    }

    for (const token of tokens) {
      const pattern =
        safeIlikePattern(token);

      query = query.or(
        [
          `title.ilike.${pattern}`,
          `short_description.ilike.${pattern}`,
          `full_description.ilike.${pattern}`,
          `primary_category.ilike.${pattern}`,
          `organizer_name.ilike.${pattern}`
        ].join(",")
      );
    }

    const { data, error, count } =
      await query
        .order("start_at", {
          ascending: true
        })
        .order("id", {
          ascending: true
        })
        .range(
          rawOffset,
          rawOffset + batchSize - 1
        );

    if (error) {
      reportDataAccessError(
        "Unable to search Venture events",
        error
      );

      return {
        listings: [],
        hasMore: false
      };
    }

    const rows =
      (data ?? []) as unknown as EventRow[];

    totalRaw = count ??
      rawOffset + rows.length;

    rawOffset += rows.length;
    batches += 1;

    const matchingRows = rows
      .map(eventToListing)
      .filter((listing) =>
        matchesDiscoveryFilter(
          listing,
          filter
        ) &&
        matchesDiscoveryWhen(
          listing,
          when
        ) &&
        matchesDiscoveryPrice(
          listing,
          price
        ) &&
        matchesDiscoveryOccasion(
          listing,
          occasion
        )
      );

    collected.push(...matchingRows);

    if (rows.length < batchSize) {
      break;
    }
  }

  return {
    listings: collected.slice(
      0,
      requestedLimit
    ),
    hasMore:
      collected.length > requestedLimit ||
      rawOffset < totalRaw
  };
}

export function mergeExploreListings(
  events: Listing[],
  places: Listing[],
  filter: DiscoveryFilter
): Listing[] {
  if (filter === "events") {
    return events;
  }

  if (
    filter === "food" ||
    filter === "activities" ||
    filter === "nightlife" ||
    filter === "attractions" ||
    filter === "open"
  ) {
    return places;
  }

  const merged: Listing[] = [];
  let eventIndex = 0;
  let placeIndex = 0;

  while (
    eventIndex < events.length ||
    placeIndex < places.length
  ) {
    if (eventIndex < events.length) {
      merged.push(
        events[eventIndex]
      );
      eventIndex += 1;
    }

    for (
      let placeSlot = 0;
      placeSlot < 2 &&
      placeIndex < places.length;
      placeSlot += 1
    ) {
      merged.push(
        places[placeIndex]
      );
      placeIndex += 1;
    }
  }

  return merged;
}

export async function getExploreNeighbourhoods(): Promise<string[]> {
  const supabase =
    getSupabaseAdminClient();

  const { data, error } =
    await supabase
      .from("places")
      .select("neighbourhood")
      .eq("status", "published")
      .not("neighbourhood", "is", null)
      .limit(1000);

  if (error) {
    reportDataAccessError(
      "Unable to load Explore neighbourhoods",
      error
    );

    return [];
  }

  const neighbourhoodValues = (
    (data ?? []) as {
      neighbourhood: string | null;
    }[]
  )
    .map((row) =>
      row.neighbourhood?.trim() ?? ""
    )
    .filter(Boolean);

  return Array.from(
    new Set<string>(
      neighbourhoodValues
    )
  ).sort((first, second) =>
    first.localeCompare(second)
  );
}
