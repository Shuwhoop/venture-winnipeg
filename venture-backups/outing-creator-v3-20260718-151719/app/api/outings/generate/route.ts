import { NextResponse } from "next/server";

import {
  getPublishedEventListings
} from "@/lib/data/events";

import {
  getPublishedPlaceListings
} from "@/lib/data/places";

import type {
  BudgetPreference
} from "@/lib/profile-preferences";

import type {
  Listing,
  VerificationStatus
} from "@/lib/types";

const WINNIPEG_TIMEZONE =
  "America/Winnipeg";

const weekdayOrder = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
] as const;

type GenerateOutingRequest = {
  outingTypeId: string;
  outingTypeTitle: string;
  date: string;
  startTime: string;
  duration: string;
  interests: string[];
  neighbourhoods: string[];
  budget: BudgetPreference;
  transportation: string;
  alcoholFree: boolean;
  partySize: number;
  maxTravelMinutes: number;
  mustIncludeTerms: string[];
  avoidTerms: string[];
};

type TimeInterval = {
  start: number;
  end: number;
};

type Candidate = {
  listing: Listing;
  score: number;
  intervals: TimeInterval[];
  fixedStart?: number;
  estimatedCostCad: number | null;
  matchedInterests: string[];
};

type PlannedStop = {
  order: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  travelFromPreviousMinutes: number | null;
  estimatedCostCad: number | null;
  reason: string;
  listing: Listing;
};

type ProposedStop = {
  candidate: Candidate;
  start: number;
  end: number;
  travelFromPreviousMinutes: number | null;
};

const trustedStatuses =
  new Set<VerificationStatus>([
    "official_source",
    "verified_venture",
    "verified_business"
  ]);

const interestKeywords:
  Record<string, string[]> = {
    Food: [
      "food",
      "restaurant",
      "cafe",
      "bakery",
      "dessert",
      "market",
      "cuisine",
      "dining"
    ],

    "Live music": [
      "live music",
      "music",
      "concert",
      "band",
      "festival"
    ],

    "Date nights": [
      "date",
      "restaurant",
      "dining",
      "music",
      "theatre",
      "art",
      "dessert"
    ],

    Comedy: [
      "comedy",
      "comedian",
      "stand-up",
      "standup"
    ],

    Sports: [
      "sport",
      "sports",
      "hockey",
      "football",
      "soccer",
      "basketball",
      "game"
    ],

    Markets: [
      "market",
      "vendor",
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
      "tabletop",
      "esports",
      "anime",
      "cosplay"
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

const outingTypeKeywords:
  Record<string, string[]> = {
    "date-night": [
      "restaurant",
      "dining",
      "music",
      "art",
      "theatre",
      "dessert",
      "cafe"
    ],

    "friends-night": [
      "music",
      "comedy",
      "gaming",
      "festival",
      "sports",
      "restaurant"
    ],

    "solo-outing": [
      "museum",
      "gallery",
      "market",
      "cafe",
      "workshop",
      "art"
    ],

    "family-plan": [
      "family",
      "kids",
      "children",
      "all ages",
      "market",
      "festival"
    ],

    "food-crawl": [
      "restaurant",
      "food",
      "cafe",
      "bakery",
      "dessert",
      "market"
    ],

    nightlife: [
      "nightlife",
      "music",
      "concert",
      "club",
      "bar",
      "late night"
    ],

    "budget-night": [
      "free",
      "market",
      "festival",
      "outdoor",
      "community"
    ],

    "surprise-me": []
  };

function isStringArray(
  value: unknown
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "string"
    )
  );
}

function isBudgetPreference(
  value: unknown
): value is BudgetPreference {
  return (
    value === "free" ||
    value === "under-40" ||
    value === "under-80" ||
    value === "flexible"
  );
}

