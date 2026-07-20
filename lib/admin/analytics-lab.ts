import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AnalyticsPeriodDays =
  7 | 30 | 90;

export const ANALYTICS_EVENT_TAXONOMY = [
  {
    group: "Session",
    events: [
      ["session_started", "A new 30-minute anonymous browser session began."],
      ["page_view", "A public Venture route became visible."]
    ]
  },
  {
    group: "Discovery",
    events: [
      ["discovery_viewed", "Explore or Tonight was opened."],
      ["listing_detail_opened", "A listing detail page was selected."],
      ["listing_map_selected", "A listing was selected on the discovery map."],
      ["listing_saved", "A listing was added to saved items."],
      ["listing_unsaved", "A listing was removed from saved items."]
    ]
  },
  {
    group: "Outing builder",
    events: [
      ["outing_builder_opened", "The outing builder was opened."],
      ["experiment_exposure", "A visitor was shown one experiment variant."],
      ["outing_generated", "The server produced a complete, partial, or empty plan."],
      ["outing_saved", "A generated outing was saved in the browser."],
      ["outing_unsaved", "A saved generated outing was removed."],
      ["outing_stop_replaced", "A generated stop was replaced."],
      ["outing_stop_added", "A new stop was added to a generated plan."],
      ["outing_shared", "A shareable outing link was created."],
      ["shared_outing_viewed", "A shared outing link was opened."]
    ]
  },
  {
    group: "Conversion and voice",
    events: [
      ["newsletter_signup", "Newsletter signup completed or was already active."],
      ["report_submitted", "A listing correction report was submitted."],
      ["feedback_opened", "The beta feedback form was opened."],
      ["feedback_submitted", "Beta feedback was submitted."]
    ]
  }
] as const;

export const ANALYTICS_METRIC_GLOSSARY = [
  {
    metric: "Active visitor",
    definition:
      "A unique anonymous visitor ID with at least one event in the selected period.",
    denominator: "Unique visitor IDs, with legacy sessions used only when visitor IDs are unavailable."
  },
  {
    metric: "Session",
    definition:
      "A browser visit grouped under one anonymous session ID. The client rotates the ID after 30 minutes of inactivity.",
    denominator: "Distinct session IDs."
  },
  {
    metric: "Bounce rate",
    definition:
      "The percentage of sessions with one or fewer page views.",
    denominator: "All sessions in the selected period."
  },
  {
    metric: "Average session depth",
    definition:
      "Average number of public page views recorded per session.",
    denominator: "Page views divided by sessions."
  },
  {
    metric: "Outing completion rate",
    definition:
      "The share of generated outing plans whose planStatus is complete.",
    denominator: "All outing_generated events."
  },
  {
    metric: "Week N retention",
    definition:
      "The percentage of a first-seen visitor cohort active again N calendar weeks after its first week.",
    denominator: "Anonymous visitors in that first-seen cohort."
  }
] as const;

type EventProperties =
  Record<string, unknown>;

export type AnalyticsEventRow = {
  id: number;
  session_id: string;
  visitor_id: string | null;
  event_name: string;
  page_path: string;
  properties: EventProperties;
  event_version: number;
  client_created_at: string | null;
  created_at: string;
};

export type AnalyticsFeedbackRow = {
  id: string;
  session_id: string;
  page_path: string;
  category: string;
  rating: number | null;
  message: string;
  contact_email: string | null;
  permission_to_contact: boolean;
  status: string;
  created_at: string;
};

type PlaceRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  neighbourhood: string | null;
  primary_category: string;
  verification_status: string;
  source_checked_at: string | null;
};

type EventInventoryRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  primary_category: string;
  verification_status: string;
  start_at: string;
  end_at: string | null;
  venue:
    | { neighbourhood: string | null }
    | Array<{ neighbourhood: string | null }>
    | null;
};

