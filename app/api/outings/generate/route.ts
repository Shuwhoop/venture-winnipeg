import { NextResponse } from "next/server";

import {
  recordServerBetaEvent
} from "@/lib/beta/server";

import {
  getPublishedEventListings
} from "@/lib/data/events";

import {
  getPublishedPlaceListings
} from "@/lib/data/places";

import type {
  BudgetPreference
} from "@/lib/profile-preferences";

import {
  neighbourhoodMatchesPreference
} from "@/lib/winnipeg-neighbourhoods";

import type {
  Listing,
  VerificationStatus
} from "@/lib/types";

const WINNIPEG_TIMEZONE =
  "America/Winnipeg";

const RECOMMENDATION_VERSION =
  "route-score-v1";

const weekdayOrder = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
] as const;

type PlanningMode =
  | "solo"
  | "group";

type BuildMethod =
  | "surprise"
  | "mix"
  | "anchor";

type DiscoveryPreference =
  | "best"
  | "new-only"
  | "mix";

type StopKind =
  | "food"
  | "event"
  | "drinks";

type StopMix = {
  food: number;
  events: number;
  drinks: number;
};

type SoloVibe =
  | "slow-reset"
  | "curious-explorer"
  | "treat-myself"
  | "social-solo";

type SoloPace =
  | "relaxed"
  | "balanced"
  | "packed";

type GroupVibe =
  | "friends-night"
  | "date-night"
  | "celebration"
  | "family-plan"
  | "nightlife";

type GroupPriority =
  | "everyone-happy"
  | "budget-friendly"
  | "minimal-travel";

type GenerateOutingRequest = {
  planningMode: PlanningMode;
  buildMethod: BuildMethod;
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
  discoveryPreference: DiscoveryPreference;
  visitedListingKeys: string[];
  visitedEventOccurrenceKeys: string[];
  stopMix: StopMix;
  totalStops: number;
  allowedKinds: StopKind[];
  anchorListingKey: string | null;
  anchorListingName: string | null;
  soloVibe: SoloVibe | null;
  soloPace: SoloPace | null;
  groupVibe: GroupVibe | null;
  groupPriority:
    | GroupPriority
    | null;
};

type TimeInterval = {
  start: number;
  end: number;
};

type Candidate = {
  listing: Listing;
  kind: StopKind;
  score: number;
  intervals: TimeInterval[];
  fixedStart?: number;
  estimatedCostCad: number | null;
  matchedInterests: string[];
};

type PlannedStop = {
  order: number;
  kind: StopKind;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  travelFromPreviousMinutes:
    | number
    | null;
  estimatedCostCad:
    | number
    | null;
  reason: string;
  listing: Listing;
};

type ProposedStop = {
  candidate: Candidate;
  start: number;
  end: number;
  travelFromPreviousMinutes:
    | number
    | null;
};