function parseRequest(
  value: unknown
): GenerateOutingRequest | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const body =
    value as Record<
      string,
      unknown
    >;

  const partySize =
    typeof body.partySize ===
      "number" &&
    Number.isFinite(
      body.partySize
    )
      ? Math.min(
          12,
          Math.max(
            1,
            Math.round(
              body.partySize
            )
          )
        )
      : 1;

  const maxTravelMinutes =
    typeof body.maxTravelMinutes ===
      "number" &&
    Number.isFinite(
      body.maxTravelMinutes
    )
      ? Math.min(
          90,
          Math.max(
            5,
            Math.round(
              body.maxTravelMinutes
            )
          )
        )
      : 20;

  const mustIncludeTerms =
    body.mustIncludeTerms ===
      undefined
      ? []
      : isStringArray(
          body.mustIncludeTerms
        )
        ? body.mustIncludeTerms
            .map(
              (term) =>
                term.trim()
            )
            .filter(Boolean)
            .slice(0, 8)
        : null;

  const avoidTerms =
    body.avoidTerms ===
      undefined
      ? []
      : isStringArray(
          body.avoidTerms
        )
        ? body.avoidTerms
            .map(
              (term) =>
                term.trim()
            )
            .filter(Boolean)
            .slice(0, 8)
        : null;

  if (
    typeof body.outingTypeId !==
      "string" ||
    typeof body.outingTypeTitle !==
      "string" ||
    typeof body.date !== "string" ||
    typeof body.startTime !== "string" ||
    typeof body.duration !== "string" ||
    !isStringArray(
      body.interests
    ) ||
    !isStringArray(
      body.neighbourhoods
    ) ||
    !isBudgetPreference(
      body.budget
    ) ||
    typeof body.transportation !==
      "string" ||
    typeof body.alcoholFree !==
      "boolean" ||
    mustIncludeTerms ===
      null ||
    avoidTerms ===
      null
  ) {
    return null;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      body.date
    ) ||
    !/^\d{2}:\d{2}$/.test(
      body.startTime
    )
  ) {
    return null;
  }

  return {
    outingTypeId:
      body.outingTypeId,

    outingTypeTitle:
      body.outingTypeTitle,

    date: body.date,
    startTime: body.startTime,
    duration: body.duration,

    interests:
      body.interests,

    neighbourhoods:
      body.neighbourhoods,

    budget: body.budget,

    transportation:
      body.transportation,

    alcoholFree:
      body.alcoholFree,

    partySize,
    maxTravelMinutes,
    mustIncludeTerms,
    avoidTerms
  };
}