export type AnalyticsLab = {
  configured: boolean;
  migrationRequired: boolean;
  error: string | null;
  generatedAt: string;
  periodDays: AnalyticsPeriodDays;
  since: string;
  sampleWarning: string | null;
  overview: {
    visitors: number;
    sessions: number;
    pageViews: number;
    newVisitors: number;
    returningVisitors: number;
    averageSessionDepth: number;
    bounceRate: number;
    outingsGenerated: number;
    outingCompletionRate: number | null;
    shares: number;
    feedbackCount: number;
  };
  daily: Array<{
    date: string;
    visitors: number;
    sessions: number;
    pageViews: number;
    outings: number;
  }>;
  devices: Array<{
    label: string;
    sessions: number;
    percentage: number;
  }>;
  referrers: Array<{
    label: string;
    sessions: number;
  }>;
  funnel: Array<{
    key: string;
    label: string;
    sessions: number;
    overallRate: number;
    previousRate: number;
    dropoff: number;
  }>;
  retention: {
    trackedVisitors: number;
    excludedLegacySessions: number;
    cohorts: Array<{
      cohort: string;
      size: number;
      weeks: Array<{
        week: number;
        retained: number | null;
        percentage: number | null;
        observable: boolean;
      }>;
    }>;
  };
  inventory: {
    places: number;
    events: number;
    publishedPlaces: number;
    publishedEvents: number;
    upcomingEvents: number;
    neighbourhoods: Array<{
      name: string;
      listings: number;
      published: number;
      views: number;
      saves: number;
    }>;
    categories: Array<{
      name: string;
      listings: number;
      published: number;
    }>;
    topListings: Array<{
      id: string;
      name: string;
      type: string;
      views: number;
      saves: number;
      saveRate: number | null;
    }>;
    outingOutcomes: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    upcomingByWeek: Array<{
      week: string;
      count: number;
    }>;
  };
  feedback: {
    count: number;
    averageRating: number | null;
    categories: Array<{
      name: string;
      count: number;
    }>;
    ratings: Array<{
      rating: number;
      count: number;
    }>;
    negativePages: Array<{
      path: string;
      count: number;
      averageRating: number;
    }>;
    keywords: Array<{
      word: string;
      count: number;
    }>;
    recent: AnalyticsFeedbackRow[];
  };
};

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;
const MIN_RELIABLE_SESSIONS = 20;
const TRUSTED = new Set([
  "official_source",
  "verified_venture",
  "verified_business"
]);

function percent(
  part: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round(
    (part / total) * 100
  );
}

function rounded(
  value: number,
  digits = 1
): number {
  return Number(value.toFixed(digits));
}

function asString(
  value: unknown,
  fallback = ""
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function asNumber(
  value: unknown
): number | null {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : null;
}

function getVisitorKey(
  event: AnalyticsEventRow
): string {
  return event.visitor_id ||
    `legacy:${event.session_id}`;
}

function startOfUtcDay(
  value: Date
): Date {
  return new Date(Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate()
  ));
}

function startOfUtcWeek(
  value: Date
): Date {
  const day = value.getUTCDay();
  const mondayOffset =
    day === 0 ? -6 : 1 - day;

  const result = startOfUtcDay(value);
  result.setUTCDate(
    result.getUTCDate() + mondayOffset
  );

  return result;
}

function dateKey(
  value: Date
): string {
  return value.toISOString().slice(0, 10);
}

function winnipegDateKey(
  value: Date
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Winnipeg",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(value);
}

function weekDistance(
  first: Date,
  second: Date
): number {
  return Math.floor(
    (
      startOfUtcWeek(second).getTime() -
      startOfUtcWeek(first).getTime()
    ) /
    (7 * 24 * 60 * 60 * 1000)
  );
}

