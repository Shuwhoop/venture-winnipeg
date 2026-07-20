import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 500;
const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_AFTER_DAYS = 30;

const TRUSTED_VERIFICATION_STATUSES = new Set([
  "official_source",
  "verified_venture",
  "verified_business"
]);

const OUTING_PLACE_TYPES = new Set([
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
]);

export const DATA_HEALTH_ISSUES = [
  "unpublished",
  "unverified",
  "missing-hours",
  "invalid-hours",
  "missing-coordinates",
  "missing-neighbourhood",
  "missing-price",
  "missing-source",
  "unchecked-source",
  "stale-source",
  "expired-freshness",
  "closed-place",
  "past-event",
  "expired-event",
  "missing-venue",
  "missing-ticket-link"
] as const;

export type DataHealthIssueCode =
  (typeof DATA_HEALTH_ISSUES)[number];

export type DataHealthEntityType = "place" | "event";

export type DataHealthFilter = {
  entityType?: "all" | DataHealthEntityType;
  issue?: "all" | DataHealthIssueCode;
  status?: "all" | "published" | "draft" | "closed" | "expired";
  search?: string;
  limit?: number;
};

export type DataHealthIssue = {
  code: DataHealthIssueCode;
  label: string;
  severity: "high" | "medium" | "low";
};

export type DataHealthRecord = {
  key: string;
  entityType: DataHealthEntityType;
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
  verificationStatus: string;
  neighbourhood: string | null;
  sourceCheckedAt: string | null;
  primarySourceUrl: string | null;
  outingEligible: boolean;
  pitchReady: boolean;
  issues: DataHealthIssue[];
  publicPath: string;
};

export type DataHealthMetrics = {
  totalRecords: number;
  totalPlaces: number;
  totalEvents: number;
  publishedPlaces: number;
  publishedEvents: number;
  outingEligible: number;
  pitchReady: number;
  needsAttention: number;
  publishedNeedsAttention: number;
  missingHours: number;
  missingCoordinates: number;
  missingSources: number;
  unverified: number;
  staleSources: number;
  futureEvents: number;
  expiredEvents: number;
};

export type DataHealthReport = {
  generatedAt: string;
  staleAfterDays: number;
  metrics: DataHealthMetrics;
  issueCounts: Partial<Record<DataHealthIssueCode, number>>;
  records: DataHealthRecord[];
  totalMatchingRecords: number;
  appliedFilter: Required<Omit<DataHealthFilter, "limit">> & {
    limit: number;
  };
};

type PlaceRow = {
  id: string;
  slug: string;
  name: string;
  place_type: string;
  primary_category: string;
  status: string;
  verification_status: string;
  open_status: string;
  neighbourhood: string | null;
  latitude: number | null;
  longitude: number | null;
  weekly_hours: unknown;
  price_level: number | null;
  source_checked_at: string | null;
  freshness_expires_at: string | null;
};

type EventVenueRow = {
  id: string;
  slug: string;
  name: string;
  neighbourhood: string | null;
  latitude: number | null;
  longitude: number | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  primary_category: string;
  status: string;
  verification_status: string;
  start_at: string;
  end_at: string | null;
  expires_at: string;
  ticket_url: string | null;
  organizer_website: string | null;
  source_checked_at: string | null;
  freshness_expires_at: string | null;
  venue: EventVenueRow | EventVenueRow[] | null;
};

type ListingSourceRow = {
  entity_type: string;
  entity_id: string;
  source_url: string;
  is_primary: boolean;
  last_checked_at: string | null;
};

const ISSUE_DEFINITIONS: Record<
  DataHealthIssueCode,
  Omit<DataHealthIssue, "code">