function parseClockTime(
  value: string
): number | null {
  const match =
    value.match(
      /^(\d{2}):(\d{2})$/
    );

  if (!match) {
    return null;
  }

  const hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function parseDurationHours(
  value: string
): number {
  const match =
    value.match(/\d+/);

  if (!match) {
    return 3;
  }

  const hours =
    Number(match[0]);

  if (!Number.isFinite(hours)) {
    return 3;
  }

  return Math.min(
    Math.max(hours, 2),
    6
  );
}

function normalize(
  value: string
): string {
  return value
    .trim()
    .toLowerCase();
}

function getListingText(
  listing: Listing
): string {
  return [
    listing.name,
    listing.category,
    listing.subtitle,
    listing.description,
    listing.neighbourhood,
    listing.venueName ?? "",
    listing.address ?? "",
    listing.placeType ?? "",
    listing.ageLabel ?? "",
    listing.indoorOutdoor ?? "",
    ...(listing.searchTerms ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesAnyTerm(
  listing: Listing,
  terms: string[]
): boolean {
  if (
    terms.length ===
    0
  ) {
    return false;
  }

  const listingText =
    getListingText(
      listing
    );

  return terms.some(
    (term) =>
      listingText.includes(
        normalize(term)
      )
  );
}

function includesKeyword(
  text: string,
  keyword: string
): boolean {
  return text.includes(
    normalize(keyword)
  );
}

function getMatchedInterests(
  listing: Listing,
  interests: string[]
): string[] {
  const listingText =
    getListingText(listing);

  return interests.filter(
    (interest) => {
      const keywords =
        interestKeywords[
          interest
        ] ?? [interest];

      return keywords.some(
        (keyword) =>
          includesKeyword(
            listingText,
            keyword
          )
      );
    }
  );
}

function getDateIndex(
  dateKey: string
): number {
  const [
    year,
    month,
    day
  ] = dateKey
    .split("-")
    .map(Number);

  return Math.floor(
    Date.UTC(
      year,
      month - 1,
      day
    ) /
      86_400_000
  );
}

function getZonedDateParts(
  date: Date,
  timezone: string
): {
  dateKey: string;
  minutes: number;
} {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value ?? "1970";

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value ?? "01";

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value ?? "01";

  const hour =
    Number(
      parts.find(
        (part) =>
          part.type === "hour"
      )?.value ?? 0
    );

  const minute =
    Number(
      parts.find(
        (part) =>
          part.type === "minute"
      )?.value ?? 0
    );

  return {
    dateKey:
      `${year}-${month}-${day}`,

    minutes:
      hour * 60 + minute
  };
}

function getRelativeMinutes(
  dateValue: string,
  targetDate: string,
  timezone: string
): number {
  const zoned =
    getZonedDateParts(
      new Date(dateValue),
      timezone
    );

  const dayDifference =
    getDateIndex(
      zoned.dateKey
    ) -
    getDateIndex(
      targetDate
    );

  return (
    dayDifference * 1440 +
    zoned.minutes
  );
}

function normalizeWeeklyHours(
  value: unknown
): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed =
        JSON.parse(value);

      if (
        parsed &&
        typeof parsed ===
          "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<
          string,
          unknown
        >;
      }
    } catch {
      return null;
    }
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return null;
}

function parseHoursValue(
  value: unknown
): {
  recognized: boolean;
  intervals: {
    open: number;
    close: number;
  }[];
} {
  if (Array.isArray(value)) {
    const parsedItems =
      value.map(
        parseHoursValue
      );

    return {
      recognized:
        parsedItems.length === 0 ||
        parsedItems.some(
          (item) =>
            item.recognized
        ),

      intervals:
        parsedItems.flatMap(
          (item) =>
            item.intervals
        )
    };
  }

  if (
    !value ||
    typeof value !== "object"
  ) {
    return {
      recognized: false,
      intervals: []
    };
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  if (record.closed === true) {
    return {
      recognized: true,
      intervals: []
    };
  }

  if (
    typeof record.open !==
      "string" ||
    typeof record.close !==
      "string"
  ) {
    return {
      recognized: false,
      intervals: []
    };
  }

  const open =
    parseClockTime(
      record.open
    );

  const close =
    record.close === "24:00"
      ? 1440
      : parseClockTime(
          record.close
        );

  if (
    open === null ||
    close === null
  ) {
    return {
      recognized: false,
      intervals: []
    };
  }

  return {
    recognized: true,
    intervals: [
      {
        open,
        close
      }
    ]
  };
}

function getWeekday(
  dateKey: string
): string {
  const [
    year,
    month,
    day
  ] = dateKey
    .split("-")
    .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12
      )
    );

  return weekdayOrder[
    date.getUTCDay()
  ];
}

function getPreviousWeekday(
  weekday: string
): string {
  const index =
    weekdayOrder.indexOf(
      weekday as
        (typeof weekdayOrder)[number]
    );

  if (index < 0) {
    return "sunday";
  }

  return weekdayOrder[
    (index - 1 + 7) % 7
  ];
}

function getPlaceIntervals(
  listing: Listing,
  targetDate: string
): TimeInterval[] {
  const weeklyHours =
    normalizeWeeklyHours(
      listing.weeklyHours
    );

  if (!weeklyHours) {
    return [];
  }

  const weekday =
    getWeekday(targetDate);

  const previousWeekday =
    getPreviousWeekday(
      weekday
    );

  const currentDay =
    parseHoursValue(
      weeklyHours[weekday]
    );

  const previousDay =
    parseHoursValue(
      weeklyHours[
        previousWeekday
      ]
    );

  const intervals:
    TimeInterval[] = [];

  for (
    const interval
    of currentDay.intervals
  ) {
    if (
      interval.close >
      interval.open
    ) {
      intervals.push({
        start:
          interval.open,

        end:
          interval.close
      });
    } else {
      intervals.push({
        start:
          interval.open,

        end:
          interval.close +
          1440
      });
    }
  }

  for (
    const interval
    of previousDay.intervals
  ) {
    if (
      interval.close <=
      interval.open
    ) {
      intervals.push({
        start:
          interval.open -
          1440,

        end:
          interval.close
      });
    }
  }

  return intervals;
}

function getEventIntervals(
  listing: Listing,
  targetDate: string
): {
  intervals: TimeInterval[];
  fixedStart: number;
} | null {
  if (!listing.startAt) {
    return null;
  }

  const timezone =
    listing.timezone ||
    WINNIPEG_TIMEZONE;

  const start =
    getRelativeMinutes(
      listing.startAt,
      targetDate,
      timezone
    );

  const end =
    listing.endAt
      ? getRelativeMinutes(
          listing.endAt,
          targetDate,
          timezone
        )
      : start + 120;

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start
  ) {
    return null;
  }

  return {
    intervals: [
      {
        start,
        end
      }
    ],

    fixedStart: start
  };
}

