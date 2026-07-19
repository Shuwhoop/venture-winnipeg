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
  GeneratedOutingPlan,
  GeneratedOutingStop
} from "@/lib/saved-outings";

import type {
  Listing,
  VerificationStatus
} from "@/lib/types";

const WINNIPEG_TIMEZONE =
  "America/Winnipeg";

const trustedStatuses =
  new Set<VerificationStatus>([
    "official_source",
    "verified_venture",
    "verified_business"
  ]);

const weekdayOrder = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
] as const;

type OutingDraft = {
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
  createdAt?: string;
};

type ReplaceStopRequest = {
  draft: OutingDraft;
  plan: GeneratedOutingPlan;
  stopOrder: number;
  excludedListingKeys: string[];
};

type TimeInterval = {
  start: number;
  end: number;
};

type ReplacementCandidate = {
  listing: Listing;
  score: number;
  estimatedCostCad: number | null;
  matchedInterests: string[];
};

const interestKeywords:
  Record<string, string[]> = {
    Food: [
      "food",
      "restaurant",
      "cafe",
      "bakery",
      "dessert",
      "market",
      "dining",
      "cuisine"
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
      "sports",
      "sport",
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

function getListingKey(
  listing: Listing
): string {
  return `${listing.type}-${listing.id}`;
}

function normalize(
  value: string
): string {
  return value
    .trim()
    .toLowerCase();
}

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
): ReplaceStopRequest | null {
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

  const draft =
    body.draft as
      | Record<string, unknown>
      | undefined;

  const plan =
    body.plan as
      | GeneratedOutingPlan
      | undefined;

  const partySize =
    typeof draft?.partySize ===
      "number" &&
    Number.isFinite(
      draft.partySize
    )
      ? Math.min(
          12,
          Math.max(
            1,
            Math.round(
              draft.partySize
            )
          )
        )
      : 1;

  const maxTravelMinutes =
    typeof draft?.maxTravelMinutes ===
      "number" &&
    Number.isFinite(
      draft.maxTravelMinutes
    )
      ? Math.min(
          90,
          Math.max(
            5,
            Math.round(
              draft.maxTravelMinutes
            )
          )
        )
      : 20;

  const mustIncludeTerms =
    draft?.mustIncludeTerms ===
      undefined
      ? []
      : isStringArray(
          draft.mustIncludeTerms
        )
        ? draft.mustIncludeTerms
            .map(
              (term) =>
                term.trim()
            )
            .filter(Boolean)
            .slice(0, 8)
        : null;

  const avoidTerms =
    draft?.avoidTerms ===
      undefined
      ? []
      : isStringArray(
          draft.avoidTerms
        )
        ? draft.avoidTerms
            .map(
              (term) =>
                term.trim()
            )
            .filter(Boolean)
            .slice(0, 8)
        : null;

  if (
    !draft ||
    typeof draft !== "object" ||
    !plan ||
    typeof plan !== "object" ||
    !Array.isArray(plan.stops) ||
    typeof body.stopOrder !==
      "number"
  ) {
    return null;
  }

  if (
    typeof draft.outingTypeId !==
      "string" ||
    typeof draft.outingTypeTitle !==
      "string" ||
    typeof draft.date !== "string" ||
    typeof draft.startTime !==
      "string" ||
    typeof draft.duration !==
      "string" ||
    !isStringArray(
      draft.interests
    ) ||
    !isStringArray(
      draft.neighbourhoods
    ) ||
    !isBudgetPreference(
      draft.budget
    ) ||
    typeof draft.transportation !==
      "string" ||
    typeof draft.alcoholFree !==
      "boolean" ||
    mustIncludeTerms ===
      null ||
    avoidTerms ===
      null
  ) {
    return null;
  }

  const excludedListingKeys =
    body.excludedListingKeys ===
      undefined
      ? []
      : isStringArray(
          body.excludedListingKeys
        )
        ? body.excludedListingKeys
        : null;

  if (!excludedListingKeys) {
    return null;
  }

  return {
    draft: {
      outingTypeId:
        draft.outingTypeId,

      outingTypeTitle:
        draft.outingTypeTitle,

      date:
        draft.date,

      startTime:
        draft.startTime,

      duration:
        draft.duration,

      interests:
        draft.interests,

      neighbourhoods:
        draft.neighbourhoods,

      budget:
        draft.budget,

      transportation:
        draft.transportation,

      alcoholFree:
        draft.alcoholFree,

      partySize,
      maxTravelMinutes,
      mustIncludeTerms,
      avoidTerms,

      createdAt:
        typeof draft.createdAt ===
        "string"
          ? draft.createdAt
          : undefined
    },

    plan,
    stopOrder:
      body.stopOrder,

    excludedListingKeys
  };
}

function parseClockTime(
  value: string
): number | null {
  const match =
    value.match(
      /^(\d{1,2}):(\d{2})$/
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

function parseDisplayTime(
  value: string
): number | null {
  const match =
    value
      .trim()
      .match(
        /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
      );

  if (!match) {
    return null;
  }

  let hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  const period =
    match[3].toUpperCase();

  if (
    hour < 1 ||
    hour > 12 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  if (hour === 12) {
    hour = 0;
  }

  if (period === "PM") {
    hour += 12;
  }

  return hour * 60 + minute;
}

function getNormalizedStopTimes(
  stops: GeneratedOutingStop[]
): Map<
  number,
  {
    start: number;
    end: number;
  }
> {
  const result =
    new Map<
      number,
      {
        start: number;
        end: number;
      }
    >();

  let previousEnd:
    number | null = null;

  const orderedStops =
    [...stops].sort(
      (first, second) =>
        first.order -
        second.order
    );

  for (
    const stop
    of orderedStops
  ) {
    const parsedStart =
      parseDisplayTime(
        stop.startTime
      );

    const parsedEnd =
      parseDisplayTime(
        stop.endTime
      );

    if (
      parsedStart === null ||
      parsedEnd === null
    ) {
      continue;
    }

    let start =
      parsedStart;

    let end =
      parsedEnd;

    if (
      previousEnd !== null
    ) {
      while (
        start <
        previousEnd
      ) {
        start += 1440;
      }
    }

    while (end <= start) {
      end += 1440;
    }

    result.set(
      stop.order,
      {
        start,
        end
      }
    );

    previousEnd = end;
  }

  return result;
}

function normalizeWeeklyHours(
  value: unknown
): Record<string, unknown> | null {
  if (
    typeof value === "string"
  ) {
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
    const parsed =
      value.map(
        parseHoursValue
      );

    return {
      recognized:
        parsed.length === 0 ||
        parsed.some(
          (item) =>
            item.recognized
        ),

      intervals:
        parsed.flatMap(
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
    record.close ===
      "24:00"
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
  dateKey: string
): TimeInterval[] {
  const weeklyHours =
    normalizeWeeklyHours(
      listing.weeklyHours
    );

  if (!weeklyHours) {
    return [];
  }

  const weekday =
    getWeekday(dateKey);

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
  value: string,
  targetDate: string,
  timezone: string
): number {
  const zoned =
    getZonedDateParts(
      new Date(value),
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

function getEventIntervals(
  listing: Listing,
  dateKey: string
): TimeInterval[] {
  if (!listing.startAt) {
    return [];
  }

  const timezone =
    listing.timezone ||
    WINNIPEG_TIMEZONE;

  const start =
    getRelativeMinutes(
      listing.startAt,
      dateKey,
      timezone
    );

  const end =
    listing.endAt
      ? getRelativeMinutes(
          listing.endAt,
          dateKey,
          timezone
        )
      : start + 120;

  if (
    end <= start
  ) {
    return [];
  }

  return [
    {
      start,
      end
    }
  ];
}

function isAvailableForSlot(
  listing: Listing,
  dateKey: string,
  start: number,
  end: number
): boolean {
  const intervals =
    listing.type === "event"
      ? getEventIntervals(
          listing,
          dateKey
        )
      : getPlaceIntervals(
          listing,
          dateKey
        );

  return intervals.some(
    (interval) =>
      start >= interval.start &&
      end <= interval.end
  );
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

function getMatchedInterests(
  listing: Listing,
  interests: string[]
): string[] {
  const text =
    getListingText(listing);

  return interests.filter(
    (interest) => {
      const keywords =
        interestKeywords[
          interest
        ] ?? [interest];

      return keywords.some(
        (keyword) =>
          text.includes(
            normalize(keyword)
          )
      );
    }
  );
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

function getListingKind(
  listing: Listing
):
  | "food"
  | "event"
  | "drinks" {
  if (
    listing.type === "event"
  ) {
    return "event";
  }

  return isAlcoholFocused(
    listing
  )
    ? "drinks"
    : "food";
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

  const text =
    getListingText(
      listing
    );

  return terms.some(
    (term) =>
      text.includes(
        normalize(term)
      )
  );
}

function scoreListing(
  listing: Listing,
  targetListing: Listing,
  draft: OutingDraft
): {
  score: number;
  matchedInterests: string[];
} {
  const text =
    getListingText(
      listing
    );

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
      text.includes(
        normalize(term)
      )
    ) {
      score += 10;
    }
  }

  if (
    listing.type ===
    targetListing.type
  ) {
    score += 12;
  }

  if (
    normalize(
      listing.category
    ) ===
    normalize(
      targetListing.category
    )
  ) {
    score += 6;
  }

  if (
    draft.neighbourhoods.some(
      (neighbourhood) =>
        normalize(
          listing.neighbourhood
        ).includes(
          normalize(
            neighbourhood
          )
        )
    )
  ) {
    score += 8;
  }

  if (
    normalize(
      listing.neighbourhood
    ) ===
    normalize(
      targetListing.neighbourhood
    )
  ) {
    score += 4;
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

  const mode =
    normalize(
      transportation
    );

  let speedKmPerHour =
    18;

  let fixedBuffer =
    8;

  if (mode === "walking") {
    speedKmPerHour = 4.5;
    fixedBuffer = 3;
  }

  if (
    mode === "driving" ||
    mode === "rideshare"
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

function createReason(
  candidate: ReplacementCandidate,
  targetListing: Listing
): string {
  if (
    candidate.matchedInterests.length >
    0
  ) {
    return `Replacement matches ${candidate.matchedInterests
      .slice(0, 2)
      .join(
        " and "
      )} while keeping the same time slot.`;
  }

  if (
    candidate.listing.type ===
    targetListing.type
  ) {
    return `A verified alternative that fits the same time slot and outing route.`;
  }

  return `A verified nearby alternative that fits the available time and travel window.`;
}


type AddStopKind =
  | "food"
  | "event"
  | "drinks";

type AddStopRequest = {
  draft: OutingDraft;
  plan: GeneratedOutingPlan;
  requestedKind: AddStopKind;
  excludedListingKeys: string[];
};

type AddCandidate = {
  listing: Listing;
  start: number;
  end: number;
  insertionIndex: number;
  score: number;
  estimatedCostCad:
    | number
    | null;
  matchedInterests: string[];
};

function parseAddRequest(
  value: unknown
): AddStopRequest | null {
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

  const requestedKind =
    body.requestedKind;

  if (
    requestedKind !== "food" &&
    requestedKind !== "event" &&
    requestedKind !== "drinks"
  ) {
    return null;
  }

  const base =
    parseRequest({
      ...body,
      stopOrder: 1
    });

  if (!base) {
    return null;
  }

  return {
    draft: base.draft,
    plan: base.plan,
    requestedKind,
    excludedListingKeys:
      base.excludedListingKeys
  };
}

function parseDurationHours(
  value: string
): number {
  const numeric =
    Number.parseFloat(value);

  if (
    Number.isFinite(numeric) &&
    numeric > 0
  ) {
    return Math.min(
      8,
      Math.max(
        1,
        numeric
      )
    );
  }

  return value.includes("5+")
    ? 6
    : 3;
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

function incrementMix(
  mix:
    | {
        food: number;
        events: number;
        drinks: number;
      }
    | undefined,
  kind: AddStopKind
): {
  food: number;
  events: number;
  drinks: number;
} {
  const next = {
    food:
      mix?.food ?? 0,
    events:
      mix?.events ?? 0,
    drinks:
      mix?.drinks ?? 0
  };

  if (kind === "event") {
    next.events += 1;
  } else {
    next[kind] += 1;
  }

  return next;
}

function getCandidateIntervals(
  listing: Listing,
  date: string
): TimeInterval[] {
  return listing.type === "event"
    ? getEventIntervals(
        listing,
        date
      )
    : getPlaceIntervals(
        listing,
        date
      );
}

function findSlotForListing(
  listing: Listing,
  orderedStops:
    GeneratedOutingStop[],
  normalizedTimes:
    Map<
      number,
      {
        start: number;
        end: number;
      }
    >,
  draft: OutingDraft,
  windowStart: number,
  windowEnd: number
): {
  start: number;
  end: number;
  insertionIndex: number;
  travelPenalty: number;
} | null {
  const intervals =
    getCandidateIntervals(
      listing,
      draft.date
    );

  for (
    let insertionIndex = 0;
    insertionIndex <=
      orderedStops.length;
    insertionIndex += 1
  ) {
    const previousStop =
      insertionIndex > 0
        ? orderedStops[
            insertionIndex - 1
          ]
        : null;

    const nextStop =
      insertionIndex <
      orderedStops.length
        ? orderedStops[
            insertionIndex
          ]
        : null;

    const previousTimes =
      previousStop
        ? normalizedTimes.get(
            previousStop.order
          )
        : null;

    const nextTimes =
      nextStop
        ? normalizedTimes.get(
            nextStop.order
          )
        : null;

    if (
      previousStop &&
      !fitsTransportation(
        previousStop.listing,
        listing,
        draft.transportation,
        draft.maxTravelMinutes
      )
    ) {
      continue;
    }

    if (
      nextStop &&
      !fitsTransportation(
        listing,
        nextStop.listing,
        draft.transportation,
        draft.maxTravelMinutes
      )
    ) {
      continue;
    }

    const previousTravel =
      previousStop
        ? getTravelMinutes(
            previousStop.listing,
            listing,
            draft.transportation
          )
        : 0;

    const nextTravel =
      nextStop
        ? getTravelMinutes(
            listing,
            nextStop.listing,
            draft.transportation
          )
        : 0;

    const earliest =
      previousTimes
        ? previousTimes.end +
          previousTravel
        : windowStart;

    const latestEnd =
      nextTimes
        ? nextTimes.start -
          nextTravel
        : windowEnd;

    if (
      latestEnd - earliest < 45
    ) {
      continue;
    }

    for (
      const interval
      of intervals
    ) {
      if (
        listing.type ===
        "event"
      ) {
        const start =
          interval.start;

        const duration =
          Math.min(
            120,
            interval.end -
              start,
            latestEnd -
              start
          );

        if (
          start >= earliest &&
          duration >= 45 &&
          start + duration <=
            latestEnd
        ) {
          return {
            start,
            end:
              start + duration,
            insertionIndex,
            travelPenalty:
              previousTravel +
              nextTravel
          };
        }

        continue;
      }

      const start =
        Math.max(
          earliest,
          interval.start
        );

      const duration = 60;

      if (
        start + duration <=
          interval.end &&
        start + duration <=
          latestEnd
      ) {
        return {
          start,
          end:
            start + duration,
          insertionIndex,
          travelPenalty:
            previousTravel +
            nextTravel
        };
      }
    }
  }

  return null;
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
          "The add-stop request was not valid JSON."
      },
      {
        status: 400
      }
    );
  }

  const parsed =
    parseAddRequest(
      rawBody
    );

  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "The add-stop request was incomplete."
      },
      {
        status: 400
      }
    );
  }

  const {
    draft,
    plan,
    requestedKind,
    excludedListingKeys
  } = parsed;

  if (
    plan.stops.length >= 5
  ) {
    return NextResponse.json(
      {
        error:
          "An outing can currently contain up to five stops."
      },
      {
        status: 400
      }
    );
  }

  if (
    requestedKind ===
      "drinks" &&
    draft.alcoholFree
  ) {
    return NextResponse.json(
      {
        error:
          "Drinks places cannot be added while the outing is alcohol-free."
      },
      {
        status: 400
      }
    );
  }

  const windowStart =
    parseClockTime(
      draft.startTime
    );

  if (
    windowStart === null
  ) {
    return NextResponse.json(
      {
        error:
          "The outing start time could not be read."
      },
      {
        status: 400
      }
    );
  }

  const windowEnd =
    windowStart +
    parseDurationHours(
      draft.duration
    ) * 60;

  const orderedStops =
    [...plan.stops].sort(
      (first, second) =>
        first.order -
        second.order
    );

  const normalizedTimes =
    getNormalizedStopTimes(
      orderedStops
    );

  const usedKeys =
    new Set<string>([
      ...orderedStops.map(
        (stop) =>
          getListingKey(
            stop.listing
          )
      ),
      ...excludedListingKeys
    ]);

  const budgetLimit =
    getBudgetLimit(
      draft.budget
    );

  const currentKnownCost =
    orderedStops.reduce(
      (
        total,
        stop
      ) =>
        total +
        (
          stop.estimatedCostCad ??
          0
        ),
      0
    );

  const [
    events,
    places
  ] = await Promise.all([
    getPublishedEventListings(
      180
    ),
    getPublishedPlaceListings(
      220
    )
  ]);

  const candidates:
    AddCandidate[] = [
      ...events,
      ...places
    ]
      .filter(
        (listing) => {
          if (
            usedKeys.has(
              getListingKey(
                listing
              )
            ) ||
            !trustedStatuses.has(
              listing.verification
            ) ||
            getListingKind(
              listing
            ) !== requestedKind ||
            (
              draft.alcoholFree &&
              isAlcoholFocused(
                listing
              )
            ) ||
            matchesAnyTerm(
              listing,
              draft.avoidTerms
            )
          ) {
            return false;
          }

          const estimatedCost =
            getEstimatedCost(
              listing
            );

          return !(
            budgetLimit !== null &&
            estimatedCost !== null &&
            currentKnownCost +
              estimatedCost >
              budgetLimit
          );
        }
      )
      .flatMap(
        (listing) => {
          const slot =
            findSlotForListing(
              listing,
              orderedStops,
              normalizedTimes,
              draft,
              windowStart,
              windowEnd
            );

          if (!slot) {
            return [];
          }

          const referenceListing =
            orderedStops[
              Math.max(
                0,
                Math.min(
                  orderedStops.length -
                    1,
                  slot.insertionIndex -
                    1
                )
              )
            ]?.listing ??
            listing;

          const {
            score,
            matchedInterests
          } = scoreListing(
            listing,
            referenceListing,
            draft
          );

          return [
            {
              listing,
              start:
                slot.start,
              end:
                slot.end,
              insertionIndex:
                slot.insertionIndex,
              score:
                score -
                slot.travelPenalty *
                  0.2,
              estimatedCostCad:
                getEstimatedCost(
                  listing
                ),
              matchedInterests
            }
          ];
        }
      )
      .sort(
        (first, second) =>
          second.score -
          first.score
      );

  const selected =
    candidates[0];

  if (!selected) {
    return NextResponse.json(
      {
        error:
          `No verified ${requestedKind} stop fits the remaining time, budget, and travel gaps.`
      },
      {
        status: 404
      }
    );
  }

  const insertedStop:
    GeneratedOutingStop = {
      order:
        selected.insertionIndex +
        1,
      kind:
        requestedKind,
      startTime:
        formatMinutes(
          selected.start
        ),
      endTime:
        formatMinutes(
          selected.end
        ),
      durationMinutes:
        selected.end -
        selected.start,
      travelFromPreviousMinutes:
        null,
      estimatedCostCad:
        selected.estimatedCostCad,
      reason:
        selected.matchedInterests.length >
        0
          ? `Added as another ${requestedKind} stop and matched ${selected.matchedInterests
              .slice(0, 2)
              .join(" and ")}.`
          : `Added because you asked Venture for another ${requestedKind} stop.`,
      listing:
        selected.listing
    };

  const updatedStops = [
    ...orderedStops.slice(
      0,
      selected.insertionIndex
    ),
    insertedStop,
    ...orderedStops.slice(
      selected.insertionIndex
    )
  ].map(
    (stop, index, allStops) => ({
      ...stop,
      order:
        index + 1,
      travelFromPreviousMinutes:
        index === 0
          ? null
          : getTravelMinutes(
              allStops[
                index - 1
              ].listing,
              stop.listing,
              draft.transportation
            )
    })
  );

  const knownCosts =
    updatedStops
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
    knownCosts.length > 0
      ? knownCosts.reduce(
          (
            total,
            cost
          ) =>
            total + cost,
          0
        )
      : null;

  const warnings =
    plan.warnings.filter(
      (warning) =>
        !warning.startsWith(
          "At least one listing does not have a confirmed numeric price"
        )
    );

  if (
    updatedStops.some(
      (stop) =>
        stop.estimatedCostCad ===
        null
    )
  ) {
    warnings.push(
      "At least one listing does not have a confirmed numeric price, so the total is incomplete."
    );
  }

  const updatedPlan:
    GeneratedOutingPlan = {
      ...plan,
      planId:
        crypto.randomUUID(),
      generatedAt:
        new Date().toISOString(),
      estimatedTotalCad,
      estimatedGroupTotalCad:
        estimatedTotalCad ===
        null
          ? null
          : estimatedTotalCad *
            Math.max(
              1,
              draft.partySize
            ),
      requestedMix:
        incrementMix(
          plan.requestedMix,
          requestedKind
        ),
      actualMix:
        incrementMix(
          plan.actualMix,
          requestedKind
        ),
      stops:
        updatedStops,
      warnings:
        Array.from(
          new Set(warnings)
        ),
      candidateCount:
        candidates.length
    };

  return NextResponse.json({
    plan:
      updatedPlan,
    addedKind:
      requestedKind,
    addedListingKey:
      getListingKey(
        selected.listing
      ),
    candidateCount:
      candidates.length
  });
}