async function fetchPaged<T>({
  table,
  select,
  orderColumn = "created_at",
  ascending = true,
  limit = MAX_ROWS
}: {
  table: string;
  select: string;
  orderColumn?: string;
  ascending?: boolean;
  limit?: number;
}): Promise<{
  rows: T[];
  error: {
    code?: string;
    message?: string;
  } | null;
}> {
  const supabase =
    getSupabaseAdminClient();
  const rows: T[] = [];

  for (
    let from = 0;
    from < limit;
    from += PAGE_SIZE
  ) {
    const result =
      await supabase
        .from(table)
        .select(select)
        .order(
          orderColumn,
          { ascending }
        )
        .range(
          from,
          Math.min(
            from + PAGE_SIZE - 1,
            limit - 1
          )
        );

    if (result.error) {
      return {
        rows,
        error: result.error
      };
    }

    const page =
      (result.data || []) as unknown as T[];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return {
    rows,
    error: null
  };
}

async function loadEvents(): Promise<{
  rows: AnalyticsEventRow[];
  migrationRequired: boolean;
  error: string | null;
}> {
  const expanded =
    await fetchPaged<AnalyticsEventRow>({
      table: "beta_events",
      select:
        "id, session_id, visitor_id, event_name, page_path, properties, event_version, client_created_at, created_at"
    });

  if (!expanded.error) {
    return {
      rows: expanded.rows,
      migrationRequired: false,
      error: null
    };
  }

  if (
    expanded.error.code === "42P01"
  ) {
    return {
      rows: [],
      migrationRequired: true,
      error:
        "Run the beta feedback and Analytics Lab Supabase migrations."
    };
  }

  if (
    expanded.error.code === "42703" ||
    expanded.error.code === "PGRST204"
  ) {
    type LegacyEvent = Omit<
      AnalyticsEventRow,
      "visitor_id" |
      "event_version" |
      "client_created_at"
    >;

    const legacy =
      await fetchPaged<LegacyEvent>({
        table: "beta_events",
        select:
          "id, session_id, event_name, page_path, properties, created_at"
      });

    if (legacy.error) {
      return {
        rows: [],
        migrationRequired: true,
        error:
          "Venture could not load analytics events."
      };
    }

    return {
      rows: legacy.rows.map(
        (event) => ({
          ...event,
          visitor_id: null,
          event_version: 1,
          client_created_at: null
        })
      ),
      migrationRequired: true,
      error: null
    };
  }

  return {
    rows: [],
    migrationRequired: false,
    error:
      expanded.error.message ||
      "Venture could not load analytics events."
  };
}

async function loadFeedback():
  Promise<AnalyticsFeedbackRow[]> {
  const result =
    await fetchPaged<AnalyticsFeedbackRow>({
      table: "beta_feedback",
      select:
        "id, session_id, page_path, category, rating, message, contact_email, permission_to_contact, status, created_at",
      ascending: false,
      limit: 10000
    });

  if (result.error) {
    if (result.error.code === "42P01") {
      return [];
    }

    throw new Error(
      result.error.message ||
      "Unable to load beta feedback."
    );
  }

  return result.rows;
}

async function loadInventory(): Promise<{
  places: PlaceRow[];
  events: EventInventoryRow[];
}> {
  const [places, events] =
    await Promise.all([
      fetchPaged<PlaceRow>({
        table: "places",
        select:
          "id, name, slug, status, neighbourhood, primary_category, verification_status, source_checked_at",
        orderColumn: "name",
        limit: 10000
      }),
      fetchPaged<EventInventoryRow>({
        table: "events",
        select:
          "id, title, slug, status, primary_category, verification_status, start_at, end_at, venue:places(neighbourhood)",
        orderColumn: "start_at",
        limit: 10000
      })
    ]);

  return {
    places:
      places.error ? [] : places.rows,
    events:
      events.error ? [] : events.rows
  };
}

function getVenueNeighbourhood(
  venue: EventInventoryRow["venue"]
): string {
  if (Array.isArray(venue)) {
    return venue[0]?.neighbourhood ||
      "Neighbourhood missing";
  }

  return venue?.neighbourhood ||
    "Neighbourhood missing";
}

function buildDaily(
  events: AnalyticsEventRow[],
  days: number
): AnalyticsLab["daily"] {
  const todayKey =
    winnipegDateKey(new Date());

  const now =
    new Date(`${todayKey}T12:00:00Z`);

  const result:
    AnalyticsLab["daily"] = [];

  for (
    let offset = days - 1;
    offset >= 0;
    offset -= 1
  ) {
    const day = new Date(now);
    day.setUTCDate(
      day.getUTCDate() - offset
    );

    const key = dateKey(day);
    const rows = events.filter(
      (event) =>
        winnipegDateKey(
          new Date(event.created_at)
        ) === key
    );

    result.push({
      date: key,
      visitors:
        new Set(
          rows.map(getVisitorKey)
        ).size,
      sessions:
        new Set(
          rows.map(
            (event) => event.session_id
          )
        ).size,
      pageViews:
        rows.filter(
          (event) =>
            event.event_name === "page_view"
        ).length,
      outings:
        rows.filter(
          (event) =>
            event.event_name === "outing_generated"
        ).length
    });
  }

  return result;
}

function buildFunnel(
  events: AnalyticsEventRow[]
): AnalyticsLab["funnel"] {
  const stages = [
    {
      key: "visit",
      label: "Visited Venture",
      matches: (event: AnalyticsEventRow) =>
        event.event_name === "page_view" ||
        event.event_name === "session_started"
    },
    {
      key: "discover",
      label: "Explored discovery",
      matches: (event: AnalyticsEventRow) =>
        [
          "discovery_viewed",
          "listing_map_selected",
          "listing_detail_opened"
        ].includes(event.event_name)
    },
    {
      key: "listing",
      label: "Opened a listing",
      matches: (event: AnalyticsEventRow) =>
        event.event_name ===
          "listing_detail_opened"
    },
    {
      key: "builder",
      label: "Opened outing builder",
      matches: (event: AnalyticsEventRow) =>
        event.event_name ===
          "outing_builder_opened"
    },
    {
      key: "generated",
      label: "Generated an outing",
      matches: (event: AnalyticsEventRow) =>
        event.event_name ===
          "outing_generated"
    },
    {
      key: "value",
      label: "Saved, shared, or joined",
      matches: (event: AnalyticsEventRow) =>
        [
          "listing_saved",
          "outing_shared",
          "newsletter_signup",
          "feedback_submitted"
        ].includes(event.event_name)
    }
  ];

  const sessions =
    new Map<string, AnalyticsEventRow[]>();

  for (const event of events) {
    const current =
      sessions.get(event.session_id) || [];

    current.push(event);
    sessions.set(
      event.session_id,
      current
    );
  }

  const counts =
    stages.map(() => 0);

  for (const rows of sessions.values()) {
    const ordered = rows
      .slice()
      .sort(
        (first, second) =>
          new Date(first.created_at).getTime() -
          new Date(second.created_at).getTime()
      );

    let stageIndex = 0;

    for (const event of ordered) {
      if (
        stageIndex < stages.length &&
        stages[stageIndex].matches(event)
      ) {
        counts[stageIndex] += 1;
        stageIndex += 1;
      }
    }
  }

  const total = counts[0] || sessions.size;

  return stages.map((stage, index) => {
    const previous =
      index === 0
        ? total
        : counts[index - 1];

    return {
      key: stage.key,
      label: stage.label,
      sessions: counts[index],
      overallRate:
        percent(counts[index], total),
      previousRate:
        index === 0
          ? 100
          : percent(
              counts[index],
              previous
            ),
      dropoff:
        index === 0
          ? 0
          : Math.max(
              0,
              previous - counts[index]
            )
    };
  });
}

function buildRetention(
  allEvents: AnalyticsEventRow[]
): AnalyticsLab["retention"] {
  const withVisitor =
    allEvents.filter(
      (event) => Boolean(event.visitor_id)
    );

  const visitors =
    new Map<
      string,
      {
        first: Date;
        weeks: Set<string>;
      }
    >();

  for (const event of withVisitor) {
    const id = event.visitor_id as string;
    const date = new Date(event.created_at);
    const week =
      dateKey(startOfUtcWeek(date));
    const current =
      visitors.get(id);

    if (!current) {
      visitors.set(id, {
        first: date,
        weeks: new Set([week])
      });
      continue;
    }

    if (date < current.first) {
      current.first = date;
    }

    current.weeks.add(week);
  }

  const nowWeek =
    startOfUtcWeek(new Date());
  const cohortMap =
    new Map<string, string[]>();

  for (const [visitor, value] of visitors) {
    const cohort =
      dateKey(startOfUtcWeek(value.first));
    const distance =
      weekDistance(
        new Date(cohort),
        nowWeek
      );

    if (distance < 0 || distance > 11) {
      continue;
    }

    const current =
      cohortMap.get(cohort) || [];

    current.push(visitor);
    cohortMap.set(cohort, current);
  }

  const cohorts =
    Array.from(cohortMap.entries())
      .sort(
        ([first], [second]) =>
          second.localeCompare(first)
      )
      .map(([cohort, ids]) => ({
        cohort,
        size: ids.length,
        weeks:
          [0, 1, 2, 3, 4].map(
            (week) => {
              const target =
                new Date(cohort);

              target.setUTCDate(
                target.getUTCDate() +
                week * 7
              );

              const observable =
                target <= nowWeek;

              if (!observable) {
                return {
                  week,
                  retained: null,
                  percentage: null,
                  observable: false
                };
              }

              const retained =
                ids.filter((id) => {
                  const value =
                    visitors.get(id);

                  return Boolean(
                    value?.weeks.has(
                      dateKey(target)
                    )
                  );
                }).length;

              return {
                week,
                retained,
                percentage:
                  percent(retained, ids.length),
                observable: true
              };
            }
          )
      }));

  return {
    trackedVisitors: visitors.size,
    excludedLegacySessions:
      new Set(
        allEvents
          .filter(
            (event) => !event.visitor_id
          )
          .map(
            (event) => event.session_id
          )
      ).size,
    cohorts
  };
}

function buildInventory(
  places: PlaceRow[],
  eventRows: EventInventoryRow[],
  analyticsEvents: AnalyticsEventRow[]
): AnalyticsLab["inventory"] {
  const neighbourhoodMap =
    new Map<
      string,
      {
        listings: number;
        published: number;
        views: number;
        saves: number;
      }
    >();

  const categoryMap =
    new Map<
      string,
      {
        listings: number;
        published: number;
      }
    >();

  function addInventory(
    neighbourhood: string,
    category: string,
    published: boolean
  ) {
    const area =
      neighbourhood.trim() ||
      "Neighbourhood missing";

    const areaValue =
      neighbourhoodMap.get(area) || {
        listings: 0,
        published: 0,
        views: 0,
        saves: 0
      };

    areaValue.listings += 1;
    areaValue.published +=
      published ? 1 : 0;

    neighbourhoodMap.set(
      area,
      areaValue
    );

    const categoryName =
      category.trim() ||
      "Uncategorized";

    const categoryValue =
      categoryMap.get(categoryName) || {
        listings: 0,
        published: 0
      };

    categoryValue.listings += 1;
    categoryValue.published +=
      published ? 1 : 0;

    categoryMap.set(
      categoryName,
      categoryValue
    );
  }

  for (const place of places) {
    addInventory(
      place.neighbourhood ||
        "Neighbourhood missing",
      place.primary_category,
      place.status === "published"
    );
  }

  for (const event of eventRows) {
    addInventory(
      getVenueNeighbourhood(event.venue),
      event.primary_category,
      event.status === "published"
    );
  }

  const listingMap =
    new Map<
      string,
      {
        id: string;
        name: string;
        type: string;
        views: number;
        saves: number;
      }
    >();

  for (const event of analyticsEvents) {
    const listingId =
      asString(
        event.properties.listingId
      );

    if (!listingId) {
      continue;
    }

    const current =
      listingMap.get(listingId) || {
        id: listingId,
        name:
          asString(
            event.properties.listingName,
            "Unknown listing"
          ),
        type:
          asString(
            event.properties.listingType,
            "listing"
          ),
        views: 0,
        saves: 0
      };

    if (
      event.event_name ===
        "listing_detail_opened"
    ) {
      current.views += 1;
    }

    if (
      event.event_name ===
        "listing_saved"
    ) {
      current.saves += 1;
    }

    listingMap.set(
      listingId,
      current
    );

    const area =
      asString(
        event.properties.neighbourhood,
        "Neighbourhood missing"
      );

    const areaValue =
      neighbourhoodMap.get(area);

    if (areaValue) {
      if (
        event.event_name ===
          "listing_detail_opened"
      ) {
        areaValue.views += 1;
      }

      if (
        event.event_name ===
          "listing_saved"
      ) {
        areaValue.saves += 1;
      }
    }
  }

  const outcomes =
    analyticsEvents.filter(
      (event) =>
        event.event_name ===
          "outing_generated"
    );

  const outcomeCounts =
    new Map<string, number>();

  for (const event of outcomes) {
    const status =
      asString(
        event.properties.planStatus,
        "unknown"
      );

    outcomeCounts.set(
      status,
      (outcomeCounts.get(status) || 0) + 1
    );
  }

  const now = new Date();
  const nextSixWeeks =
    Array.from(
      { length: 6 },
      (_, index) => {
        const week =
          startOfUtcWeek(now);

        week.setUTCDate(
          week.getUTCDate() + index * 7
        );

        return dateKey(week);
      }
    );

  const upcomingByWeek =
    nextSixWeeks.map((week) => {
      const start = new Date(week);
      const end = new Date(start);
      end.setUTCDate(
        end.getUTCDate() + 7
      );

      return {
        week,
        count:
          eventRows.filter((event) => {
            const startAt =
              new Date(event.start_at);

            return (
              event.status === "published" &&
              startAt >= start &&
              startAt < end
            );
          }).length
      };
    });

  return {
    places: places.length,
    events: eventRows.length,
    publishedPlaces:
      places.filter(
        (place) =>
          place.status === "published"
      ).length,
    publishedEvents:
      eventRows.filter(
        (event) =>
          event.status === "published"
      ).length,
    upcomingEvents:
      eventRows.filter(
        (event) =>
          event.status === "published" &&
          new Date(event.start_at) >= now
      ).length,
    neighbourhoods:
      Array.from(
        neighbourhoodMap.entries()
      )
        .map(([name, value]) => ({
          name,
          ...value
        }))
        .sort(
          (first, second) =>
            second.published -
            first.published
        ),
    categories:
      Array.from(
        categoryMap.entries()
      )
        .map(([name, value]) => ({
          name,
          ...value
        }))
        .sort(
          (first, second) =>
            second.published -
            first.published
        ),
    topListings:
      Array.from(
        listingMap.values()
      )
        .map((listing) => ({
          ...listing,
          saveRate:
            listing.views > 0
              ? percent(
                  listing.saves,
                  listing.views
                )
              : null
        }))
        .sort(
          (first, second) =>
            second.views +
              second.saves * 2 -
            (
              first.views +
              first.saves * 2
            )
        )
        .slice(0, 20),
    outingOutcomes:
      Array.from(
        outcomeCounts.entries()
      )
        .map(([status, count]) => ({
          status,
          count,
          percentage:
            percent(count, outcomes.length)
        }))
        .sort(
          (first, second) =>
            second.count - first.count
        ),
    upcomingByWeek
  };
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "because",
  "been",
  "before",
  "being",
  "but",
  "can",
  "could",
  "did",
  "does",
  "for",
  "from",
  "have",
  "here",
  "into",
  "just",
  "like",
  "more",
  "not",
  "page",
  "really",
  "should",
  "some",
  "that",
  "the",
  "their",
  "there",
  "they",
  "this",
  "very",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "you",
  "your",
  "venture"
]);