function getEstimatedCost(
  listing: Listing
): number | null {
  if (
    listing.type === "event"
  ) {
    if (
      listing.maximumPriceCad !==
      undefined &&
      listing.maximumPriceCad !==
      null
    ) {
      return listing.maximumPriceCad;
    }

    if (
      listing.minimumPriceCad !==
      undefined &&
      listing.minimumPriceCad !==
      null
    ) {
      return listing.minimumPriceCad;
    }

    if (
      listing.price
        .toLowerCase()
        .includes("free")
    ) {
      return 0;
    }

    return null;
  }

  switch (
    listing.priceLevel
  ) {
    case 1:
      return 15;

    case 2:
      return 30;

    case 3:
      return 60;

    case 4:
      return 100;

    default:
      return null;
  }
}

function getBudgetLimit(
  budget: BudgetPreference
): number | null {
  switch (budget) {
    case "free":
      return 0;

    case "under-40":
      return 40;

    case "under-80":
      return 80;

    default:
      return null;
  }
}

function isAlcoholFocused(
  listing: Listing
): boolean {
  const text =
    getListingText(listing);

  return (
    listing.placeType ===
      "bar_pub" ||
    listing.placeType ===
      "brewery" ||
    [
      "nightclub",
      "cocktail",
      "brewery",
      "bar",
      "nightlife"
    ].some(
      (keyword) =>
        text.includes(keyword)
    )
  );
}

function scoreListing(
  listing: Listing,
  draft: GenerateOutingRequest
): {
  score: number;
  matchedInterests: string[];
} {
  const text =
    getListingText(listing);

  const matchedInterests =
    getMatchedInterests(
      listing,
      draft.interests
    );

  let score =
    matchedInterests.length * 6;

  for (
    const term
    of draft.mustIncludeTerms
  ) {
    if (
      includesKeyword(
        text,
        term
      )
    ) {
      score += 10;
    }
  }

  const typeKeywords =
    outingTypeKeywords[
      draft.outingTypeId
    ] ?? [];

  for (
    const keyword
    of typeKeywords
  ) {
    if (
      includesKeyword(
        text,
        keyword
      )
    ) {
      score += 3;
    }
  }

  if (
    draft.neighbourhoods.length >
    0
  ) {
    const neighbourhoodMatches =
      draft.neighbourhoods.some(
        (neighbourhood) =>
          normalize(
            listing.neighbourhood
          ).includes(
            normalize(
              neighbourhood
            )
          )
      );

    score +=
      neighbourhoodMatches
        ? 8
        : -3;
  }

  if (
    listing.type === "event"
  ) {
    score += 4;
  }

  if (
    draft.outingTypeId ===
      "food-crawl"
  ) {
    score +=
      listing.type ===
      "restaurant"
        ? 10
        : -5;
  }

  if (
    draft.outingTypeId ===
      "date-night" &&
    listing.type ===
      "restaurant"
  ) {
    score += 4;
  }

  if (
    draft.outingTypeId ===
      "budget-night" &&
    getEstimatedCost(
      listing
    ) === 0
  ) {
    score += 10;
  }

  if (
    listing.rating &&
    listing.rating >= 4.5
  ) {
    score += 2;
  }

  if (
    listing.verification ===
      "official_source"
  ) {
    score += 3;
  }

  return {
    score,
    matchedInterests
  };
}

function intersectsWindow(
  interval: TimeInterval,
  windowStart: number,
  windowEnd: number
): boolean {
  return (
    interval.end >
      windowStart &&
    interval.start <
      windowEnd
  );
}

function isAvailableForSlot(
  candidate: Candidate,
  start: number,
  duration: number
): boolean {
  const end =
    start + duration;

  return candidate.intervals.some(
    (interval) =>
      start >= interval.start &&
      end <= interval.end
  );
}

function getEarliestAvailableStart(
  candidate: Candidate,
  earliestStart: number,
  duration: number,
  windowEnd: number
): number | null {
  for (
    const interval
    of candidate.intervals
  ) {
    const start =
      Math.max(
        earliestStart,
        interval.start
      );

    if (
      start + duration <=
        interval.end &&
      start + duration <=
        windowEnd
    ) {
      return start;
    }
  }

  return null;
}

function toRadians(
  value: number
): number {
  return (
    value *
    Math.PI /
    180
  );
}

function getDistanceKm(
  first: Listing,
  second: Listing
): number | null {
  if (
    first.latitude ===
      undefined ||
    first.longitude ===
      undefined ||
    second.latitude ===
      undefined ||
    second.longitude ===
      undefined
  ) {
    return null;
  }

  const earthRadiusKm =
    6371;

  const latitudeDifference =
    toRadians(
      second.latitude -
      first.latitude
    );

  const longitudeDifference =
    toRadians(
      second.longitude -
      first.longitude
    );

  const firstLatitude =
    toRadians(
      first.latitude
    );

  const secondLatitude =
    toRadians(
      second.latitude
    );

  const calculation =
    Math.sin(
      latitudeDifference / 2
    ) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(
        longitudeDifference / 2
      ) ** 2;

  const angle =
    2 *
    Math.atan2(
      Math.sqrt(calculation),
      Math.sqrt(
        1 - calculation
      )
    );

  return earthRadiusKm * angle;
}