> = {
  unpublished: {
    label: "Not published",
    severity: "medium"
  },
  unverified: {
    label: "Needs verification",
    severity: "high"
  },
  "missing-hours": {
    label: "Hours missing",
    severity: "high"
  },
  "invalid-hours": {
    label: "Hours cannot be parsed",
    severity: "high"
  },
  "missing-coordinates": {
    label: "Coordinates missing",
    severity: "high"
  },
  "missing-neighbourhood": {
    label: "Neighbourhood missing",
    severity: "medium"
  },
  "missing-price": {
    label: "Price missing",
    severity: "low"
  },
  "missing-source": {
    label: "Primary source missing",
    severity: "high"
  },
  "unchecked-source": {
    label: "Source check missing",
    severity: "medium"
  },
  "stale-source": {
    label: `Source check older than ${STALE_AFTER_DAYS} days`,
    severity: "medium"
  },
  "expired-freshness": {
    label: "Freshness window expired",
    severity: "medium"
  },
  "closed-place": {
    label: "Place is closed",
    severity: "high"
  },
  "past-event": {
    label: "Event has already ended",
    severity: "medium"
  },
  "expired-event": {
    label: "Event expiry has passed",
    severity: "high"
  },
  "missing-venue": {
    label: "Venue missing",
    severity: "high"
  },
  "missing-ticket-link": {
    label: "Ticket or official link missing",
    severity: "low"
  }
};

function issue(code: DataHealthIssueCode): DataHealthIssue {
  return {
    code,
    ...ISSUE_DEFINITIONS[code]
  };
}

function getVenue(
  value: EventVenueRow | EventVenueRow[] | null
): EventVenueRow | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function hasCoordinates(
  latitude: number | null,
  longitude: number | null
): boolean {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  );
}

function parseTimeToMinutes(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    hour < 0 ||
    hour > 24 ||
    minute < 0 ||
    minute > 59 ||
    (hour === 24 && minute !== 0)
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function normalizeHours(
  weeklyHours: unknown
): Record<string, unknown> | null {
  if (typeof weeklyHours === "string") {
    try {
      const parsed = JSON.parse(weeklyHours);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  if (
    weeklyHours &&
    typeof weeklyHours === "object" &&
    !Array.isArray(weeklyHours)
  ) {
    return weeklyHours as Record<string, unknown>;
  }

  return null;
}

function inspectWeeklyHours(weeklyHours: unknown): {
  present: boolean;
  usable: boolean;
} {
  const normalized = normalizeHours(weeklyHours);

  if (!normalized || Object.keys(normalized).length === 0) {
    return {
      present: false,
      usable: false
    };
  }

  let recognizedDay = false;
  let usableInterval = false;

  for (const value of Object.values(normalized)) {
    const items = Array.isArray(value) ? value : [value];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const day = item as Record<string, unknown>;

      if (day.closed === true) {
        recognizedDay = true;
        continue;
      }

      const open = parseTimeToMinutes(day.open);
      const close = parseTimeToMinutes(day.close);

      if (open !== null && close !== null) {
        recognizedDay = true;
        usableInterval = true;
      }
    }
  }

  return {
    present: true,
    usable: recognizedDay && usableInterval
  };
}

function isTrusted(status: string): boolean {
  return TRUSTED_VERIFICATION_STATUSES.has(status);
}

function isDateBeforeNow(value: string | null, now: Date): boolean {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);

  return Number.isFinite(parsed.getTime()) && parsed < now;
}

function isStale(value: string | null, now: Date): boolean {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);

  return (
    Number.isFinite(parsed.getTime()) &&
    now.getTime() - parsed.getTime() >
      STALE_AFTER_DAYS * DAY_MS
  );
}