function buildFeedback(
  feedback: AnalyticsFeedbackRow[]
): AnalyticsLab["feedback"] {
  const ratings =
    feedback
      .map((item) => item.rating)
      .filter(
        (value):
          value is number =>
            value !== null
      );

  const categoryMap =
    new Map<string, number>();

  const ratingMap =
    new Map<number, number>();

  const negativePages =
    new Map<
      string,
      {
        count: number;
        ratings: number[];
      }
    >();

  const words =
    new Map<string, number>();

  for (const item of feedback) {
    categoryMap.set(
      item.category,
      (categoryMap.get(item.category) || 0) + 1
    );

    if (item.rating !== null) {
      ratingMap.set(
        item.rating,
        (ratingMap.get(item.rating) || 0) + 1
      );
    }

    if (
      item.rating !== null &&
      item.rating <= 2
    ) {
      const current =
        negativePages.get(item.page_path) || {
          count: 0,
          ratings: []
        };

      current.count += 1;
      current.ratings.push(item.rating);

      negativePages.set(
        item.page_path,
        current
      );
    }

    for (
      const token of
      item.message
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
    ) {
      const word =
        token.replace(/^-+|-+$/g, "");

      if (
        word.length < 4 ||
        STOP_WORDS.has(word) ||
        /^\d+$/.test(word)
      ) {
        continue;
      }

      words.set(
        word,
        (words.get(word) || 0) + 1
      );
    }
  }

  return {
    count: feedback.length,
    averageRating:
      ratings.length > 0
        ? rounded(
            ratings.reduce(
              (sum, value) =>
                sum + value,
              0
            ) / ratings.length
          )
        : null,
    categories:
      Array.from(
        categoryMap.entries()
      )
        .map(([name, count]) => ({
          name,
          count
        }))
        .sort(
          (first, second) =>
            second.count - first.count
        ),
    ratings:
      [1, 2, 3, 4, 5].map(
        (rating) => ({
          rating,
          count:
            ratingMap.get(rating) || 0
        })
      ),
    negativePages:
      Array.from(
        negativePages.entries()
      )
        .map(([path, value]) => ({
          path,
          count: value.count,
          averageRating:
            rounded(
              value.ratings.reduce(
                (sum, rating) =>
                  sum + rating,
                0
              ) /
              value.ratings.length
            )
        }))
        .sort(
          (first, second) =>
            second.count - first.count
        ),
    keywords:
      Array.from(words.entries())
        .map(([word, count]) => ({
          word,
          count
        }))
        .sort(
          (first, second) =>
            second.count - first.count
        )
        .slice(0, 30),
    recent:
      feedback
        .slice()
        .sort(
          (first, second) =>
            new Date(second.created_at).getTime() -
            new Date(first.created_at).getTime()
        )
        .slice(0, 50)
  };
}