function getTravelMinutes(
  first: Listing,
  second: Listing,
  transportation: string
): number {
  const distance =
    getDistanceKm(
      first,
      second
    );

  if (distance === null) {
    return 20;
  }

  const normalizedMode =
    normalize(
      transportation
    );

  let speedKmPerHour =
    18;

  let fixedBuffer =
    8;

  if (
    normalizedMode ===
    "walking"
  ) {
    speedKmPerHour = 4.5;
    fixedBuffer = 3;
  }

  if (
    normalizedMode ===
      "driving" ||
    normalizedMode ===
      "rideshare"
  ) {
    speedKmPerHour = 30;
    fixedBuffer = 8;
  }

  return Math.max(
    5,
    Math.ceil(
      distance /
        speedKmPerHour *
        60 +
        fixedBuffer
    )
  );
}

function fitsTransportation(
  first: Listing,
  second: Listing,
  transportation: string,
  maxTravelMinutes: number
): boolean {
  if (
    getTravelMinutes(
      first,
      second,
      transportation
    ) >
    maxTravelMinutes
  ) {
    return false;
  }

  const distance =
    getDistanceKm(
      first,
      second
    );

  if (distance === null) {
    return true;
  }

  const mode =
    normalize(
      transportation
    );

  if (mode === "walking") {
    return distance <= 3;
  }

  if (mode === "transit") {
    return distance <= 15;
  }

  return distance <= 30;
}

function canAffordCandidate(
  currentCost: number,
  candidate: Candidate,
  budgetLimit: number | null
): boolean {
  if (
    budgetLimit === null ||
    candidate.estimatedCostCad ===
      null
  ) {
    return true;
  }

  return (
    currentCost +
      candidate.estimatedCostCad <=
    budgetLimit
  );
}

function formatMinutes(
  totalMinutes: number
): string {
  const normalizedMinutes =
    ((totalMinutes % 1440) +
      1440) %
    1440;

  const hour24 =
    Math.floor(
      normalizedMinutes / 60
    );

  const minute =
    normalizedMinutes % 60;

  const period =
    hour24 >= 12
      ? "PM"
      : "AM";

  const hour12 =
    hour24 % 12 || 12;

  return `${hour12}:${String(
    minute
  ).padStart(2, "0")} ${period}`;
}

function getStopReason(
  candidate: Candidate,
  draft: GenerateOutingRequest
): string {
  if (
    candidate.matchedInterests.length >
    0
  ) {
    return `Matches ${candidate.matchedInterests
      .slice(0, 2)
      .join(
        " and "
      )} and fits your selected time.`;
  }

  if (
    draft.neighbourhoods.some(
      (neighbourhood) =>
        normalize(
          candidate.listing
            .neighbourhood
        ).includes(
          normalize(
            neighbourhood
          )
        )
    )
  ) {
    return `Fits your preferred area and is available during the outing.`;
  }

  if (
    candidate.listing.type ===
    "event"
  ) {
    return `A verified Winnipeg event happening during your outing window.`;
  }

  return `Open during your selected time and compatible with the rest of the route.`;
}

function chooseBestCandidate(
  candidates: Candidate[],
  usedKeys: Set<string>,
  currentCost: number,
  budgetLimit: number | null,
  transportation: string,
  maxTravelMinutes: number,
  previousListing?: Listing
): Candidate[] {
  return candidates
    .filter(
      (candidate) => {
        const key =
          `${candidate.listing.type}-${candidate.listing.id}`;

        if (
          usedKeys.has(key)
        ) {
          return false;
        }

        if (
          !canAffordCandidate(
            currentCost,
            candidate,
            budgetLimit
          )
        ) {
          return false;
        }

        if (
          previousListing &&
          !fitsTransportation(
            previousListing,
            candidate.listing,
            transportation,
            maxTravelMinutes
          )
        ) {
          return false;
        }

        return true;
      }
    )
    .sort(
      (first, second) =>
        second.score -
        first.score
    );
}

