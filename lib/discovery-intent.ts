import type {
  Listing
} from "@/lib/types";

export type DiscoveryFilter =
  | "all"
  | "events"
  | "food"
  | "open"
  | "verified";

export type DiscoveryWhen =
  | "any"
  | "tonight"
  | "weekend"
  | "open";

export type DiscoveryPrice =
  | "any"
  | "free"
  | "under-20"
  | "under-40";

export type DiscoveryIntent = {
  cleanedQuery: string;
  inferredFilter: DiscoveryFilter | null;
  inferredWhen: DiscoveryWhen | null;
  inferredPrice: DiscoveryPrice | null;
  newToMe: boolean;
  interpreted: boolean;
};

const newToMePatterns = [
  /somewhere\s+i\s+(?:have\s*not|haven['’]?t|havent)\s+(?:gone|been)/gi,
  /(?:a\s+)?place\s+i\s+(?:have\s*not|haven['’]?t|havent)\s+(?:gone|been)/gi,
  /somewhere\s+new/gi,
  /new\s+to\s+me/gi,
  /(?:a\s+)?place\s+i['’]?ve\s+never\s+been/gi,
  /i['’]?ve\s+never\s+been/gi,
  /not\s+the\s+same\s+places?/gi
];

const fillerPatterns = [
  /\bshow\s+me\b/gi,
  /\bfind\s+me\b/gi,
  /\bi\s+need\b/gi,
  /\btake\s+me\b/gi,
  /\bgive\s+me\b/gi,
  /\bplease\b/gi,
  /\bsomething\b/gi,
  /\bsomewhere\b/gi,
  /\bto\s+do\b/gi
];

function removePatterns(
  value: string,
  patterns: RegExp[]
) {
  return patterns.reduce(
    (current, pattern) =>
      current.replace(pattern, " "),
    value
  );
}

function normalizeCleanedQuery(
  value: string
) {
  return value
    .replace(/[?!.:,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDiscoveryIntent(
  query: string
): DiscoveryIntent {
  let working = query.trim();
  let interpreted = false;

  const newToMe = newToMePatterns.some(
    (pattern) => pattern.test(working)
  );

  if (newToMe) {
    interpreted = true;
    working = removePatterns(
      working,
      newToMePatterns
    );
  }

  let inferredFilter:
    | DiscoveryFilter
    | null = null;

  const eventPattern =
    /\b(events?|concerts?|shows?|festivals?|comedy|sports?)\b/gi;
  const foodPattern =
    /\b(restaurants?|food|dinner|lunch|brunch|cafes?|coffee|bars?|drinks?)\b/gi;

  if (eventPattern.test(working)) {
    inferredFilter = "events";
    interpreted = true;
    working = working.replace(
      eventPattern,
      " "
    );
  } else if (foodPattern.test(working)) {
    inferredFilter = "food";
    interpreted = true;
    working = working.replace(
      foodPattern,
      " "
    );
  }

  let inferredWhen:
    | DiscoveryWhen
    | null = null;

  const openNowPattern =
    /\bopen\s+now\b/gi;
  const tonightPattern =
    /\b(?:tonight|this\s+evening)\b/gi;
  const weekendPattern =
    /\b(?:this\s+weekend|weekend)\b/gi;

  if (openNowPattern.test(working)) {
    inferredWhen = "open";
    interpreted = true;
    working = working.replace(
      openNowPattern,
      " "
    );
  } else if (tonightPattern.test(working)) {
    inferredWhen = "tonight";
    interpreted = true;
    working = working.replace(
      tonightPattern,
      " "
    );
  } else if (weekendPattern.test(working)) {
    inferredWhen = "weekend";
    interpreted = true;
    working = working.replace(
      weekendPattern,
      " "
    );
  }

  let inferredPrice:
    | DiscoveryPrice
    | null = null;

  const underTwentyPattern =
    /\bunder\s*\$?\s*20\b/gi;
  const underFortyPattern =
    /\bunder\s*\$?\s*40\b/gi;
  const freePattern =
    /\bfree\b/gi;
  const affordablePattern =
    /\b(?:cheap|affordable|budget(?:-friendly)?)\b/gi;

  if (underTwentyPattern.test(working)) {
    inferredPrice = "under-20";
    interpreted = true;
    working = working.replace(
      underTwentyPattern,
      " "
    );
  } else if (underFortyPattern.test(working)) {
    inferredPrice = "under-40";
    interpreted = true;
    working = working.replace(
      underFortyPattern,
      " "
    );
  } else if (freePattern.test(working)) {
    inferredPrice = "free";
    interpreted = true;
    working = working.replace(
      freePattern,
      " "
    );
  } else if (affordablePattern.test(working)) {
    inferredPrice = "under-40";
    interpreted = true;
    working = working.replace(
      affordablePattern,
      " "
    );
  }

  working = removePatterns(
    working,
    fillerPatterns
  );

  return {
    cleanedQuery:
      normalizeCleanedQuery(working),
    inferredFilter,
    inferredWhen,
    inferredPrice,
    newToMe,
    interpreted
  };
}

function getListingSearchText(
  listing: Listing
) {
  return [
    listing.name,
    listing.category,
    listing.subtitle,
    listing.neighbourhood,
    listing.description,
    listing.venueName ?? "",
    listing.address ?? "",
    ...(listing.searchTerms ?? [])
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesDiscoverySearch(
  listing: Listing,
  query: string
) {
  const normalized = query
    .trim()
    .toLowerCase();

  if (!normalized) {
    return true;
  }

  return getListingSearchText(
    listing
  ).includes(normalized);
}

export function isVerifiedListing(
  listing: Listing
) {
  return (
    listing.verification !==
      "unverified" &&
    listing.verification !==
      "community_reported"
  );
}

export function matchesDiscoveryFilter(
  listing: Listing,
  filter: DiscoveryFilter
) {
  switch (filter) {
    case "events":
      return listing.type === "event";

    case "food":
      return listing.type === "restaurant";

    case "open":
      return (
        listing.type === "restaurant" &&
        listing.isOpenNow === true
      );

    case "verified":
      return isVerifiedListing(listing);

    default:
      return true;
  }
}

function getComparablePrice(
  listing: Listing
): number | null {
  if (
    listing.minimumPriceCad !== null &&
    listing.minimumPriceCad !== undefined
  ) {
    return listing.minimumPriceCad;
  }

  if (
    listing.maximumPriceCad !== null &&
    listing.maximumPriceCad !== undefined
  ) {
    return listing.maximumPriceCad;
  }

  if (
    listing.priceLevel !== null &&
    listing.priceLevel !== undefined
  ) {
    const estimates: Record<
      number,
      number
    > = {
      1: 15,
      2: 30,
      3: 55,
      4: 90
    };

    return estimates[listing.priceLevel] ??
      null;
  }

  if (
    listing.price
      .toLowerCase()
      .includes("free")
  ) {
    return 0;
  }

  const matches = listing.price.match(
    /\d+(?:\.\d+)?/g
  );

  if (!matches) {
    return null;
  }

  const values = matches
    .map(Number)
    .filter(Number.isFinite);

  return values.length > 0
    ? Math.min(...values)
    : null;
}

export function matchesDiscoveryPrice(
  listing: Listing,
  price: DiscoveryPrice
) {
  if (price === "any") {
    return true;
  }

  const comparable =
    getComparablePrice(listing);

  if (price === "free") {
    return comparable === 0;
  }

  if (comparable === null) {
    return false;
  }

  return price === "under-20"
    ? comparable <= 20
    : comparable <= 40;
}

function dateKeyInWinnipeg(
  date: Date
) {
  const parts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Winnipeg",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;
  const month = parts.find(
    (part) => part.type === "month"
  )?.value;
  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

function isWeekendEvent(
  listing: Listing
) {
  if (
    listing.type !== "event" ||
    !listing.startAt
  ) {
    return listing.type === "restaurant";
  }

  const start = new Date(
    listing.startAt
  );

  if (Number.isNaN(start.getTime())) {
    return false;
  }

  const now = new Date();
  const sevenDaysFromNow =
    new Date(
      now.getTime() +
        7 * 24 * 60 * 60 * 1000
    );

  if (
    start < now ||
    start > sevenDaysFromNow
  ) {
    return false;
  }

  const weekday =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Winnipeg",
      weekday: "short"
    }).format(start);

  return ["Fri", "Sat", "Sun"].includes(
    weekday
  );
}

export function matchesDiscoveryWhen(
  listing: Listing,
  when: DiscoveryWhen
) {
  if (when === "any") {
    return true;
  }

  if (when === "open") {
    return (
      listing.type === "restaurant" &&
      listing.isOpenNow === true
    );
  }

  if (when === "weekend") {
    return isWeekendEvent(listing);
  }

  if (listing.type === "restaurant") {
    return listing.isOpenNow === true;
  }

  if (!listing.startAt) {
    return (
      listing.statusLabel === "TODAY" ||
      listing.statusLabel === "HAPPENING"
    );
  }

  return (
    dateKeyInWinnipeg(
      new Date(listing.startAt)
    ) === dateKeyInWinnipeg(new Date())
  );
}