export async function getAnalyticsLab(
  periodDays: AnalyticsPeriodDays
): Promise<AnalyticsLab> {
  const generatedAt =
    new Date().toISOString();

  const sinceDate = new Date();
  sinceDate.setUTCDate(
    sinceDate.getUTCDate() -
    periodDays
  );

  const since = sinceDate.toISOString();

  try {
    const [
      eventResult,
      allFeedback,
      inventory
    ] = await Promise.all([
      loadEvents(),
      loadFeedback(),
      loadInventory()
    ]);

    if (eventResult.error) {
      return {
        configured: false,
        migrationRequired:
          eventResult.migrationRequired,
        error: eventResult.error,
        generatedAt,
        periodDays,
        since,
        sampleWarning: null,
        overview: {
          visitors: 0,
          sessions: 0,
          pageViews: 0,
          newVisitors: 0,
          returningVisitors: 0,
          averageSessionDepth: 0,
          bounceRate: 0,
          outingsGenerated: 0,
          outingCompletionRate: null,
          shares: 0,
          feedbackCount: 0
        },
        daily: [],
        devices: [],
        referrers: [],
        funnel: [],
        retention: {
          trackedVisitors: 0,
          excludedLegacySessions: 0,
          cohorts: []
        },
        inventory: buildInventory(
          inventory.places,
          inventory.events,
          []
        ),
        feedback: buildFeedback([])
      };
    }

    const allEvents =
      eventResult.rows;

    const selectedEvents =
      allEvents.filter(
        (event) =>
          event.created_at >= since
      );

    const selectedFeedback =
      allFeedback.filter(
        (item) =>
          item.created_at >= since
      );

    const sessions =
      new Map<string, AnalyticsEventRow[]>();

    for (const event of selectedEvents) {
      const current =
        sessions.get(event.session_id) || [];

      current.push(event);
      sessions.set(
        event.session_id,
        current
      );
    }

    const visitors =
      new Set(
        selectedEvents.map(getVisitorKey)
      );

    const firstSeen =
      new Map<string, string>();

    for (const event of allEvents) {
      const key =
        getVisitorKey(event);
      const current =
        firstSeen.get(key);

      if (
        !current ||
        event.created_at < current
      ) {
        firstSeen.set(
          key,
          event.created_at
        );
      }
    }

    const newVisitors =
      Array.from(visitors)
        .filter(
          (visitor) =>
            (firstSeen.get(visitor) || "") >= since
        ).length;

    const returningVisitors =
      Math.max(
        0,
        visitors.size - newVisitors
      );

    const pageViews =
      selectedEvents.filter(
        (event) =>
          event.event_name ===
            "page_view"
      );

    const bounced =
      Array.from(sessions.values())
        .filter(
          (rows) =>
            rows.filter(
              (event) =>
                event.event_name ===
                  "page_view"
            ).length <= 1
        ).length;

    const generated =
      selectedEvents.filter(
        (event) =>
          event.event_name ===
            "outing_generated"
      );

    const complete =
      generated.filter(
        (event) =>
          asString(
            event.properties.planStatus
          ) === "complete"
      ).length;

    const deviceMap =
      new Map<string, Set<string>>();

    const referrerMap =
      new Map<string, Set<string>>();

    for (
      const [sessionId, rows]
      of sessions
    ) {
      const device =
        rows
          .map(
            (event) =>
              asString(
                event.properties.deviceClass
              )
          )
          .find(Boolean) ||
        "unknown";

      const referrer =
        rows
          .map(
            (event) =>
              asString(
                event.properties.referrerHost
              )
          )
          .find(Boolean) ||
        "unknown";

      const devices =
        deviceMap.get(device) ||
        new Set<string>();

      devices.add(sessionId);
      deviceMap.set(device, devices);

      const referrers =
        referrerMap.get(referrer) ||
        new Set<string>();

      referrers.add(sessionId);
      referrerMap.set(
        referrer,
        referrers
      );
    }

    return {
      configured: true,
      migrationRequired:
        eventResult.migrationRequired,
      error: null,
      generatedAt,
      periodDays,
      since,
      sampleWarning:
        sessions.size <
          MIN_RELIABLE_SESSIONS
          ? `Only ${sessions.size} sessions are in this period. Treat percentages as directional until at least ${MIN_RELIABLE_SESSIONS} sessions are recorded.`
          : null,
      overview: {
        visitors: visitors.size,
        sessions: sessions.size,
        pageViews: pageViews.length,
        newVisitors,
        returningVisitors,
        averageSessionDepth:
          sessions.size > 0
            ? rounded(
                pageViews.length /
                sessions.size
              )
            : 0,
        bounceRate:
          percent(
            bounced,
            sessions.size
          ),
        outingsGenerated:
          generated.length,
        outingCompletionRate:
          generated.length > 0
            ? percent(
                complete,
                generated.length
              )
            : null,
        shares:
          selectedEvents.filter(
            (event) =>
              event.event_name ===
                "outing_shared"
          ).length,
        feedbackCount:
          selectedFeedback.length
      },
      daily:
        buildDaily(
          selectedEvents,
          periodDays
        ),
      devices:
        Array.from(
          deviceMap.entries()
        )
          .map(([label, values]) => ({
            label,
            sessions: values.size,
            percentage:
              percent(
                values.size,
                sessions.size
              )
          }))
          .sort(
            (first, second) =>
              second.sessions -
              first.sessions
          ),
      referrers:
        Array.from(
          referrerMap.entries()
        )
          .map(([label, values]) => ({
            label,
            sessions: values.size
          }))
          .sort(
            (first, second) =>
              second.sessions -
              first.sessions
          )
          .slice(0, 12),
      funnel:
        buildFunnel(selectedEvents),
      retention:
        buildRetention(allEvents),
      inventory:
        buildInventory(
          inventory.places,
          inventory.events,
          selectedEvents
        ),
      feedback:
        buildFeedback(selectedFeedback)
    };
  } catch (error) {
    console.error(
      "Analytics Lab query failed",
      error
    );

    return {
      configured: false,
      migrationRequired: false,
      error:
        "Venture could not load Analytics Lab right now.",
      generatedAt,
      periodDays,
      since,
      sampleWarning: null,
      overview: {
        visitors: 0,
        sessions: 0,
        pageViews: 0,
        newVisitors: 0,
        returningVisitors: 0,
        averageSessionDepth: 0,
        bounceRate: 0,
        outingsGenerated: 0,
        outingCompletionRate: null,
        shares: 0,
        feedbackCount: 0
      },
      daily: [],
      devices: [],
      referrers: [],
      funnel: [],
      retention: {
        trackedVisitors: 0,
        excludedLegacySessions: 0,
        cohorts: []
      },
      inventory: {
        places: 0,
        events: 0,
        publishedPlaces: 0,
        publishedEvents: 0,
        upcomingEvents: 0,
        neighbourhoods: [],
        categories: [],
        topListings: [],
        outingOutcomes: [],
        upcomingByWeek: []
      },
      feedback: {
        count: 0,
        averageRating: null,
        categories: [],
        ratings: [],
        negativePages: [],
        keywords: [],
        recent: []
      }
    };
  }
}