function buildPlanAroundEvent(
  eventCandidate: Candidate,
  placeCandidates: Candidate[],
  draft: GenerateOutingRequest,
  windowStart: number,
  windowEnd: number,
  budgetLimit: number | null
): ProposedStop[] {
  const eventStart =
    Math.max(
      eventCandidate.fixedStart ??
        windowStart,
      windowStart
    );

  const eventInterval =
    eventCandidate.intervals.find(
      (interval) =>
        eventStart >=
          interval.start &&
        eventStart <
          interval.end
    );

  if (!eventInterval) {
    return [];
  }

  const eventDuration =
    Math.max(
      45,
      Math.min(
        120,
        eventInterval.end -
          eventStart,
        windowEnd -
          eventStart
      )
    );

  if (
    eventStart +
      eventDuration >
    windowEnd
  ) {
    return [];
  }

  const stops:
    ProposedStop[] = [];

  const usedKeys =
    new Set<string>();

  let currentCost = 0;

  const eventKey =
    `${eventCandidate.listing.type}-${eventCandidate.listing.id}`;

  const sortedPlaces =
    [...placeCandidates].sort(
      (first, second) =>
        second.score -
        first.score
    );

  for (
    const place
    of sortedPlaces
  ) {
    if (
      !canAffordCandidate(
        currentCost,
        place,
        budgetLimit
      ) ||
      !fitsTransportation(
        place.listing,
        eventCandidate.listing,
        draft.transportation,
        draft.maxTravelMinutes
      )
    ) {
      continue;
    }

    const travelMinutes =
      getTravelMinutes(
        place.listing,
        eventCandidate.listing,
        draft.transportation
      );

    const placeEnd =
      eventStart -
      travelMinutes;

    const placeStart =
      placeEnd - 60;

    if (
      placeStart <
        windowStart ||
      !isAvailableForSlot(
        place,
        placeStart,
        60
      )
    ) {
      continue;
    }

    stops.push({
      candidate: place,
      start: placeStart,
      end: placeEnd,
      travelFromPreviousMinutes:
        null
    });

    usedKeys.add(
      `${place.listing.type}-${place.listing.id}`
    );

    currentCost +=
      place.estimatedCostCad ??
      0;

    break;
  }

  stops.push({
    candidate:
      eventCandidate,

    start:
      eventStart,

    end:
      eventStart +
      eventDuration,

    travelFromPreviousMinutes:
      stops.length > 0
        ? getTravelMinutes(
            stops[
              stops.length - 1
            ].candidate.listing,
            eventCandidate.listing,
            draft.transportation
          )
        : null
  });

  usedKeys.add(eventKey);

  currentCost +=
    eventCandidate.estimatedCostCad ??
    0;

  const eventEnd =
    eventStart +
    eventDuration;

  for (
    const place
    of sortedPlaces
  ) {
    const key =
      `${place.listing.type}-${place.listing.id}`;

    if (
      usedKeys.has(key) ||
      !canAffordCandidate(
        currentCost,
        place,
        budgetLimit
      ) ||
      !fitsTransportation(
        eventCandidate.listing,
        place.listing,
        draft.transportation,
        draft.maxTravelMinutes
      )
    ) {
      continue;
    }

    const travelMinutes =
      getTravelMinutes(
        eventCandidate.listing,
        place.listing,
        draft.transportation
      );

    const placeStart =
      eventEnd +
      travelMinutes;

    if (
      !isAvailableForSlot(
        place,
        placeStart,
        60
      ) ||
      placeStart + 60 >
        windowEnd
    ) {
      continue;
    }

    stops.push({
      candidate: place,
      start: placeStart,
      end: placeStart + 60,
      travelFromPreviousMinutes:
        travelMinutes
    });

    break;
  }

  return stops
    .sort(
      (first, second) =>
        first.start -
        second.start
    )
    .slice(0, 3);
}

