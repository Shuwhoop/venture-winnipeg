import type {
  CatalogueKind,
  Listing,
  ListingDurationSource
} from "@/lib/types";

const FOOD_PLACE_TYPES = new Set([
  "restaurant",
  "cafe",
  "bakery_dessert",
  "food_truck",
  "fast_casual",
  "fine_dining",
  "late_night_food"
]);

const NIGHTLIFE_PLACE_TYPES = new Set([
  "bar_pub",
  "brewery"
]);

const ACTIVITY_KEYWORDS = [
  "activity",
  "escape room",
  "escape rooms",
  "axe throwing",
  "board game",
  "board-game",
  "bowling",
  "arcade",
  "mini golf",
  "laser tag",
  "billiards",
  "pool hall",
  "trampoline",
  "climbing",
  "paintball",
  "go-kart",
  "go kart",
  "karaoke",
  "pottery",
  "painting studio",
  "cooking class",
  "interactive games"
];

const ATTRACTION_KEYWORDS = [
  "attraction",
  "museum",
  "gallery",
  "historic site",
  "landmark",
  "zoo",
  "garden",
  "tour"
];

const SHOPPING_KEYWORDS = [
  "shopping",
  "market",
  "boutique",
  "shop",
  "retail"
];

function normalizedListingText(
  listing: Pick<
    Listing,
    | "name"
    | "category"
    | "subtitle"
    | "description"
    | "placeType"
    | "searchTerms"
  >
): string {
  return [
    listing.name,
    listing.category,
    listing.subtitle,
    listing.description,
    listing.placeType ?? "",
    ...(listing.searchTerms ?? [])
  ]
    .join(" ")
    .toLowerCase();
}

function includesAny(
  text: string,
  values: string[]
): boolean {
  return values.some((value) =>
    text.includes(value)
  );
}

export function getCatalogueKind(
  listing: Pick<
    Listing,
    | "type"
    | "name"
    | "category"
    | "subtitle"
    | "description"
    | "placeType"
    | "searchTerms"
  >
): CatalogueKind {
  if (listing.type === "event") {
    return "event";
  }

  const placeType =
    listing.placeType?.toLowerCase() ?? "";
  const text = normalizedListingText(
    listing
  );

  if (
    placeType === "activity" ||
    includesAny(text, ACTIVITY_KEYWORDS)
  ) {
    return "activity";
  }

  if (
    placeType === "attraction" ||
    includesAny(text, ATTRACTION_KEYWORDS)
  ) {
    return "attraction";
  }

  if (
    NIGHTLIFE_PLACE_TYPES.has(placeType) ||
    includesAny(text, [
      "nightlife",
      "nightclub",
      "cocktail",
      "taproom",
      "bar",
      "pub",
      "brewery"
    ])
  ) {
    return "nightlife";
  }

  if (
    placeType === "market" ||
    includesAny(text, SHOPPING_KEYWORDS)
  ) {
    return "shopping";
  }

  if (FOOD_PLACE_TYPES.has(placeType)) {
    return "food";
  }

  return "food";
}

export function getCatalogueLabel(
  kind: CatalogueKind
): string {
  switch (kind) {
    case "event":
      return "Event";
    case "food":
      return "Food & drink";
    case "activity":
      return "Activity";
    case "nightlife":
      return "Nightlife";
    case "attraction":
      return "Attraction";
    case "shopping":
      return "Shopping";
  }
}

export function getCatalogueIcon(
  kind: CatalogueKind
): string {
  switch (kind) {
    case "event":
      return "✦";
    case "food":
      return "⌁";
    case "activity":
      return "⚡";
    case "nightlife":
      return "☾";
    case "attraction":
      return "◇";
    case "shopping":
      return "▱";
  }
}

type DurationProfile = {
  suggestedMinutes: number;
  minimumMinutes: number;
  maximumMinutes: number;
  source: ListingDurationSource;
  isFixedTime: boolean;
};

function clampDuration(
  minutes: number
): number {
  return Math.min(
    480,
    Math.max(20, Math.round(minutes / 5) * 5)
  );
}

function officialEventDuration(
  listing: Pick<
    Listing,
    "startAt" | "endAt"
  >
): number | null {
  if (!listing.startAt || !listing.endAt) {
    return null;
  }

  const start = new Date(listing.startAt);
  const end = new Date(listing.endAt);
  const difference =
    (end.getTime() - start.getTime()) /
    60000;

  return Number.isFinite(difference) &&
    difference > 0
    ? clampDuration(difference)
    : null;
}