export type AnalyticsExportDataset =
  | "events"
  | "sessions"
  | "feedback"
  | "inventory";

export async function getAnalyticsExportRows(
  dataset: AnalyticsExportDataset,
  periodDays: AnalyticsPeriodDays
): Promise<Array<Record<string, string | number | boolean | null>>> {
  const sinceDate = new Date();
  sinceDate.setUTCDate(
    sinceDate.getUTCDate() - periodDays
  );
  const since = sinceDate.toISOString();

  if (dataset === "feedback") {
    const feedback =
      (await loadFeedback())
        .filter(
          (item) =>
            item.created_at >= since
        );

    return feedback.map((item) => ({
      feedback_id: item.id,
      session_id: item.session_id,
      page_path: item.page_path,
      category: item.category,
      rating: item.rating,
      message: item.message,
      status: item.status,
      contact_email:
        item.permission_to_contact
          ? item.contact_email
          : null,
      permission_to_contact:
        item.permission_to_contact,
      created_at: item.created_at
    }));
  }

  if (dataset === "inventory") {
    const inventory =
      await loadInventory();

    const placeRows =
      inventory.places.map((place) => ({
        entity_type: "place",
        entity_id: place.id,
        name: place.name,
        slug: place.slug,
        status: place.status,
        category: place.primary_category,
        neighbourhood:
          place.neighbourhood,
        verification_status:
          place.verification_status,
        start_at: null
      }));

    const eventRows =
      inventory.events.map((event) => ({
        entity_type: "event",
        entity_id: event.id,
        name: event.title,
        slug: event.slug,
        status: event.status,
        category: event.primary_category,
        neighbourhood:
          getVenueNeighbourhood(
            event.venue
          ),
        verification_status:
          event.verification_status,
        start_at: event.start_at
      }));

    return [
      ...placeRows,
      ...eventRows
    ];
  }

  const result =
    await loadEvents();

  if (result.error) {
    throw new Error(result.error);
  }

  const events =
    result.rows.filter(
      (event) =>
        event.created_at >= since
    );

  if (dataset === "events") {
    return events.map((event) => ({
      event_id: event.id,
      visitor_id: event.visitor_id,
      session_id: event.session_id,
      event_name: event.event_name,
      page_path: event.page_path,
      event_version:
        event.event_version,
      device_class:
        asString(
          event.properties.deviceClass
        ) || null,
      referrer_host:
        asString(
          event.properties.referrerHost
        ) || null,
      listing_id:
        asString(
          event.properties.listingId
        ) || null,
      listing_type:
        asString(
          event.properties.listingType
        ) || null,
      plan_status:
        asString(
          event.properties.planStatus
        ) || null,
      properties_json:
        JSON.stringify(
          event.properties
        ),
      client_created_at:
        event.client_created_at,
      created_at: event.created_at
    }));
  }

  const sessions =
    new Map<
      string,
      AnalyticsEventRow[]
    >();

  for (const event of events) {
    const current =
      sessions.get(event.session_id) || [];

    current.push(event);
    sessions.set(
      event.session_id,
      current
    );
  }

  return Array.from(
    sessions.entries()
  ).map(([sessionId, rows]) => {
    const ordered =
      rows.slice().sort(
        (first, second) =>
          first.created_at.localeCompare(
            second.created_at
          )
      );

    const pageViews =
      ordered.filter(
        (event) =>
          event.event_name ===
            "page_view"
      );

    const start =
      ordered[0]?.created_at || null;
    const end =
      ordered.at(-1)?.created_at || null;

    const durationSeconds =
      start && end
        ? Math.max(
            0,
            Math.round(
              (
                new Date(end).getTime() -
                new Date(start).getTime()
              ) / 1000
            )
          )
        : 0;

    return {
      session_id: sessionId,
      visitor_id:
        ordered.find(
          (event) =>
            Boolean(event.visitor_id)
        )?.visitor_id || null,
      session_started_at: start,
      session_ended_at: end,
      duration_seconds:
        durationSeconds,
      event_count: ordered.length,
      page_view_count:
        pageViews.length,
      entry_path:
        pageViews[0]?.page_path ||
        ordered[0]?.page_path ||
        null,
      exit_path:
        pageViews.at(-1)?.page_path ||
        ordered.at(-1)?.page_path ||
        null,
      device_class:
        ordered
          .map(
            (event) =>
              asString(
                event.properties.deviceClass
              )
          )
          .find(Boolean) || null,
      referrer_host:
        ordered
          .map(
            (event) =>
              asString(
                event.properties.referrerHost
              )
          )
          .find(Boolean) || null,
      bounced:
        pageViews.length <= 1,
      generated_outing:
        ordered.some(
          (event) =>
            event.event_name ===
              "outing_generated"
        ),
      shared_outing:
        ordered.some(
          (event) =>
            event.event_name ===
              "outing_shared"
        ),
      submitted_feedback:
        ordered.some(
          (event) =>
            event.event_name ===
              "feedback_submitted"
        )
    };
  });
}