function buildFlexiblePlan(
  candidates: Candidate[],
  draft: GenerateOutingRequest,
  windowStart: number,
  windowEnd: number,
  budgetLimit: number | null
): ProposedStop[] {
  const stops:
    ProposedStop[] = [];

  const usedKeys =
    new Set<string>();

  let currentCost = 0;
  let currentTime =
    windowStart;

  let previousListing:
    Listing | undefined;

  while (
    stops.length < 3 &&
    currentTime + 45 <=
      windowEnd
  ) {
    const available =
      chooseBestCandidate(
        candidates,
        usedKeys,
        currentCost,
        budgetLimit,
        draft.transportation,
        draft.maxTravelMinutes,
        previousListing
      );

    let selected:
      Candidate | null = null;

    let selectedStart:
      number | null = null;

    let selectedTravel:
      number | null = null;

    for (
      const candidate
      of available
    ) {
      const travelMinutes =
        previousListing
          ? getTravelMinutes(
              previousListing,
              candidate.listing,
              draft.transportation
            )
          : 0;

      if (
        previousListing &&
        !fitsTransportation(
          previousListing,
          candidate.listing,
          draft.transportation,
          draft.maxTravelMinutes
        )
      ) {
        continue;
      }

      const earliestStart =
        currentTime +
        travelMinutes;

      const stopDuration =
        candidate.listing.type ===
        "event"
          ? 90
          : 60;

      const possibleStart =
        candidate.fixedStart !==
        undefined
          ? candidate.fixedStart
          : getEarliestAvailableStart(
              candidate,
              earliestStart,
              stopDuration,
              windowEnd
            );

      if (
        possibleStart === null ||
        possibleStart <
          earliestStart ||
        !isAvailableForSlot(
          candidate,
          possibleStart,
          stopDuration
        ) ||
        possibleStart +
          stopDuration >
          windowEnd
      ) {
        continue;
      }

      selected = candidate;
      selectedStart =
        possibleStart;

      selectedTravel =
        previousListing
          ? travelMinutes
          : null;

      break;
    }

    if (
      !selected ||
      selectedStart === null
    ) {
      break;
    }

    const stopDuration =
      selected.listing.type ===
      "event"
        ? 90
        : 60;

    stops.push({
      candidate: selected,
      start: selectedStart,
      end:
        selectedStart +
        stopDuration,

      travelFromPreviousMinutes:
        selectedTravel
    });

    usedKeys.add(
      `${selected.listing.type}-${selected.listing.id}`
    );

    currentCost +=
      selected.estimatedCostCad ??
      0;

    currentTime =
      selectedStart +
      stopDuration;

    previousListing =
      selected.listing;
  }

  return stops;
}

function createCandidate(
  listing: Listing,
  draft: GenerateOutingRequest,
  windowStart: number,
  windowEnd: number
): Candidate | null {
  if (
    !trustedStatuses.has(
      listing.verification
    )
  ) {
    return null;
  }

  if (
    draft.alcoholFree &&
    isAlcoholFocused(
      listing
    )
  ) {
    return null;
  }

  if (
    matchesAnyTerm(
      listing,
      draft.avoidTerms
    )
  ) {
    return null;
  }

  const availability =
    listing.type === "event"
      ? getEventIntervals(
          listing,
          draft.date
        )
      : {
          intervals:
            getPlaceIntervals(
              listing,
              draft.date
            ),

          fixedStart:
            undefined
        };

  if (
    !availability ||
    !availability.intervals.some(
      (interval) =>
        intersectsWindow(
          interval,
          windowStart,
          windowEnd
        )
    )
  ) {
    return null;
  }

  const {
    score,
    matchedInterests
  } = scoreListing(
    listing,
    draft
  );

  return {
    listing,
    score,
    intervals:
      availability.intervals,

    fixedStart:
      availability.fixedStart,

    estimatedCostCad:
      getEstimatedCost(
        listing
      ),

    matchedInterests
  };
}

function getPlanTitle(
  draft: GenerateOutingRequest,
  stops: ProposedStop[]
): string {
  const neighbourhoods =
    Array.from(
      new Set(
        stops.map(
          (stop) =>
            stop.candidate
              .listing
              .neighbourhood
        )
      )
    ).filter(Boolean);

  if (
    neighbourhoods.length === 1
  ) {
    return `${draft.outingTypeTitle} in ${neighbourhoods[0]}`;
  }

  return `${draft.outingTypeTitle} in Winnipeg`;
}