export function getSuggestedDurationProfile(
  listing: Pick<
    Listing,
    | "type"
    | "name"
    | "category"
    | "subtitle"
    | "description"
    | "placeType"
    | "searchTerms"
    | "startAt"
    | "endAt"
    | "catalogueKind"
  >
): DurationProfile {
  const officialDuration =
    listing.type === "event"
      ? officialEventDuration(listing)
      : null;

  if (officialDuration !== null) {
    return {
      suggestedMinutes: officialDuration,
      minimumMinutes: officialDuration,
      maximumMinutes: officialDuration,
      source: "official",
      isFixedTime: true
    };
  }

  const text = normalizedListingText({
    name: listing.name,
    category: listing.category,
    subtitle: listing.subtitle,
    description: listing.description,
    placeType: listing.placeType,
    searchTerms: listing.searchTerms
  });

  const profile = (
    suggestedMinutes: number,
    minimumMinutes: number,
    maximumMinutes: number
  ): DurationProfile => ({
    suggestedMinutes,
    minimumMinutes,
    maximumMinutes,
    source: "category_default",
    isFixedTime:
      listing.type === "event" &&
      Boolean(listing.startAt)
  });

  if (includesAny(text, ["board game", "board-game"])) {
    return profile(120, 90, 180);
  }

  if (text.includes("axe throwing")) {
    return profile(90, 75, 120);
  }

  if (text.includes("escape room")) {
    return profile(90, 75, 105);
  }

  if (text.includes("bowling")) {
    return profile(105, 90, 150);
  }

  if (text.includes("arcade")) {
    return profile(90, 60, 120);
  }

  if (text.includes("mini golf")) {
    return profile(75, 60, 90);
  }

  if (text.includes("laser tag")) {
    return profile(75, 60, 90);
  }

  if (text.includes("karaoke")) {
    return profile(120, 90, 180);
  }

  if (includesAny(text, ["pottery", "painting studio", "cooking class", "workshop"])) {
    return profile(120, 90, 180);
  }

  if (includesAny(text, ["climbing", "trampoline", "paintball"])) {
    return profile(120, 90, 150);
  }

  if (includesAny(text, ["go-kart", "go kart"])) {
    return profile(75, 60, 90);
  }

  if (includesAny(text, ["run club", "running club"])) {
    return profile(90, 75, 105);
  }

  if (includesAny(text, ["fitness class", "yoga", "spin class"])) {
    return profile(70, 60, 90);
  }

  if (includesAny(text, ["movie", "cinema", "film screening"])) {
    return profile(150, 120, 210);
  }

  if (includesAny(text, ["concert", "live music", "comedy show", "theatre", "theater"])) {
    return profile(120, 90, 180);
  }

  if (includesAny(text, ["festival", "fair"])) {
    return profile(180, 120, 300);
  }

  if (includesAny(text, ["market", "shopping"])) {
    return profile(75, 45, 120);
  }

  if (includesAny(text, ["museum", "gallery", "zoo", "attraction"])) {
    return profile(105, 75, 150);
  }

  const catalogueKind =
    listing.catalogueKind ??
    getCatalogueKind({
      type: listing.type,
      name: listing.name,
      category: listing.category,
      subtitle: listing.subtitle,
      description: listing.description,
      placeType: listing.placeType,
      searchTerms: listing.searchTerms
    });

  switch (catalogueKind) {
    case "event":
      return profile(120, 60, 180);
    case "activity":
      return profile(90, 60, 150);
    case "nightlife":
      return profile(105, 60, 180);
    case "attraction":
      return profile(90, 60, 150);
    case "shopping":
      return profile(75, 45, 120);
    case "food":
      if (listing.placeType === "cafe") {
        return profile(45, 30, 75);
      }
      if (listing.placeType === "fine_dining") {
        return profile(105, 75, 150);
      }
      return profile(75, 60, 105);
  }
}

export function formatDurationMinutes(
  minutes: number
): string {
  const safeMinutes = Math.max(
    0,
    Math.round(minutes)
  );
  const hours = Math.floor(
    safeMinutes / 60
  );
  const remainder = safeMinutes % 60;

  if (hours === 0) {
    return `${remainder} min`;
  }

  if (remainder === 0) {
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }

  return `${hours} hr ${remainder} min`;
}