async function fetchAllRows<T>(
  table: string,
  select: string
): Promise<T[]> {
  const supabase = getSupabaseAdminClient();
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        `Unable to load ${table} for data health: ${error.message}`
      );
    }

    const page = (data ?? []) as unknown as T[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

function getPrimarySourceMap(
  listingSources: ListingSourceRow[]
): Map<string, ListingSourceRow> {
  const result = new Map<string, ListingSourceRow>();

  for (const row of listingSources) {
    const key = `${row.entity_type}:${row.entity_id}`;
    const current = result.get(key);

    if (!current || (row.is_primary && !current.is_primary)) {
      result.set(key, row);
    }
  }

  return result;
}

function createPlaceRecord(
  row: PlaceRow,
  source: ListingSourceRow | undefined,
  now: Date
): DataHealthRecord {
  const issues: DataHealthIssue[] = [];
  const hours = inspectWeeklyHours(row.weekly_hours);

  if (row.status !== "published") {
    issues.push(issue("unpublished"));
  }

  if (!isTrusted(row.verification_status)) {
    issues.push(issue("unverified"));
  }

  if (!hours.present) {
    issues.push(issue("missing-hours"));
  } else if (!hours.usable) {
    issues.push(issue("invalid-hours"));
  }

  if (!hasCoordinates(row.latitude, row.longitude)) {
    issues.push(issue("missing-coordinates"));
  }

  if (!row.neighbourhood?.trim()) {
    issues.push(issue("missing-neighbourhood"));
  }

  if (!row.price_level) {
    issues.push(issue("missing-price"));
  }

  if (!source?.source_url?.trim()) {
    issues.push(issue("missing-source"));
  }

  const sourceCheck = row.source_checked_at ?? source?.last_checked_at ?? null;

  if (!sourceCheck) {
    issues.push(issue("unchecked-source"));
  } else if (isStale(sourceCheck, now)) {
    issues.push(issue("stale-source"));
  }

  if (isDateBeforeNow(row.freshness_expires_at, now)) {
    issues.push(issue("expired-freshness"));
  }

  if (
    row.open_status === "temporarily_closed" ||
    row.open_status === "permanently_closed"
  ) {
    issues.push(issue("closed-place"));
  }

  const outingEligible =
    row.status === "published" &&
    OUTING_PLACE_TYPES.has(row.place_type) &&
    isTrusted(row.verification_status) &&
    hours.usable &&
    hasCoordinates(row.latitude, row.longitude) &&
    row.open_status !== "temporarily_closed" &&
    row.open_status !== "permanently_closed";

  const pitchReady =
    outingEligible &&
    Boolean(source?.source_url?.trim()) &&
    Boolean(sourceCheck) &&
    !isStale(sourceCheck, now) &&
    !isDateBeforeNow(row.freshness_expires_at, now) &&
    Boolean(row.neighbourhood?.trim());

  return {
    key: `place:${row.id}`,
    entityType: "place",
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.primary_category || row.place_type,
    status: row.status,
    verificationStatus: row.verification_status,
    neighbourhood: row.neighbourhood,
    sourceCheckedAt: sourceCheck,
    primarySourceUrl: source?.source_url ?? null,
    outingEligible,
    pitchReady,
    issues,
    publicPath: `/listings/${row.slug}`
  };
}

function createEventRecord(
  row: EventRow,
  source: ListingSourceRow | undefined,
  now: Date
): DataHealthRecord {
  const issues: DataHealthIssue[] = [];
  const venue = getVenue(row.venue);
  const effectiveEnd = row.end_at ?? row.start_at;

  if (row.status !== "published") {
    issues.push(issue("unpublished"));
  }

  if (!isTrusted(row.verification_status)) {
    issues.push(issue("unverified"));
  }

  if (!venue) {
    issues.push(issue("missing-venue"));
  }

  if (!venue || !hasCoordinates(venue.latitude, venue.longitude)) {
    issues.push(issue("missing-coordinates"));
  }

  if (!venue?.neighbourhood?.trim()) {
    issues.push(issue("missing-neighbourhood"));
  }

  if (!source?.source_url?.trim()) {
    issues.push(issue("missing-source"));
  }

  const sourceCheck = row.source_checked_at ?? source?.last_checked_at ?? null;

  if (!sourceCheck) {
    issues.push(issue("unchecked-source"));
  } else if (isStale(sourceCheck, now)) {
    issues.push(issue("stale-source"));
  }

  if (isDateBeforeNow(row.freshness_expires_at, now)) {
    issues.push(issue("expired-freshness"));
  }

  if (isDateBeforeNow(effectiveEnd, now)) {
    issues.push(issue("past-event"));
  }

  if (isDateBeforeNow(row.expires_at, now)) {
    issues.push(issue("expired-event"));
  }

  if (!row.ticket_url?.trim() && !row.organizer_website?.trim()) {
    issues.push(issue("missing-ticket-link"));
  }

  const isCurrentOrFuture = !isDateBeforeNow(effectiveEnd, now);

  const outingEligible =
    row.status === "published" &&
    isTrusted(row.verification_status) &&
    isCurrentOrFuture &&
    !isDateBeforeNow(row.expires_at, now) &&
    Boolean(venue) &&
    hasCoordinates(
      venue?.latitude ?? null,
      venue?.longitude ?? null
    );

  const pitchReady =
    outingEligible &&
    Boolean(source?.source_url?.trim()) &&
    Boolean(sourceCheck) &&
    !isStale(sourceCheck, now) &&
    !isDateBeforeNow(row.freshness_expires_at, now) &&
    Boolean(venue?.neighbourhood?.trim()) &&
    Boolean(row.ticket_url?.trim() || row.organizer_website?.trim());

  return {
    key: `event:${row.id}`,
    entityType: "event",
    id: row.id,
    slug: row.slug,
    name: row.title,
    category: row.primary_category,
    status: row.status,
    verificationStatus: row.verification_status,
    neighbourhood: venue?.neighbourhood ?? null,
    sourceCheckedAt: sourceCheck,
    primarySourceUrl: source?.source_url ?? null,
    outingEligible,
    pitchReady,
    issues,
    publicPath: `/listings/${row.slug}`
  };
}

function normalizeFilter(filter: DataHealthFilter): Required<DataHealthFilter> {
  const entityType =
    filter.entityType === "place" || filter.entityType === "event"
      ? filter.entityType
      : "all";

  const issueCode = DATA_HEALTH_ISSUES.includes(
    filter.issue as DataHealthIssueCode
  )
    ? (filter.issue as DataHealthIssueCode)
    : "all";

  const validStatuses = new Set([
    "all",
    "published",
    "draft",
    "closed",
    "expired"
  ]);

  const status = validStatuses.has(filter.status ?? "all")
    ? (filter.status ?? "all")
    : "all";

  const search = filter.search?.trim().slice(0, 100) ?? "";
  const rawLimit = Number(filter.limit ?? 200);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(Math.trunc(rawLimit), 500))
    : 200;

  return {
    entityType,
    issue: issueCode,
    status: status as Required<DataHealthFilter>["status"],
    search,
    limit
  };
}

