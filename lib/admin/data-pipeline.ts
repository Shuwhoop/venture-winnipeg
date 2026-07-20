import "server-only";

import {
  BETA_EVENT_NAMES
} from "@/lib/beta/types";
import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

export type PipelinePeriodDays = 1 | 7 | 30;

export type PipelineIssueCode =
  | "unknown_event"
  | "invalid_version"
  | "legacy_version"
  | "missing_visitor"
  | "duplicate_event"
  | "slow_ingestion"
  | "future_client_time"
  | "invalid_exposure"
  | "missing_recommendation_version"
  | "sequence_warning";

export type PipelineIssue = {
  code: PipelineIssueCode;
  severity: "info" | "warning" | "error";
  label: string;
};

export type PipelineEventRow = {
  id: number;
  session_id: string;
  visitor_id: string | null;
  event_name: string;
  page_path: string;
  properties: Record<string, unknown>;
  event_version: number;
  client_created_at: string | null;
  created_at: string;
};

export type PipelineEventDiagnostic = {
  id: number;
  eventName: string;
  pagePath: string;
  sessionId: string;
  visitorId: string | null;
  createdAt: string;
  clientCreatedAt: string | null;
  eventVersion: number;
  environment: string;
  source: string;
  latencyMs: number | null;
  properties: Record<string, unknown>;
  issues: PipelineIssue[];
};

export type DataPipelineLab = {
  configured: boolean;
  migrationRequired: boolean;
  error: string | null;
  generatedAt: string;
  periodDays: PipelinePeriodDays;
  since: string;
  truncated: boolean;
  qualityScore: number | null;
  qualityLabel: string;
  totals: {
    selectedPeriod: number;
    lastHour: number;
    last24Hours: number;
    sessions: number;
    visitors: number;
    suspicious: number;
  };
  coverage: {
    visitorId: number;
    currentVersion: number;
    clientTimestamp: number;
    environment: number;
    recommendationVersion: number | null;
  };
  latency: {
    measured: number;
    medianMs: number | null;
    p95Ms: number | null;
    slowEvents: number;
    futureEvents: number;
  };
  issues: Array<{
    code: PipelineIssueCode;
    label: string;
    severity: PipelineIssue["severity"];
    count: number;
    percentage: number;
  }>;
  environments: Array<{
    name: string;
    events: number;
    percentage: number;
  }>;
  eventNames: Array<{
    name: string;
    events: number;
    percentage: number;
  }>;
  hourly: Array<{
    hour: string;
    events: number;
  }>;
  experiments: {
    exposures: number;
    validExposures: number;
    duplicateExposures: number;
    exposuresWithPrimaryOutcome: number;
    exposuresWithoutPrimaryOutcome: number;
  };
  recommendations: {
    generated: number;
    versionedGenerated: number;
    outcomeEvents: number;
    versionedOutcomeEvents: number;
    versions: Array<{
      name: string;
      events: number;
    }>;
  };
  sequences: Array<{
    label: string;
    count: number;
  }>;
  recent: PipelineEventDiagnostic[];
  suspicious: PipelineEventDiagnostic[];
};

export type PipelineExportDataset =
  | "events"
  | "suspicious";

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;
const CURRENT_EVENT_VERSION = 2;
const DUPLICATE_WINDOW_MS = 5000;
const SLOW_INGESTION_MS = 5 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 60 * 1000;

const KNOWN_EVENTS = new Set<string>(
  BETA_EVENT_NAMES
);

const OUTING_OUTCOME_EVENTS = new Set([
  "outing_saved",
  "outing_shared",
  "outing_stop_replaced",
  "outing_stop_added"
]);

const ISSUE_META: Record<
  PipelineIssueCode,
  {
    label: string;
    severity: PipelineIssue["severity"];
  }
> = {
  unknown_event: {
    label: "Unknown event name",
    severity: "error"
  },
  invalid_version: {
    label: "Invalid event version",
    severity: "error"
  },
  legacy_version: {
    label: "Legacy event version",
    severity: "info"
  },
  missing_visitor: {
    label: "Missing visitor identifier",
    severity: "warning"
  },
  duplicate_event: {
    label: "Probable duplicate event",
    severity: "warning"
  },
  slow_ingestion: {
    label: "Slow analytics ingestion",
    severity: "warning"
  },
  future_client_time: {
    label: "Client timestamp is ahead",
    severity: "warning"
  },
  invalid_exposure: {
    label: "Malformed experiment exposure",
    severity: "error"
  },
  missing_recommendation_version: {
    label: "Missing recommendation version",
    severity: "error"
  },
  sequence_warning: {
    label: "Journey event arrived out of order",
    severity: "warning"
  }
};