type RequestedSlot = {
  kind: StopKind;
  listingKey?: string;
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

function isPlanningMode(
  value: unknown
): value is PlanningMode {
  return (
    value === "solo" ||
    value === "group"
  );
}

function isBuildMethod(
  value: unknown
): value is BuildMethod {
  return (
    value === "surprise" ||
    value === "mix" ||
    value === "anchor"
  );
}

function isDiscoveryPreference(
  value: unknown
): value is DiscoveryPreference {
  return (
    value === "best" ||
    value === "new-only" ||
    value === "mix"
  );
}

function isStopKind(
  value: unknown
): value is StopKind {
  return (
    value === "food" ||
    value === "event" ||
    value === "drinks"
  );
}

function readCount(
  value: unknown,
  fallback = 0
): number {
  return typeof value ===
      "number" &&
    Number.isFinite(value)
      ? Math.min(
          5,
          Math.max(
            0,
            Math.round(value)
          )
        )
      : fallback;
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

  const planningMode =
    isPlanningMode(
      body.planningMode
    )
      ? body.planningMode
      : "solo";

  const buildMethod =
    isBuildMethod(
      body.buildMethod
    )
      ? body.buildMethod
      : "surprise";

  const partySize =
    planningMode === "solo"
      ? 1
      : typeof body.partySize ===
            "number" &&
          Number.isFinite(
            body.partySize
          )
        ? Math.min(
            12,
            Math.max(
              2,
              Math.round(
                body.partySize
              )
            )
          )
        : 2;

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

  const discoveryPreference =
    isDiscoveryPreference(
      body.discoveryPreference
    )
      ? body.discoveryPreference
      : "best";

  const visitedListingKeys =
    body.visitedListingKeys === undefined
      ? []
      : isStringArray(
          body.visitedListingKeys
        )
        ? body.visitedListingKeys
            .map((key) => key.trim())
            .filter(Boolean)
            .slice(0, 1000)
        : null;

  const visitedEventOccurrenceKeys =
    body.visitedEventOccurrenceKeys === undefined
      ? []
      : isStringArray(
          body.visitedEventOccurrenceKeys
        )
        ? body.visitedEventOccurrenceKeys
            .map((key) => key.trim())
            .filter(Boolean)
            .slice(0, 1000)
        : null;

  const mixValue =
    body.stopMix &&
    typeof body.stopMix ===
      "object"
      ? body.stopMix as Record<
          string,
          unknown
        >
      : {};

  const stopMix: StopMix = {
    food:
      readCount(
        mixValue.food,
        buildMethod === "mix"
          ? 1
          : 0
      ),
    events:
      readCount(
        mixValue.events,
        buildMethod === "mix"
          ? 1
          : 0
      ),
    drinks:
      readCount(
        mixValue.drinks,
        buildMethod === "mix"
          ? 1
          : 0
      )
  };

  if (
    body.alcoholFree === true
  ) {
    stopMix.drinks = 0;
  }

  const totalStops =
    typeof body.totalStops ===
      "number" &&
    Number.isFinite(
      body.totalStops
    )
      ? Math.min(
          5,
          Math.max(
            1,
            Math.round(
              body.totalStops
            )
          )
        )
      : 3;

  const allowedKinds =
    Array.isArray(
      body.allowedKinds
    )
      ? body.allowedKinds
          .filter(isStopKind)
          .filter(
            (kind) =>
              !(
                body.alcoholFree ===
                  true &&
                kind === "drinks"
              )
          )
      : body.alcoholFree ===
          true
        ? [
            "food",
            "event"
          ] as StopKind[]
        : [
            "food",
            "event",
            "drinks"
          ] as StopKind[];

  const anchorListingKey =
    typeof body.anchorListingKey ===
      "string" &&
    body.anchorListingKey.trim()
      ? body.anchorListingKey.trim()
      : null;

  const anchorListingName =
    typeof body.anchorListingName ===
      "string" &&
    body.anchorListingName.trim()
      ? body.anchorListingName.trim()
      : null;

  const soloVibe =
    body.soloVibe ===
        "slow-reset" ||
    body.soloVibe ===
        "curious-explorer" ||
    body.soloVibe ===
        "treat-myself" ||
    body.soloVibe ===
        "social-solo"
      ? body.soloVibe
      : null;

  const soloPace =
    body.soloPace ===
        "relaxed" ||
    body.soloPace ===
        "balanced" ||
    body.soloPace ===
        "packed"
      ? body.soloPace
      : null;

  const groupVibe =
    body.groupVibe ===
        "friends-night" ||
    body.groupVibe ===
        "date-night" ||
    body.groupVibe ===
        "celebration" ||
    body.groupVibe ===
        "family-plan" ||
    body.groupVibe ===
        "nightlife"
      ? body.groupVibe
      : null;

  const groupPriority =
    body.groupPriority ===
        "everyone-happy" ||
    body.groupPriority ===
        "budget-friendly" ||
    body.groupPriority ===
        "minimal-travel"
      ? body.groupPriority
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
    mustIncludeTerms === null ||
    avoidTerms === null ||
    visitedListingKeys === null ||
    visitedEventOccurrenceKeys === null ||
    (
      buildMethod === "anchor" &&
      !anchorListingKey
    ) ||
    (
      buildMethod === "mix" &&
      stopMix.food +
        stopMix.events +
        stopMix.drinks ===
        0
    ) ||
    (
      buildMethod ===
        "surprise" &&
      allowedKinds.length ===
        0
    )
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
    planningMode,
    buildMethod,
    outingTypeId:
      body.outingTypeId,
    outingTypeTitle:
      body.outingTypeTitle,
    date: body.date,
    startTime:
      body.startTime,
    duration:
      body.duration,
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
    avoidTerms,
    discoveryPreference,
    visitedListingKeys,
    visitedEventOccurrenceKeys,
    stopMix,
    totalStops,
    allowedKinds:
      Array.from(
        new Set(
          allowedKinds
        )
      ),
    anchorListingKey,
    anchorListingName,
    soloVibe,
    soloPace,
    groupVibe,
    groupPriority
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

function getListingKind(
  listing: Listing
): StopKind {
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

function getEventOccurrenceKey(
  listing: Listing,
  fallbackDate: string
): string | null {
  if (listing.type !== "event") {
    return null;
  }

  if (!listing.startAt) {
    return `${listing.id}:${fallbackDate}`;
  }

  const parsed = new Date(listing.startAt);

  if (Number.isNaN(parsed.getTime())) {
    return `${listing.id}:${fallbackDate}`;
  }

  const timezone =
    listing.timezone || WINNIPEG_TIMEZONE;

  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).formatToParts(parsed);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;
  const month = parts.find(
    (part) => part.type === "month"
  )?.value;
  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return year && month && day
    ? `${listing.id}:${year}-${month}-${day}`
    : `${listing.id}:${fallbackDate}`;
}

function isPreviouslyVisited(
  listing: Listing,
  draft: GenerateOutingRequest
) {
  const listingKey =
    `${listing.type}-${listing.id}`;

  if (listing.type === "restaurant") {
    return draft.visitedListingKeys.includes(
      listingKey
    );
  }

  const occurrenceKey =
    getEventOccurrenceKey(
      listing,
      draft.date
    );

  if (
    occurrenceKey &&
    draft.visitedEventOccurrenceKeys.includes(
      occurrenceKey
    )
  ) {
    return true;
  }

  return (
    draft.visitedEventOccurrenceKeys.length === 0 &&
    draft.visitedListingKeys.includes(listingKey)
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
      score += 12;
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
          neighbourhoodMatchesPreference(
            listing.neighbourhood,
            neighbourhood
          )
      );

    score +=
      neighbourhoodMatches
        ? 8
        : -3;
  }

  if (
    draft.planningMode ===
    "solo"
  ) {
    if (
      draft.soloVibe ===
      "slow-reset"
    ) {
      if (
        [
          "cafe",
          "coffee",
          "museum",
          "gallery",
          "park",
          "book",
          "quiet"
        ].some(
          (keyword) =>
            text.includes(keyword)
        )
      ) {
        score += 6;
      }

      if (
        isAlcoholFocused(
          listing
        )
      ) {
        score -= 5;
      }
    }

    if (
      draft.soloVibe ===
      "curious-explorer" &&
      [
        "museum",
        "market",
        "gallery",
        "workshop",
        "festival",
        "art"
      ].some(
        (keyword) =>
          text.includes(keyword)
      )
    ) {
      score += 6;
    }

    if (
      draft.soloVibe ===
      "treat-myself" &&
      [
        "restaurant",
        "dessert",
        "bakery",
        "dining",
        "theatre",
        "spa"
      ].some(
        (keyword) =>
          text.includes(keyword)
      )
    ) {
      score += 6;
    }

    if (
      draft.soloVibe ===
      "social-solo" &&
      [
        "live music",
        "comedy",
        "market",
        "festival",
        "sports",
        "bar"
      ].some(
        (keyword) =>
          text.includes(keyword)
      )
    ) {
      score += 6;
    }
  }

  if (
    draft.planningMode ===
    "group"
  ) {
    const groupKeywords:
      Record<
        GroupVibe,
        string[]
      > = {
        "friends-night": [
          "bowling",
          "comedy",
          "gaming",
          "music",
          "restaurant",
          "sports"
        ],
        "date-night": [
          "dining",
          "restaurant",
          "dessert",
          "art",
          "theatre",
          "music"
        ],
        celebration: [
          "music",
          "bar",
          "cocktail",
          "dessert",
          "restaurant",
          "party"
        ],
        "family-plan": [
          "family",
          "kids",
          "children",
          "all ages",
          "market",
          "festival"
        ],
        nightlife: [
          "nightlife",
          "club",
          "bar",
          "concert",
          "music",
          "late night"
        ]
      };

    if (
      draft.groupVibe &&
      groupKeywords[
        draft.groupVibe
      ].some(
        (keyword) =>
          text.includes(keyword)
      )
    ) {
      score += 6;
    }

    if (
      draft.groupPriority ===
        "everyone-happy" &&
      listing.rating &&
      listing.rating >= 4.3
    ) {
      score += 4;
    }

    if (
      draft.groupPriority ===
        "budget-friendly" &&
      getEstimatedCost(
        listing
      ) === 0
    ) {
      score += 6;
    }
  }

  if (
    draft.outingTypeId ===
      "food-crawl"
  ) {
    score +=
      getListingKind(
        listing
      ) === "food"
        ? 10
        : -5;
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

  if (draft.discoveryPreference === "mix") {
    score += isPreviouslyVisited(
      listing,
      draft
    )
      ? -5
      : 9;
  }

  if (
    draft.buildMethod ===
    "surprise"
  ) {
    score +=
      Math.random() * 5;
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
    candidate.listing.type ===
    "event"
  ) {
    return "Happening during your outing window.";
  }

  if (
    draft.neighbourhoods.some(
      (neighbourhood) =>
        neighbourhoodMatchesPreference(
          candidate.listing.neighbourhood,
          neighbourhood
        )
    )
  ) {
    return "Keeps the route close to your preferred area.";
  }

  return "Fits the route timing and travel plan.";
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

  const kind =
    getListingKind(
      listing
    );

  if (
    draft.alcoholFree &&
    kind === "drinks"
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

  const listingKey =
    `${listing.type}-${listing.id}`;

  if (
    draft.discoveryPreference === "new-only" &&
    listingKey !== draft.anchorListingKey &&
    isPreviouslyVisited(listing, draft)
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
    kind,
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

function getListingKey(
  listing: Listing
): string {
  return `${listing.type}-${listing.id}`;
}

function getStopDuration(
  candidate: Candidate,
  draft: GenerateOutingRequest,
  start: number,
  windowEnd: number
): number | null {
  if (
    candidate.kind === "event"
  ) {
    const interval =
      candidate.intervals.find(
        (currentInterval) =>
          start >=
            currentInterval.start &&
          start <
            currentInterval.end
      );

    if (!interval) {
      return null;
    }

    const available =
      Math.min(
        interval.end - start,
        windowEnd - start,
        120
      );

    return available >= 45
      ? available
      : null;
  }

  if (
    draft.planningMode ===
      "solo" &&
    draft.soloPace ===
      "relaxed"
  ) {
    return 75;
  }

  if (
    draft.planningMode ===
      "solo" &&
    draft.soloPace ===
      "packed"
  ) {
    return 45;
  }

  return 60;
}

function getLatestAvailableStart(
  candidate: Candidate,
  latestEnd: number,
  duration: number,
  windowStart: number
): number | null {
  for (
    const interval
    of [...candidate.intervals]
      .sort(
        (first, second) =>
          second.end -
          first.end
      )
  ) {
    const end =
      Math.min(
        latestEnd,
        interval.end
      );

    const start =
      end - duration;

    if (
      start >= interval.start &&
      start >= windowStart
    ) {
      return start;
    }
  }

  return null;
}

function countSequence(
  sequence: StopKind[]
): StopMix {
  return sequence.reduce<StopMix>(
    (counts, kind) => {
      if (kind === "event") {
        counts.events += 1;
      } else {
        counts[kind] += 1;
      }

      return counts;
    },
    {
      food: 0,
      events: 0,
      drinks: 0
    }
  );
}

function buildMixSequence(
  mix: StopMix
): StopKind[] {
  let food =
    mix.food;
  let events =
    mix.events;
  let drinks =
    mix.drinks;

  const sequence:
    StopKind[] = [];

  if (food > 0) {
    sequence.push("food");
    food -= 1;
  }

  while (
    events > 0 ||
    food > 0
  ) {
    if (events > 0) {
      sequence.push("event");
      events -= 1;
    }

    if (food > 0) {
      sequence.push("food");
      food -= 1;
    }
  }

  while (drinks > 0) {
    sequence.push("drinks");
    drinks -= 1;
  }

  return sequence.slice(0, 5);
}

function buildSurpriseSequence(
  draft: GenerateOutingRequest,
  candidates: Candidate[]
): StopKind[] {
  const availableKinds =
    new Set(
      candidates.map(
        (candidate) =>
          candidate.kind
      )
    );

  let allowed =
    draft.allowedKinds.filter(
      (kind) =>
        availableKinds.has(kind) &&
        !(
          draft.alcoholFree &&
          kind === "drinks"
        )
    );

  if (allowed.length === 0) {
    allowed =
      Array.from(
        availableKinds
      ).filter(
        (kind) =>
          !(
            draft.alcoholFree &&
            kind === "drinks"
          )
      );
  }

  if (allowed.length === 0) {
    return [];
  }

  const patterns:
    Record<number, StopKind[]> = {
      1: ["food"],
      2: [
        "food",
        "event"
      ],
      3: [
        "food",
        "event",
        "drinks"
      ],
      4: [
        "food",
        "event",
        "food",
        "drinks"
      ],
      5: [
        "food",
        "event",
        "food",
        "event",
        "drinks"
      ]
    };

  const preferred =
    patterns[
      draft.totalStops
    ] ?? patterns[3];

  const sequence =
    preferred.filter(
      (kind) =>
        allowed.includes(kind)
    );

  let fillIndex = 0;

  while (
    sequence.length <
    draft.totalStops
  ) {
    sequence.push(
      allowed[
        fillIndex %
        allowed.length
      ]
    );

    fillIndex += 1;
  }

  return sequence.slice(
    0,
    draft.totalStops
  );
}

function buildRequestedSlots(
  draft: GenerateOutingRequest,
  candidates: Candidate[],
  anchorCandidate:
    | Candidate
    | null
): RequestedSlot[] {
  if (
    draft.buildMethod ===
    "surprise"
  ) {
    return buildSurpriseSequence(
      draft,
      candidates
    ).map(
      (kind) => ({
        kind
      })
    );
  }

  const sequence =
    buildMixSequence(
      draft.stopMix
    );

  if (
    draft.buildMethod !==
      "anchor" ||
    !anchorCandidate
  ) {
    return sequence.map(
      (kind) => ({
        kind
      })
    );
  }

  const slots =
    sequence.map(
      (kind) => ({
        kind
      })
    );

  const anchorSlot:
    RequestedSlot = {
      kind:
        anchorCandidate.kind,
      listingKey:
        getListingKey(
          anchorCandidate.listing
        )
    };

  if (
    anchorCandidate.kind ===
    "food"
  ) {
    slots.unshift(
      anchorSlot
    );
  } else if (
    anchorCandidate.kind ===
    "drinks"
  ) {
    slots.push(
      anchorSlot
    );
  } else {
    const firstFoodIndex =
      slots.findIndex(
        (slot) =>
          slot.kind === "food"
      );

    slots.splice(
      firstFoodIndex >= 0
        ? firstFoodIndex + 1
        : 0,
      0,
      anchorSlot
    );
  }

  return slots.slice(0, 5);
}

function getCandidateForSlot(
  slot: RequestedSlot,
  candidates: Candidate[],
  usedKeys: Set<string>
): Candidate[] {
  return candidates
    .filter(
      (candidate) => {
        const key =
          getListingKey(
            candidate.listing
          );

        if (
          usedKeys.has(key) ||
          candidate.kind !==
            slot.kind
        ) {
          return false;
        }

        return (
          !slot.listingKey ||
          slot.listingKey === key
        );
      }
    )
    .sort(
      (first, second) =>
        second.score -
        first.score
    );
}

function chooseProposal(
  proposals: Array<{
    stop: ProposedStop;
    contextualScore: number;
  }>,
  draft: GenerateOutingRequest
): ProposedStop | null {
  const ordered =
    proposals.sort(
      (first, second) =>
        second.contextualScore -
        first.contextualScore
    );

  if (
    ordered.length === 0
  ) {
    return null;
  }

  if (
    draft.buildMethod !==
      "surprise" ||
    ordered.length === 1
  ) {
    return ordered[0].stop;
  }

  /*
   * Surprise routes choose from the
   * best verified fits instead of
   * repeating the exact same winner.
   * Squaring the random value keeps
   * the strongest candidates more
   * likely than the edge cases.
   */
  const shortlist =
    ordered.slice(
      0,
      Math.min(
        5,
        ordered.length
      )
    );

  const randomIndex =
    Math.floor(
      Math.pow(
        Math.random(),
        2
      ) *
      shortlist.length
    );

  return shortlist[
    Math.min(
      randomIndex,
      shortlist.length - 1
    )
  ].stop;
}

function chooseForwardStop(
  slot: RequestedSlot,
  candidates: Candidate[],
  usedKeys: Set<string>,
  draft: GenerateOutingRequest,
  earliestTime: number,
  windowEnd: number,
  previousListing:
    | Listing
    | null,
  currentCost: number,
  budgetLimit: number | null
): ProposedStop | null {
  const proposals:
    Array<{
      stop: ProposedStop;
      contextualScore: number;
    }> = [];

  for (
    const candidate
    of getCandidateForSlot(
      slot,
      candidates,
      usedKeys
    )
  ) {
    if (
      !canAffordCandidate(
        currentCost,
        candidate,
        budgetLimit
      )
    ) {
      continue;
    }

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

    const travelMinutes =
      previousListing
        ? getTravelMinutes(
            previousListing,
            candidate.listing,
            draft.transportation
          )
        : 0;

    const earliestStart =
      earliestTime +
      travelMinutes;

    const candidateStart =
      candidate.fixedStart !==
        undefined
        ? candidate.fixedStart
        : getEarliestAvailableStart(
            candidate,
            earliestStart,
            draft.planningMode ===
                "solo" &&
              draft.soloPace ===
                "packed"
              ? 45
              : draft.planningMode ===
                    "solo" &&
                  draft.soloPace ===
                    "relaxed"
                ? 75
                : 60,
            windowEnd
          );

    if (
      candidateStart === null ||
      candidateStart <
        earliestStart
    ) {
      continue;
    }

    const duration =
      getStopDuration(
        candidate,
        draft,
        candidateStart,
        windowEnd
      );

    if (
      duration === null ||
      !isAvailableForSlot(
        candidate,
        candidateStart,
        duration
      ) ||
      candidateStart +
        duration >
        windowEnd
    ) {
      continue;
    }

    proposals.push({
      stop: {
        candidate,
        start:
          candidateStart,
        end:
          candidateStart +
          duration,
        travelFromPreviousMinutes:
          previousListing
            ? travelMinutes
            : null
      },
      contextualScore:
        candidate.score -
        travelMinutes * 0.22
    });
  }

  return chooseProposal(
    proposals,
    draft
  );
}

function chooseBackwardStop(
  slot: RequestedSlot,
  candidates: Candidate[],
  usedKeys: Set<string>,
  draft: GenerateOutingRequest,
  latestBoundary: number,
  windowStart: number,
  nextListing: Listing,
  currentCost: number,
  budgetLimit: number | null
): ProposedStop | null {
  const proposals:
    Array<{
      stop: ProposedStop;
      contextualScore: number;
    }> = [];

  for (
    const candidate
    of getCandidateForSlot(
      slot,
      candidates,
      usedKeys
    )
  ) {
    if (
      !canAffordCandidate(
        currentCost,
        candidate,
        budgetLimit
      ) ||
      !fitsTransportation(
        candidate.listing,
        nextListing,
        draft.transportation,
        draft.maxTravelMinutes
      )
    ) {
      continue;
    }

    const travelMinutes =
      getTravelMinutes(
        candidate.listing,
        nextListing,
        draft.transportation
      );

    const latestEnd =
      latestBoundary -
      travelMinutes;

    const baseDuration =
      candidate.kind === "event"
        ? 90
        : draft.planningMode ===
              "solo" &&
            draft.soloPace ===
              "packed"
          ? 45
          : draft.planningMode ===
                "solo" &&
              draft.soloPace ===
                "relaxed"
            ? 75
            : 60;

    const candidateStart =
      candidate.fixedStart !==
        undefined
        ? candidate.fixedStart
        : getLatestAvailableStart(
            candidate,
            latestEnd,
            baseDuration,
            windowStart
          );

    if (
      candidateStart === null
    ) {
      continue;
    }

    const duration =
      getStopDuration(
        candidate,
        draft,
        candidateStart,
        latestEnd
      );

    if (
      duration === null ||
      candidateStart <
        windowStart ||
      candidateStart +
        duration >
        latestEnd ||
      !isAvailableForSlot(
        candidate,
        candidateStart,
        duration
      )
    ) {
      continue;
    }

    proposals.push({
      stop: {
        candidate,
        start:
          candidateStart,
        end:
          candidateStart +
          duration,
        travelFromPreviousMinutes:
          null
      },
      contextualScore:
        candidate.score -
        travelMinutes * 0.22
    });
  }

  return chooseProposal(
    proposals,
    draft
  );
}

function normalizeProposedStops(
  stops: ProposedStop[],
  transportation: string
): ProposedStop[] {
  return [...stops]
    .sort(
      (first, second) =>
        first.start -
        second.start
    )
    .map(
      (stop, index, ordered) => ({
        ...stop,
        travelFromPreviousMinutes:
          index === 0
            ? null
            : getTravelMinutes(
                ordered[
                  index - 1
                ].candidate.listing,
                stop.candidate.listing,
                transportation
              )
      })
    );
}

function buildPlanForSlots(
  slots: RequestedSlot[],
  candidates: Candidate[],
  draft: GenerateOutingRequest,
  windowStart: number,
  windowEnd: number,
  budgetLimit: number | null
): ProposedStop[] {
  if (
    slots.length === 0
  ) {
    return [];
  }

  const workingSlots =
    slots.map(
      (slot) => ({
        ...slot
      })
    );

  let pivotIndex =
    workingSlots.findIndex(
      (slot) => {
        if (!slot.listingKey) {
          return false;
        }

        return candidates.some(
          (candidate) =>
            getListingKey(
              candidate.listing
            ) ===
              slot.listingKey &&
            candidate.kind ===
              "event"
        );
      }
    );

  if (pivotIndex < 0) {
    pivotIndex =
      workingSlots.findIndex(
        (slot) =>
          slot.kind === "event"
      );

    if (pivotIndex >= 0) {
      const eventCandidates =
        candidates.filter(
          (candidate) =>
            candidate.kind ===
              "event"
        );

      const eventCandidate =
        draft.buildMethod ===
          "surprise" &&
        eventCandidates.length > 1
          ? eventCandidates[
              Math.floor(
                Math.pow(
                  Math.random(),
                  2
                ) *
                Math.min(
                  5,
                  eventCandidates.length
                )
              )
            ]
          : eventCandidates[0];

      if (eventCandidate) {
        workingSlots[
          pivotIndex
        ].listingKey =
          getListingKey(
            eventCandidate.listing
          );
      }
    }
  }

  if (pivotIndex >= 0) {
    const pivotSlot =
      workingSlots[
        pivotIndex
      ];

    const pivotCandidate =
      getCandidateForSlot(
        pivotSlot,
        candidates,
        new Set()
      )[0];

    if (
      pivotCandidate &&
      pivotCandidate.kind ===
        "event" &&
      pivotCandidate.fixedStart !==
        undefined
    ) {
      const pivotStart =
        pivotCandidate.fixedStart;

      const pivotDuration =
        getStopDuration(
          pivotCandidate,
          draft,
          pivotStart,
          windowEnd
        );

      if (
        pivotDuration !== null &&
        pivotStart >=
          windowStart &&
        pivotStart +
          pivotDuration <=
          windowEnd
      ) {
        const usedKeys =
          new Set<string>([
            getListingKey(
              pivotCandidate.listing
            )
          ]);

        const stops:
          ProposedStop[] = [
            {
              candidate:
                pivotCandidate,
              start:
                pivotStart,
              end:
                pivotStart +
                pivotDuration,
              travelFromPreviousMinutes:
                null
            }
          ];

        let currentCost =
          pivotCandidate.estimatedCostCad ??
          0;

        let latestBoundary =
          pivotStart;

        let nextListing =
          pivotCandidate.listing;

        for (
          let index =
            pivotIndex - 1;
          index >= 0;
          index -= 1
        ) {
          const selected =
            chooseBackwardStop(
              workingSlots[index],
              candidates,
              usedKeys,
              draft,
              latestBoundary,
              windowStart,
              nextListing,
              currentCost,
              budgetLimit
            );

          if (!selected) {
            continue;
          }

          stops.push(selected);
          usedKeys.add(
            getListingKey(
              selected.candidate
                .listing
            )
          );
          currentCost +=
            selected.candidate
              .estimatedCostCad ??
            0;
          latestBoundary =
            selected.start;
          nextListing =
            selected.candidate
              .listing;
        }

        let earliestTime =
          pivotStart +
          pivotDuration;

        let previousListing =
          pivotCandidate.listing;

        for (
          let index =
            pivotIndex + 1;
          index <
            workingSlots.length;
          index += 1
        ) {
          const selected =
            chooseForwardStop(
              workingSlots[index],
              candidates,
              usedKeys,
              draft,
              earliestTime,
              windowEnd,
              previousListing,
              currentCost,
              budgetLimit
            );

          if (!selected) {
            continue;
          }

          stops.push(selected);
          usedKeys.add(
            getListingKey(
              selected.candidate
                .listing
            )
          );
          currentCost +=
            selected.candidate
              .estimatedCostCad ??
            0;
          earliestTime =
            selected.end;
          previousListing =
            selected.candidate
              .listing;
        }

        return normalizeProposedStops(
          stops,
          draft.transportation
        ).slice(0, 5);
      }
    }
  }

  const stops:
    ProposedStop[] = [];

  const usedKeys =
    new Set<string>();

  let currentCost = 0;
  let currentTime =
    windowStart;

  let previousListing:
    Listing | null = null;

  for (
    const slot
    of workingSlots
  ) {
    const selected =
      chooseForwardStop(
        slot,
        candidates,
        usedKeys,
        draft,
        currentTime,
        windowEnd,
        previousListing,
        currentCost,
        budgetLimit
      );

    if (!selected) {
      continue;
    }

    stops.push(selected);
    usedKeys.add(
      getListingKey(
        selected.candidate
          .listing
      )
    );
    currentCost +=
      selected.candidate
        .estimatedCostCad ??
      0;
    currentTime =
      selected.end;
    previousListing =
      selected.candidate
        .listing;
  }

  return normalizeProposedStops(
    stops,
    draft.transportation
  ).slice(0, 5);
}

function getPlanTitle(
  draft: GenerateOutingRequest,
  stops: ProposedStop[]
): string {
  if (
    draft.buildMethod ===
      "anchor" &&
    draft.anchorListingName
  ) {
    return `${draft.outingTypeTitle} around ${draft.anchorListingName}`;
  }

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
      180
    ),
    getPublishedPlaceListings(
      220
    )
  ]);

  const allListings = [
    ...events,
    ...places
  ];

  const candidates =
    allListings
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

  const anchorCandidate =
    draft.anchorListingKey
      ? candidates.find(
          (candidate) =>
            getListingKey(
              candidate.listing
            ) ===
            draft.anchorListingKey
        ) ?? null
      : null;

  if (
    draft.buildMethod ===
      "anchor" &&
    !anchorCandidate
  ) {
    return NextResponse.json(
      {
        error:
          "Your chosen starting point is not available inside this date and time window. Change the time, length, or starting listing."
      },
      {
        status: 409
      }
    );
  }

  const requestedSlots =
    buildRequestedSlots(
      draft,
      candidates,
      anchorCandidate
    );

  const budgetLimit =
    getBudgetLimit(
      draft.budget
    );

  const proposedStops =
    buildPlanForSlots(
      requestedSlots,
      candidates,
      draft,
      windowStart,
      windowEnd,
      budgetLimit
    );

  if (
    draft.anchorListingKey &&
    !proposedStops.some(
      (stop) =>
        getListingKey(
          stop.candidate
            .listing
        ) ===
        draft.anchorListingKey
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Venture could not safely connect the chosen starting point to the requested stops inside this time and travel window."
      },
      {
        status: 409
      }
    );
  }

  const stops:
    PlannedStop[] =
      proposedStops.map(
        (stop, index) => ({
          order:
            index + 1,
          kind:
            stop.candidate.kind,
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

  if (
    stops.length === 0
  ) {
    warnings.push(
      "No verified listings matched the selected date, time, hours, categories, and preferences."
    );
  }

  const requestedSequence =
    requestedSlots.map(
      (slot) =>
        slot.kind
    );

  const requestedMix =
    countSequence(
      requestedSequence
    );

  const actualMix =
    countSequence(
      stops.map(
        (stop) =>
          stop.kind
      )
    );

  const categoryLabels:
    Array<{
      key: keyof StopMix;
      label: string;
    }> = [
      {
        key: "food",
        label: "food"
      },
      {
        key: "events",
        label: "event"
      },
      {
        key: "drinks",
        label: "drinks"
      }
    ];

  for (
    const category
    of categoryLabels
  ) {
    if (
      actualMix[category.key] <
      requestedMix[category.key]
    ) {
      warnings.push(
        `Venture found ${actualMix[category.key]} of ${requestedMix[category.key]} requested ${category.label} ${
          requestedMix[category.key] === 1
            ? "stop"
            : "stops"
        } inside the verified time and travel window.`
      );
    }
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

  const requestedStopCount =
    requestedSlots.length;

  const actualStopCount =
    stops.length;

  const missingStopCount =
    Math.max(
      0,
      requestedStopCount -
        actualStopCount
    );

  const planStatus:
    | "complete"
    | "partial"
    | "empty" =
      actualStopCount === 0
        ? "empty"
        : missingStopCount > 0
          ? "partial"
          : "complete";

  if (
    draft.discoveryPreference === "new-only" &&
    planStatus === "partial"
  ) {
    warnings.push(
      `Only ${actualStopCount} new ${
        actualStopCount === 1 ? "match fits" : "matches fit"
      } this route. Broaden the area, time, or allow one familiar stop for more options.`
    );
  }

  if (planStatus === "partial") {
    warnings.unshift(
      `Venture built ${actualStopCount} of ${requestedStopCount} requested ${
        requestedStopCount === 1
          ? "stop"
          : "stops"
      }. Widen the area, travel limit, time window, or budget to complete the route.`
    );
  }

  const categoryDiversity =
    new Set(
      stops.map(
        (stop) =>
          stop.listing.category
      )
    ).size;

  const neighbourhoodDiversity =
    new Set(
      stops
        .map(
          (stop) =>
            stop.listing.neighbourhood
        )
        .filter(Boolean)
    ).size;

  const stopKindDiversity =
    new Set(
      stops.map(
        (stop) =>
          stop.kind
      )
    ).size;

  await recordServerBetaEvent({
    request,
    eventName: "outing_generated",
    pagePath: "/build-outing/results",
    properties: {
      planStatus,
      planningMode: draft.planningMode,
      buildMethod: draft.buildMethod,
      transportation: draft.transportation,
      partySize: draft.partySize,
      requestedStopCount,
      actualStopCount,
      missingStopCount,
      candidateCount: candidates.length,
      categoryDiversity,
      neighbourhoodDiversity,
      stopKindDiversity,
      recommendationVersion:
        RECOMMENDATION_VERSION,
      alcoholFree: draft.alcoholFree
    }
  });

  return NextResponse.json({
    planId:
      crypto.randomUUID(),
    generatedAt:
      new Date().toISOString(),
    recommendationVersion:
      RECOMMENDATION_VERSION,
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
    planningMode:
      draft.planningMode,
    buildMethod:
      draft.buildMethod,
    discoveryPreference:
      draft.discoveryPreference,
    partySize:
      draft.partySize,
    maxTravelMinutes:
      draft.maxTravelMinutes,
    mustIncludeTerms:
      draft.mustIncludeTerms,
    avoidTerms:
      draft.avoidTerms,
    requestedMix,
    actualMix,
    requestedStopCount,
    actualStopCount,
    missingStopCount,
    planStatus,
    anchorListingKey:
      draft.anchorListingKey,
    anchorListingName:
      draft.anchorListingName,
    soloVibe:
      draft.soloVibe,
    soloPace:
      draft.soloPace,
    groupVibe:
      draft.groupVibe,
    groupPriority:
      draft.groupPriority,
    estimatedTotalCad,
    estimatedGroupTotalCad:
      estimatedTotalCad ===
      null
        ? null
        : estimatedTotalCad *
          draft.partySize,
    stops,
    warnings:
      Array.from(
        new Set(warnings)
      ),
    candidateCount:
      candidates.length
  });
}