function matchesStatusFilter(
  record: DataHealthRecord,
  status: Required<DataHealthFilter>["status"]
): boolean {
  switch (status) {
    case "published":
      return record.status === "published";
    case "draft":
      return record.status === "draft";
    case "closed":
      return record.issues.some((current) => current.code === "closed-place");
    case "expired":
      return record.issues.some(
        (current) =>
          current.code === "expired-event" ||
          current.code === "past-event" ||
          current.code === "expired-freshness"
      );
    default:
      return true;
  }
}

function calculateMetrics(records: DataHealthRecord[]): DataHealthMetrics {
  const countIssue = (code: DataHealthIssueCode) =>
    records.filter((record) =>
      record.issues.some((current) => current.code === code)
    ).length;

  const events = records.filter((record) => record.entityType === "event");

  return {
    totalRecords: records.length,
    totalPlaces: records.filter((record) => record.entityType === "place").length,
    totalEvents: events.length,
    publishedPlaces: records.filter(
      (record) => record.entityType === "place" && record.status === "published"
    ).length,
    publishedEvents: events.filter((record) => record.status === "published").length,
    outingEligible: records.filter((record) => record.outingEligible).length,
    pitchReady: records.filter((record) => record.pitchReady).length,
    needsAttention: records.filter((record) => record.issues.length > 0).length,
    publishedNeedsAttention: records.filter(
      (record) => record.status === "published" && record.issues.length > 0
    ).length,
    missingHours:
      countIssue("missing-hours") + countIssue("invalid-hours"),
    missingCoordinates: countIssue("missing-coordinates"),
    missingSources: countIssue("missing-source"),
    unverified: countIssue("unverified"),
    staleSources: countIssue("stale-source"),
    futureEvents: events.filter(
      (record) =>
        record.status === "published" &&
        !record.issues.some(
          (current) =>
            current.code === "past-event" || current.code === "expired-event"
        )
    ).length,
    expiredEvents: events.filter((record) =>
      record.issues.some(
        (current) =>
          current.code === "past-event" || current.code === "expired-event"
      )
    ).length
  };
}