export async function POST(
  request: Request
) {
  let rawBody: unknown;

  try {
    rawBody =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "The outing request was not valid JSON."
      },
      {
        status: 400
      }
    );
  }

  const draft =
    parseRequest(rawBody);

  if (!draft) {
    return NextResponse.json(
      {
        error:
          "The outing setup is incomplete or invalid."
      },
      {
        status: 400
      }
    );
  }

  const startMinutes =
    parseClockTime(
      draft.startTime
    );

  if (
    startMinutes === null
  ) {
    return NextResponse.json(
      {
        error:
          "The selected start time is invalid."
      },
      {
        status: 400
      }
    );
  }

  const durationHours =
    parseDurationHours(
      draft.duration
    );

  const windowStart =
    startMinutes;

  const windowEnd =
    startMinutes +
    durationHours * 60;

  const [
    events,
    places
  ] = await Promise.all([
    getPublishedEventListings(
      100
    ),

    getPublishedPlaceListings(
      100
    )
  ]);

  const candidates = [
    ...events,
    ...places
  ]
    .map(
      (listing) =>
        createCandidate(
          listing,
          draft,
          windowStart,
          windowEnd
        )
    )
    .filter(
      (
        candidate
      ): candidate is Candidate =>
        candidate !== null
    )
    .sort(
      (first, second) =>
        second.score -
        first.score
    );

  const eventCandidates =
    candidates.filter(
      (candidate) =>
        candidate.listing.type ===
        "event"
    );

  const placeCandidates =
    candidates.filter(
      (candidate) =>
        candidate.listing.type ===
        "restaurant"
    );

  const budgetLimit =
    getBudgetLimit(
      draft.budget
    );

  const shouldUseEventAnchor =
    draft.outingTypeId !==
      "food-crawl" &&
    eventCandidates.length >
      0;

  let proposedStops:
    ProposedStop[] = [];

  if (shouldUseEventAnchor) {
    for (
      const eventCandidate
      of eventCandidates
    ) {
      if (
        !canAffordCandidate(
          0,
          eventCandidate,
          budgetLimit
        )
      ) {
        continue;
      }

      proposedStops =
        buildPlanAroundEvent(
          eventCandidate,
          placeCandidates,
          draft,
          windowStart,
          windowEnd,
          budgetLimit
        );

      if (
        proposedStops.length >
        0
      ) {
        break;
      }
    }
  }

  if (
    proposedStops.length === 0
  ) {
    proposedStops =
      buildFlexiblePlan(
        candidates,
        draft,
        windowStart,
        windowEnd,
        budgetLimit
      );
  }

  const stops:
    PlannedStop[] =
      proposedStops.map(
        (stop, index) => ({
          order:
            index + 1,

          startTime:
            formatMinutes(
              stop.start
            ),

          endTime:
            formatMinutes(
              stop.end
            ),

          durationMinutes:
            stop.end -
            stop.start,

          travelFromPreviousMinutes:
            stop.travelFromPreviousMinutes,

          estimatedCostCad:
            stop.candidate
              .estimatedCostCad,

          reason:
            getStopReason(
              stop.candidate,
              draft
            ),

          listing:
            stop.candidate
              .listing
        })
      );

  const estimatedCosts =
    stops
      .map(
        (stop) =>
          stop.estimatedCostCad
      )
      .filter(
        (
          value
        ): value is number =>
          value !== null
      );

  const estimatedTotalCad =
    estimatedCosts.length > 0
      ? estimatedCosts.reduce(
          (
            total,
            value
          ) =>
            total + value,
          0
        )
      : null;

  const warnings:
    string[] = [];

  if (stops.length === 0) {
    warnings.push(
      "No verified listings matched the selected date, time, hours, and preferences."
    );
  } else if (
    stops.length < 3
  ) {
    warnings.push(
      `Only ${stops.length} verified ${
        stops.length === 1
          ? "stop was"
          : "stops were"
      } available without inventing or using unconfirmed information.`
    );
  }

  if (
    stops.some(
      (stop) =>
        stop.estimatedCostCad ===
        null
    )
  ) {
    warnings.push(
      "At least one listing does not have a confirmed numeric price, so the total is incomplete."
    );
  }

  const combinedStopText =
    stops
      .map(
        (stop) =>
          getListingText(
            stop.listing
          )
      )
      .join(" ");

  const missingMustIncludeTerms =
    draft.mustIncludeTerms.filter(
      (term) =>
        !combinedStopText.includes(
          normalize(term)
        )
    );

  if (
    missingMustIncludeTerms.length >
    0
  ) {
    warnings.push(
      `Venture could not confidently include: ${missingMustIncludeTerms.join(", ")}.`
    );
  }

  return NextResponse.json({
    planId:
      crypto.randomUUID(),

    generatedAt:
      new Date().toISOString(),

    title:
      getPlanTitle(
        draft,
        proposedStops
      ),

    date:
      draft.date,

    requestedStartTime:
      draft.startTime,

    requestedDuration:
      draft.duration,

    transportation:
      draft.transportation,

    alcoholFree:
      draft.alcoholFree,

    partySize:
      draft.partySize,

    maxTravelMinutes:
      draft.maxTravelMinutes,

    mustIncludeTerms:
      draft.mustIncludeTerms,

    avoidTerms:
      draft.avoidTerms,

    estimatedTotalCad,

    estimatedGroupTotalCad:
      estimatedTotalCad ===
      null
        ? null
        : estimatedTotalCad *
          draft.partySize,

    stops,
    warnings,

    candidateCount:
      candidates.length
  });
}