function percent(
  part: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Number(
    (part / total * 100).toFixed(1)
  );
}

function percentile(
  values: number[],
  fraction: number
): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort(
    (a, b) => a - b
  );
  const index = Math.min(
    sorted.length - 1,
    Math.max(
      0,
      Math.ceil(sorted.length * fraction) - 1
    )
  );

  return Math.round(sorted[index]);
}

function asString(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function asNumber(
  value: unknown
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function stableStringify(
  value: Record<string, unknown>
): string {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>(
        (result, key) => {
          result[key] = value[key];
          return result;
        },
        {}
      )
  );
}

function eventEnvironment(
  event: PipelineEventRow
): string {
  const direct =
    asString(event.properties.environment) ||
    asString(event.properties.ingestEnvironment);

  return direct || "unknown";
}

function eventSource(
  event: PipelineEventRow
): string {
  const direct =
    asString(event.properties.eventSource);

  if (direct) {
    return direct;
  }

  return event.client_created_at
    ? "client"
    : "server-or-legacy";
}

function eventLatency(
  event: PipelineEventRow
): number | null {
  if (!event.client_created_at) {
    return null;
  }

  const client = new Date(
    event.client_created_at
  ).getTime();
  const server = new Date(
    event.created_at
  ).getTime();

  if (
    !Number.isFinite(client) ||
    !Number.isFinite(server)
  ) {
    return null;
  }

  return server - client;
}

function isRecommendationVersioned(
  event: PipelineEventRow
): boolean {
  const value = asString(
    event.properties.recommendationVersion
  );

  return Boolean(value && value !== "legacy");
}

function issue(
  code: PipelineIssueCode
): PipelineIssue {
  return {
    code,
    ...ISSUE_META[code]
  };
}

async function fetchEvents(
  since: string
): Promise<{
  rows: PipelineEventRow[];
  migrationRequired: boolean;
  truncated: boolean;
  error: string | null;
}> {
  const supabase =
    getSupabaseAdminClient();
  const rows: PipelineEventRow[] = [];

  for (
    let from = 0;
    from < MAX_ROWS;
    from += PAGE_SIZE
  ) {
    const result =
      await supabase
        .from("beta_events")
        .select(
          "id, session_id, visitor_id, event_name, page_path, properties, event_version, client_created_at, created_at"
        )
        .gte("created_at", since)
        .order("created_at", {
          ascending: true
        })
        .range(
          from,
          Math.min(
            from + PAGE_SIZE - 1,
            MAX_ROWS - 1
          )
        );

    if (result.error) {
      if (
        result.error.code === "42P01"
      ) {
        return {
          rows: [],
          migrationRequired: true,
          truncated: false,
          error:
            "Run the beta feedback and Analytics Lab migrations before opening the pipeline monitor."
        };
      }

      if (
        result.error.code === "42703" ||
        result.error.code === "PGRST204"
      ) {
        return {
          rows: [],
          migrationRequired: true,
          truncated: false,
          error:
            "The Analytics Lab migration is missing one or more event-quality columns."
        };
      }

      return {
        rows: [],
        migrationRequired: false,
        truncated: false,
        error:
          result.error.message ||
          "Venture could not load analytics events."
      };
    }

    const page =
      (result.data || []) as unknown as PipelineEventRow[];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return {
        rows,
        migrationRequired: false,
        truncated: false,
        error: null
      };
    }
  }

  return {
    rows,
    migrationRequired: false,
    truncated: rows.length >= MAX_ROWS,
    error: null
  };
}

type ExperimentRegistryRow = {
  slug: string;
  primary_event: string;
};

async function fetchExperimentRegistry():
  Promise<ExperimentRegistryRow[]> {
  const supabase =
    getSupabaseAdminClient();

  const result =
    await supabase
      .from("venture_experiments")
      .select("slug, primary_event")
      .limit(1000);

  if (result.error) {
    return [];
  }

  return (
    result.data || []
  ) as ExperimentRegistryRow[];
}