function calculateIssueCounts(
  records: DataHealthRecord[]
): Partial<Record<DataHealthIssueCode, number>> {
  const counts: Partial<Record<DataHealthIssueCode, number>> = {};

  for (const record of records) {
    for (const currentIssue of record.issues) {
      counts[currentIssue.code] = (counts[currentIssue.code] ?? 0) + 1;
    }
  }

  return counts;
}

export async function getDataHealthReport(
  filter: DataHealthFilter = {}
): Promise<DataHealthReport> {
  const normalizedFilter = normalizeFilter(filter);
  const now = new Date();

  const [places, events, listingSources] = await Promise.all([
    fetchAllRows<PlaceRow>(
      "places",
      `
        id,
        slug,
        name,
        place_type,
        primary_category,
        status,
        verification_status,
        open_status,
        neighbourhood,
        latitude,
        longitude,
        weekly_hours,
        price_level,
        source_checked_at,
        freshness_expires_at
      `
    ),
    fetchAllRows<EventRow>(
      "events",
      `
        id,
        slug,
        title,
        primary_category,
        status,
        verification_status,
        start_at,
        end_at,
        expires_at,
        ticket_url,
        organizer_website,
        source_checked_at,
        freshness_expires_at,
        venue:places (
          id,
          slug,
          name,
          neighbourhood,
          latitude,
          longitude
        )
      `
    ),
    fetchAllRows<ListingSourceRow>(
      "listing_sources",
      `
        entity_type,
        entity_id,
        source_url,
        is_primary,
        last_checked_at
      `
    )
  ]);

  const sourceMap = getPrimarySourceMap(listingSources);

  const allRecords = [
    ...places.map((row) =>
      createPlaceRecord(row, sourceMap.get(`place:${row.id}`), now)
    ),
    ...events.map((row) =>
      createEventRecord(row, sourceMap.get(`event:${row.id}`), now)
    )
  ].sort((first, second) => {
    const getQueueGroup = (record: DataHealthRecord): number => {
      if (record.pitchReady) {
        return 4;
      }

      if (record.status === "published" && record.outingEligible) {
        return 0;
      }

      if (record.status === "published") {
        return 1;
      }

      if (record.status === "draft") {
        return 2;
      }

      return 3;
    };

    const firstGroup = getQueueGroup(first);
    const secondGroup = getQueueGroup(second);

    if (firstGroup !== secondGroup) {
      return firstGroup - secondGroup;
    }

    const severityWeight = { high: 3, medium: 2, low: 1 } as const;
    const getIssueScore = (record: DataHealthRecord): number =>
      record.issues.reduce(
        (total, current) => total + severityWeight[current.severity],
        0
      );

    const issueScoreDifference = getIssueScore(second) - getIssueScore(first);

    if (issueScoreDifference !== 0) {
      return issueScoreDifference;
    }

    return first.name.localeCompare(second.name);
  });

  const metrics = calculateMetrics(allRecords);
  const issueCounts = calculateIssueCounts(allRecords);
  const normalizedSearch = normalizedFilter.search.toLowerCase();

  const matchingRecords = allRecords.filter((record) => {
    if (
      normalizedFilter.entityType !== "all" &&
      record.entityType !== normalizedFilter.entityType
    ) {
      return false;
    }

    if (
      normalizedFilter.issue !== "all" &&
      !record.issues.some(
        (current) => current.code === normalizedFilter.issue
      )
    ) {
      return false;
    }

    if (!matchesStatusFilter(record, normalizedFilter.status)) {
      return false;
    }

    if (
      normalizedSearch &&
      ![
        record.name,
        record.category,
        record.neighbourhood ?? "",
        record.slug
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    ) {
      return false;
    }

    return true;
  });

  return {
    generatedAt: now.toISOString(),
    staleAfterDays: STALE_AFTER_DAYS,
    metrics,
    issueCounts,
    records: matchingRecords.slice(0, normalizedFilter.limit),
    totalMatchingRecords: matchingRecords.length,
    appliedFilter: normalizedFilter
  };
}
