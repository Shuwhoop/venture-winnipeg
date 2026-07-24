"use client";

import {
  clearSyncDeletion,
  queueSyncDeletion
} from "@/lib/account-sync-storage";

import type {
  Listing
} from "@/lib/types";

export const VISIT_HISTORY_STORAGE_KEY =
  "venture:visit-history:v1";

export const VISIT_HISTORY_EVENT =
  "venture:visit-history-changed";

export type VisitSource =
  | "manual"
  | "outing_complete"
  | "imported";

export type VisitRecord = {
  visitId: string;
  listingKey: string;
  listingId: string;
  listingSlug: string;
  listingType: Listing["type"];
  listingSnapshot: Listing;
  eventOccurrenceKey: string | null;
  visitedAt: string;
  source: VisitSource;
  outingId: string | null;
  wouldReturn: boolean | null;
  personalRating: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type VisitHistoryStats = {
  totalVisits: number;
  uniquePlaces: number;
  uniqueEvents: number;
  neighbourhoodsExplored: number;
  newThisMonth: number;
};

function createVisitId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `visit-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function visitListingKey(
  listing: Pick<Listing, "id" | "type">
) {
  return `${listing.type}-${listing.id}`;
}

export function getEventOccurrenceKey(
  listing: Pick<
    Listing,
    "id" | "type" | "startAt" | "timezone"
  >,
  fallbackDate?: string | null
): string | null {
  if (listing.type !== "event") {
    return null;
  }

  if (listing.startAt) {
    const parsed = new Date(listing.startAt);

    if (!Number.isNaN(parsed.getTime())) {
      const timezone =
        listing.timezone || "America/Winnipeg";

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

      if (year && month && day) {
        return `${listing.id}:${year}-${month}-${day}`;
      }
    }
  }

  return fallbackDate
    ? `${listing.id}:${fallbackDate}`
    : `${listing.id}:unscheduled`;
}

function isVisitSource(
  value: unknown
): value is VisitSource {
  return (
    value === "manual" ||
    value === "outing_complete" ||
    value === "imported"
  );
}

export function isVisitRecord(
  value: unknown
): value is VisitRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<
    string,
    unknown
  >;

  const snapshot =
    record.listingSnapshot as
      | Record<string, unknown>
      | undefined;

  return (
    typeof record.visitId === "string" &&
    typeof record.listingKey === "string" &&
    typeof record.listingId === "string" &&
    typeof record.listingSlug === "string" &&
    (record.listingType === "event" ||
      record.listingType === "restaurant") &&
    Boolean(snapshot) &&
    typeof snapshot?.id === "string" &&
    typeof snapshot?.slug === "string" &&
    typeof snapshot?.name === "string" &&
    (record.eventOccurrenceKey === null ||
      typeof record.eventOccurrenceKey ===
        "string") &&
    typeof record.visitedAt === "string" &&
    isVisitSource(record.source) &&
    (record.outingId === null ||
      typeof record.outingId === "string") &&
    (record.wouldReturn === null ||
      typeof record.wouldReturn === "boolean") &&
    (record.personalRating === null ||
      typeof record.personalRating ===
        "number") &&
    typeof record.notes === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

function notifyVisitHistoryChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(VISIT_HISTORY_EVENT)
  );
}

export function getVisitHistory(): VisitRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(
      VISIT_HISTORY_STORAGE_KEY
    );

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isVisitRecord)
      .sort((first, second) =>
        second.visitedAt.localeCompare(
          first.visitedAt
        )
      );
  } catch {
    return [];
  }
}

export function writeVisitHistory(
  visits: VisitRecord[]
) {
  if (typeof window === "undefined") {
    return;
  }

  const seen = new Set<string>();

  const normalized = visits
    .filter(isVisitRecord)
    .filter((visit) => {
      if (seen.has(visit.visitId)) {
        return false;
      }

      seen.add(visit.visitId);
      return true;
    })
    .sort((first, second) =>
      second.visitedAt.localeCompare(
        first.visitedAt
      )
    )
    .slice(0, 500);

  const nextValue = JSON.stringify(normalized);

  if (
    window.localStorage.getItem(
      VISIT_HISTORY_STORAGE_KEY
    ) === nextValue
  ) {
    return;
  }

  window.localStorage.setItem(
    VISIT_HISTORY_STORAGE_KEY,
    nextValue
  );

  notifyVisitHistoryChanged();
}

export function createVisitRecord(
  listing: Listing,
  options?: {
    visitedAt?: string;
    source?: VisitSource;
    outingId?: string | null;
    fallbackEventDate?: string | null;
    wouldReturn?: boolean | null;
    personalRating?: number | null;
    notes?: string;
  }
): VisitRecord {
  const now = new Date().toISOString();
  const visitedAt =
    options?.visitedAt ?? now;

  return {
    visitId: createVisitId(),
    listingKey: visitListingKey(listing),
    listingId: listing.id,
    listingSlug: listing.slug,
    listingType: listing.type,
    listingSnapshot: listing,
    eventOccurrenceKey:
      getEventOccurrenceKey(
        listing,
        options?.fallbackEventDate
      ),
    visitedAt,
    source: options?.source ?? "manual",
    outingId: options?.outingId ?? null,
    wouldReturn:
      options?.wouldReturn ?? null,
    personalRating:
      options?.personalRating ?? null,
    notes: options?.notes?.trim() ?? "",
    createdAt: now,
    updatedAt: now
  };
}

export function addVisit(
  listing: Listing,
  options?: Parameters<
    typeof createVisitRecord
  >[1]
): VisitRecord {
  const record = createVisitRecord(
    listing,
    options
  );

  clearSyncDeletion(
    "visit",
    record.visitId
  );

  writeVisitHistory([
    record,
    ...getVisitHistory()
  ]);

  return record;
}

export function addVisits(
  entries: {
    listing: Listing;
    options?: Parameters<
      typeof createVisitRecord
    >[1];
  }[]
): VisitRecord[] {
  const records = entries.map(
    (entry) =>
      createVisitRecord(
        entry.listing,
        entry.options
      )
  );

  for (const record of records) {
    clearSyncDeletion(
      "visit",
      record.visitId
    );
  }

  writeVisitHistory([
    ...records,
    ...getVisitHistory()
  ]);

  return records;
}

export function removeVisit(
  visitId: string
) {
  const current = getVisitHistory();

  writeVisitHistory(
    current.filter(
      (visit) => visit.visitId !== visitId
    )
  );

  queueSyncDeletion("visit", visitId);
}

export function removeLatestVisitForListing(
  listing: Pick<
    Listing,
    "id" | "type" | "startAt" | "timezone"
  >,
  fallbackEventDate?: string | null
): VisitRecord | null {
  const key = visitListingKey(listing);
  const current = getVisitHistory();
  const occurrenceKey =
    getEventOccurrenceKey(
      listing,
      fallbackEventDate
    );

  const latest = current.find(
    (visit) =>
      visit.listingKey === key &&
      (
        listing.type === "restaurant" ||
        !occurrenceKey ||
        !visit.eventOccurrenceKey ||
        visit.eventOccurrenceKey === occurrenceKey
      )
  );

  if (!latest) {
    return null;
  }

  removeVisit(latest.visitId);
  return latest;
}

export function isListingVisited(
  listing: Pick<
    Listing,
    "id" | "type" | "startAt" | "timezone"
  >,
  fallbackEventDate?: string | null
) {
  const visits = getVisitHistory();
  const listingKey = visitListingKey(listing);

  if (listing.type === "restaurant") {
    return visits.some(
      (visit) =>
        visit.listingKey === listingKey
    );
  }

  const occurrenceKey =
    getEventOccurrenceKey(
      listing,
      fallbackEventDate
    );

  return visits.some(
    (visit) =>
      visit.listingKey === listingKey &&
      (
        !occurrenceKey ||
        !visit.eventOccurrenceKey ||
        visit.eventOccurrenceKey ===
          occurrenceKey
      )
  );
}

export function getVisitedListingKeys() {
  const visits = getVisitHistory();

  return Array.from(
    new Set(
      visits.map(
        (visit) => visit.listingKey
      )
    )
  );
}

export function getVisitedEventOccurrenceKeys() {
  return Array.from(
    new Set(
      getVisitHistory()
        .map(
          (visit) =>
            visit.eventOccurrenceKey
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    )
  );
}

export function getVisitHistoryStats(
  visits = getVisitHistory()
): VisitHistoryStats {
  const places = new Set<string>();
  const events = new Set<string>();
  const neighbourhoods =
    new Set<string>();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  let newThisMonth = 0;

  for (const visit of visits) {
    if (visit.listingType === "restaurant") {
      places.add(visit.listingKey);
    } else {
      events.add(
        visit.eventOccurrenceKey ??
          visit.listingKey
      );
    }

    const neighbourhood =
      visit.listingSnapshot.neighbourhood
        ?.trim();

    if (neighbourhood) {
      neighbourhoods.add(neighbourhood);
    }

    if (
      visit.visitedAt.slice(0, 7) ===
      currentMonth
    ) {
      newThisMonth += 1;
    }
  }

  return {
    totalVisits: visits.length,
    uniquePlaces: places.size,
    uniqueEvents: events.size,
    neighbourhoodsExplored:
      neighbourhoods.size,
    newThisMonth
  };
}