function addIssue(
  map: Map<number, PipelineIssue[]>,
  eventId: number,
  code: PipelineIssueCode
) {
  const current = map.get(eventId) || [];

  if (!current.some(
    (item) => item.code === code
  )) {
    current.push(issue(code));
    map.set(eventId, current);
  }
}

function qualityLabel(
  score: number | null
): string {
  if (score === null) {
    return "Awaiting events";
  }

  if (score >= 95) {
    return "Excellent";
  }

  if (score >= 85) {
    return "Healthy";
  }

  if (score >= 70) {
    return "Needs attention";
  }

  return "Unreliable";
}

export async function getDataPipelineLab(
  periodDays: PipelinePeriodDays
): Promise<DataPipelineLab> {
  const generatedAt =
    new Date().toISOString();
  const sinceDate = new Date(
    Date.now() -
    periodDays * 24 * 60 * 60 * 1000
  );
  const since = sinceDate.toISOString();

  let loaded: Awaited<ReturnType<typeof fetchEvents>>;

  try {
    loaded = await fetchEvents(since);
  } catch (error) {
    return {
      configured: false,
      migrationRequired: false,
      error:
        error instanceof Error
          ? error.message
          : "Venture could not configure the data pipeline monitor.",
      generatedAt,
      periodDays,
      since,
      truncated: false,
      qualityScore: null,
      qualityLabel: "Unavailable",
      totals: {
        selectedPeriod: 0,
        lastHour: 0,
        last24Hours: 0,
        sessions: 0,
        visitors: 0,
        suspicious: 0
      },
      coverage: {
        visitorId: 0,
        currentVersion: 0,
        clientTimestamp: 0,
        environment: 0,
        recommendationVersion: null
      },
      latency: {
        measured: 0,
        medianMs: null,
        p95Ms: null,
        slowEvents: 0,
        futureEvents: 0
      },
      issues: [],
      environments: [],
      eventNames: [],
      hourly: [],
      experiments: {
        exposures: 0,
        validExposures: 0,
        duplicateExposures: 0,
        exposuresWithPrimaryOutcome: 0,
        exposuresWithoutPrimaryOutcome: 0
      },
      recommendations: {
        generated: 0,
        versionedGenerated: 0,
        outcomeEvents: 0,
        versionedOutcomeEvents: 0,
        versions: []
      },
      sequences: [],
      recent: [],
      suspicious: []
    };
  }

  const events = loaded.rows;
  const issueMap =
    new Map<number, PipelineIssue[]>();
  const duplicateSeen =
    new Map<string, number>();
  const exposureSeen =
    new Set<string>();
  let duplicateExposures = 0;

  for (const event of events) {
    if (!KNOWN_EVENTS.has(event.event_name)) {
      addIssue(
        issueMap,
        event.id,
        "unknown_event"
      );
    }

    if (
      !Number.isInteger(event.event_version) ||
      event.event_version < 1 ||
      event.event_version > CURRENT_EVENT_VERSION
    ) {
      addIssue(
        issueMap,
        event.id,
        "invalid_version"
      );
    } else if (
      event.event_version < CURRENT_EVENT_VERSION
    ) {
      addIssue(
        issueMap,
        event.id,
        "legacy_version"
      );
    }

    if (!event.visitor_id) {
      addIssue(
        issueMap,
        event.id,
        "missing_visitor"
      );
    }

    const latency = eventLatency(event);

    if (
      latency !== null &&
      latency > SLOW_INGESTION_MS
    ) {
      addIssue(
        issueMap,
        event.id,
        "slow_ingestion"
      );
    }

    if (
      latency !== null &&
      latency < -FUTURE_TOLERANCE_MS
    ) {
      addIssue(
        issueMap,
        event.id,
        "future_client_time"
      );
    }

    const signature = [
      event.session_id,
      event.event_name,
      event.page_path,
      stableStringify(event.properties)
    ].join("|");
    const timestamp = new Date(
      event.created_at
    ).getTime();
    const previous =
      duplicateSeen.get(signature);

    if (
      previous !== undefined &&
      timestamp - previous >= 0 &&
      timestamp - previous <= DUPLICATE_WINDOW_MS
    ) {
      addIssue(
        issueMap,
        event.id,
        "duplicate_event"
      );
    }

    duplicateSeen.set(
      signature,
      timestamp
    );

    if (
      event.event_name === "experiment_exposure"
    ) {
      const slug = asString(
        event.properties.experimentSlug
      );
      const variant = asString(
        event.properties.variant
      );
      const assignmentVersion = asNumber(
        event.properties.assignmentVersion
      );

      if (
        !slug ||
        !variant ||
        assignmentVersion === null
      ) {
        addIssue(
          issueMap,
          event.id,
          "invalid_exposure"
        );
      } else {
        const exposureKey = [
          event.session_id,
          slug,
          assignmentVersion
        ].join("|");

        if (exposureSeen.has(exposureKey)) {
          duplicateExposures += 1;
          addIssue(
            issueMap,
            event.id,
            "duplicate_event"
          );
        } else {
          exposureSeen.add(exposureKey);
        }
      }
    }

    if (
      event.event_name === "outing_generated" &&
      !isRecommendationVersioned(event)
    ) {
      addIssue(
        issueMap,
        event.id,
        "missing_recommendation_version"
      );
    }
  }

  const sessionMap =
    new Map<string, PipelineEventRow[]>();

  for (const event of events) {
    const session =
      sessionMap.get(event.session_id) || [];
    session.push(event);
    sessionMap.set(event.session_id, session);
  }

  const sequenceCounts =
    new Map<string, number>();

  function flagSequence(
    event: PipelineEventRow,
    label: string
  ) {
    addIssue(
      issueMap,
      event.id,
      "sequence_warning"
    );
    sequenceCounts.set(
      label,
      (sequenceCounts.get(label) || 0) + 1
    );
  }

  for (const sessionEvents of sessionMap.values()) {
    sessionEvents.sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

    const seen = new Set<string>();

    for (const event of sessionEvents) {
      if (
        event.event_name === "outing_generated" &&
        !seen.has("outing_builder_opened")
      ) {
        flagSequence(
          event,
          "Outing generated before builder-open event"
        );
      }

      if (
        OUTING_OUTCOME_EVENTS.has(event.event_name) &&
        !seen.has("outing_generated")
      ) {
        flagSequence(
          event,
          "Outing outcome without earlier generation"
        );
      }

      if (
        event.event_name === "feedback_submitted" &&
        !seen.has("feedback_opened")
      ) {
        flagSequence(
          event,
          "Feedback submitted without form-open event"
        );
      }

      seen.add(event.event_name);
    }
  }

  const experimentRegistry =
    await fetchExperimentRegistry();
  const primaryBySlug = new Map(
    experimentRegistry.map(
      (experiment) => [
        experiment.slug,
        experiment.primary_event
      ]
    )
  );
  const exposures = events.filter(
    (event) =>
      event.event_name === "experiment_exposure"
  );
  let validExposures = 0;
  let exposuresWithPrimaryOutcome = 0;

  for (const exposure of exposures) {
    const slug = asString(
      exposure.properties.experimentSlug
    );
    const primary =
      primaryBySlug.get(slug);

    if (
      !slug ||
      !asString(exposure.properties.variant) ||
      asNumber(exposure.properties.assignmentVersion) === null
    ) {
      continue;
    }

    validExposures += 1;

    if (!primary) {
      continue;
    }

    const exposureTime = new Date(
      exposure.created_at
    ).getTime();
    const sessionEvents =
      sessionMap.get(exposure.session_id) || [];

    if (
      sessionEvents.some(
        (event) =>
          event.event_name === primary &&
          new Date(event.created_at).getTime() >= exposureTime
      )
    ) {
      exposuresWithPrimaryOutcome += 1;
    }
  }

  const recommendationGenerated =
    events.filter(
      (event) =>
        event.event_name === "outing_generated"
    );
  const recommendationOutcomeEvents =
    events.filter(
      (event) =>
        OUTING_OUTCOME_EVENTS.has(event.event_name)
    );
  const versionCounts = new Map<string, number>();

  for (
    const event of [
      ...recommendationGenerated,
      ...recommendationOutcomeEvents
    ]
  ) {
    const version = asString(
      event.properties.recommendationVersion
    ) || "missing";

    versionCounts.set(
      version,
      (versionCounts.get(version) || 0) + 1
    );
  }

  const diagnostics = events.map(
    (event): PipelineEventDiagnostic => ({
      id: event.id,
      eventName: event.event_name,
      pagePath: event.page_path,
      sessionId: event.session_id,
      visitorId: event.visitor_id,
      createdAt: event.created_at,
      clientCreatedAt: event.client_created_at,
      eventVersion: event.event_version,
      environment: eventEnvironment(event),
      source: eventSource(event),
      latencyMs: eventLatency(event),
      properties: event.properties || {},
      issues: issueMap.get(event.id) || []
    })
  );

  const suspicious = diagnostics.filter(
    (event) =>
      event.issues.some(
        (item) => item.severity !== "info"
      )
  );
  const latencies = diagnostics
    .map((event) => event.latencyMs)
    .filter(
      (value): value is number =>
        value !== null && value >= 0
    );
  const now = Date.now();
  const lastHourBoundary =
    now - 60 * 60 * 1000;
  const lastDayBoundary =
    now - 24 * 60 * 60 * 1000;

  const issueCounts =
    new Map<PipelineIssueCode, number>();

  for (const event of diagnostics) {
    for (const eventIssue of event.issues) {
      issueCounts.set(
        eventIssue.code,
        (issueCounts.get(eventIssue.code) || 0) + 1
      );
    }
  }

  const eventNameCounts = new Map<string, number>();
  const environmentCounts = new Map<string, number>();

  for (const event of diagnostics) {
    eventNameCounts.set(
      event.eventName,
      (eventNameCounts.get(event.eventName) || 0) + 1
    );
    environmentCounts.set(
      event.environment,
      (environmentCounts.get(event.environment) || 0) + 1
    );
  }

  const hourlyMap = new Map<string, number>();

  for (let offset = 23; offset >= 0; offset -= 1) {
    const hour = new Date(
      now - offset * 60 * 60 * 1000
    );
    hour.setUTCMinutes(0, 0, 0);
    hourlyMap.set(
      hour.toISOString(),
      0
    );
  }

  for (const event of events) {
    const time = new Date(event.created_at);

    if (time.getTime() < lastDayBoundary) {
      continue;
    }

    time.setUTCMinutes(0, 0, 0);
    const key = time.toISOString();

    if (hourlyMap.has(key)) {
      hourlyMap.set(
        key,
        (hourlyMap.get(key) || 0) + 1
      );
    }
  }

  const total = diagnostics.length;
  const recommendationCoverage =
    recommendationGenerated.length > 0
      ? percent(
          recommendationGenerated.filter(
            isRecommendationVersioned
          ).length,
          recommendationGenerated.length
        )
      : null;

  const rates = {
    unknown: percent(
      issueCounts.get("unknown_event") || 0,
      total
    ),
    invalidVersion: percent(
      issueCounts.get("invalid_version") || 0,
      total
    ),
    missingVisitor: percent(
      issueCounts.get("missing_visitor") || 0,
      total
    ),
    duplicate: percent(
      issueCounts.get("duplicate_event") || 0,
      total
    ),
    latency: percent(
      (issueCounts.get("slow_ingestion") || 0) +
      (issueCounts.get("future_client_time") || 0),
      total
    ),
    sequence: percent(
      issueCounts.get("sequence_warning") || 0,
      total
    ),
    recommendation: recommendationCoverage === null
      ? 0
      : 100 - recommendationCoverage
  };

  const qualityScore = total === 0
    ? null
    : Math.max(
        0,
        Math.round(
          100 -
          rates.unknown * 0.3 -
          rates.invalidVersion * 0.2 -
          rates.missingVisitor * 0.1 -
          rates.duplicate * 0.15 -
          rates.latency * 0.1 -
          rates.sequence * 0.1 -
          rates.recommendation * 0.05
        )
      );

  return {
    configured: true,
    migrationRequired:
      loaded.migrationRequired,
    error: loaded.error,
    generatedAt,
    periodDays,
    since,
    truncated: loaded.truncated,
    qualityScore,
    qualityLabel: qualityLabel(qualityScore),
    totals: {
      selectedPeriod: total,
      lastHour: events.filter(
        (event) =>
          new Date(event.created_at).getTime() >= lastHourBoundary
      ).length,
      last24Hours: events.filter(
        (event) =>
          new Date(event.created_at).getTime() >= lastDayBoundary
      ).length,
      sessions: new Set(
        events.map((event) => event.session_id)
      ).size,
      visitors: new Set(
        events
          .map((event) => event.visitor_id)
          .filter(Boolean)
      ).size,
      suspicious: suspicious.length
    },
    coverage: {
      visitorId: percent(
        events.filter((event) => Boolean(event.visitor_id)).length,
        total
      ),
      currentVersion: percent(
        events.filter(
          (event) =>
            event.event_version === CURRENT_EVENT_VERSION
        ).length,
        total
      ),
      clientTimestamp: percent(
        events.filter(
          (event) => Boolean(event.client_created_at)
        ).length,
        total
      ),
      environment: percent(
        diagnostics.filter(
          (event) => event.environment !== "unknown"
        ).length,
        total
      ),
      recommendationVersion:
        recommendationCoverage
    },
    latency: {
      measured: latencies.length,
      medianMs: percentile(
        latencies,
        0.5
      ),
      p95Ms: percentile(
        latencies,
        0.95
      ),
      slowEvents:
        issueCounts.get("slow_ingestion") || 0,
      futureEvents:
        issueCounts.get("future_client_time") || 0
    },
    issues: (
      Object.keys(ISSUE_META) as PipelineIssueCode[]
    )
      .map((code) => ({
        code,
        ...ISSUE_META[code],
        count: issueCounts.get(code) || 0,
        percentage: percent(
          issueCounts.get(code) || 0,
          total
        )
      }))
      .filter((item) => item.count > 0)
      .sort(
        (a, b) => b.count - a.count
      ),
    environments: Array.from(
      environmentCounts.entries()
    )
      .map(([name, count]) => ({
        name,
        events: count,
        percentage: percent(count, total)
      }))
      .sort((a, b) => b.events - a.events),
    eventNames: Array.from(
      eventNameCounts.entries()
    )
      .map(([name, count]) => ({
        name,
        events: count,
        percentage: percent(count, total)
      }))
      .sort((a, b) => b.events - a.events),
    hourly: Array.from(
      hourlyMap.entries()
    ).map(([hour, count]) => ({
      hour,
      events: count
    })),
    experiments: {
      exposures: exposures.length,
      validExposures,
      duplicateExposures,
      exposuresWithPrimaryOutcome,
      exposuresWithoutPrimaryOutcome:
        Math.max(
          0,
          validExposures - exposuresWithPrimaryOutcome
        )
    },
    recommendations: {
      generated:
        recommendationGenerated.length,
      versionedGenerated:
        recommendationGenerated.filter(
          isRecommendationVersioned
        ).length,
      outcomeEvents:
        recommendationOutcomeEvents.length,
      versionedOutcomeEvents:
        recommendationOutcomeEvents.filter(
          isRecommendationVersioned
        ).length,
      versions: Array.from(
        versionCounts.entries()
      )
        .map(([name, count]) => ({
          name,
          events: count
        }))
        .sort((a, b) => b.events - a.events)
    },
    sequences: Array.from(
      sequenceCounts.entries()
    )
      .map(([label, count]) => ({
        label,
        count
      }))
      .sort((a, b) => b.count - a.count),
    recent: [...diagnostics]
      .reverse()
      .slice(0, 80),
    suspicious: [...suspicious]
      .reverse()
      .slice(0, 200)
  };
}

export async function getPipelineExportRows(
  dataset: PipelineExportDataset,
  periodDays: PipelinePeriodDays
): Promise<Array<Record<
  string,
  string | number | boolean | null
>>> {
  const lab = await getDataPipelineLab(
    periodDays
  );
  const events = dataset === "suspicious"
    ? lab.suspicious
    : lab.recent;

  return events.map((event) => ({
    id: event.id,
    created_at: event.createdAt,
    client_created_at: event.clientCreatedAt,
    latency_ms: event.latencyMs,
    event_name: event.eventName,
    event_version: event.eventVersion,
    page_path: event.pagePath,
    session_id: event.sessionId,
    visitor_id: event.visitorId,
    environment: event.environment,
    source: event.source,
    issues: event.issues
      .map((item) => item.code)
      .join("|"),
    properties_json:
      JSON.stringify(event.properties)
  }));
}
