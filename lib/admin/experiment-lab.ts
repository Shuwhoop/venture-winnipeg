import "server-only";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";
import type {
  AnalyticsPeriodDays
} from "@/lib/admin/analytics-lab";
import type {
  ExperimentStatus,
  ExperimentVariant
} from "@/lib/experiments/types";

type Primitive =
  | string
  | number
  | boolean
  | null;

type EventRow = {
  id: number;
  session_id: string;
  visitor_id: string | null;
  event_name: string;
  page_path: string;
  properties: Record<string, Primitive>;
  created_at: string;
};

type FeedbackRow = {
  session_id: string;
  rating: number | null;
  page_path: string;
  created_at: string;
};

export type ExperimentRow = {
  id: string;
  slug: string;
  name: string;
  hypothesis: string;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  traffic_percentage: number;
  assignment_version: number;
  primary_event: string;
  guardrail_events: string[];
  minimum_sample_size: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VariantResult = {
  key: string;
  label: string;
  exposures: number;
  conversions: number;
  conversionRate: number;
  confidenceLow: number;
  confidenceHigh: number;
  guardrails: Array<{
    event: string;
    sessions: number;
    rate: number;
  }>;
  negativeFeedback: number;
  negativeFeedbackRate: number;
  minimumReached: boolean;
};

export type ExperimentResult = {
  experiment: ExperimentRow;
  totalExposures: number;
  sampleWarning: string | null;
  variants: VariantResult[];
  comparison: {
    controlKey: string | null;
    variantKey: string | null;
    differencePoints: number | null;
    verdict:
      | "insufficient-sample"
      | "promising"
      | "watch"
      | "no-clear-difference"
      | "not-comparable";
    explanation: string;
  };
};

export type ExperimentLab = {
  configured: boolean;
  migrationRequired: boolean;
  error: string | null;
  generatedAt: string;
  periodDays: AnalyticsPeriodDays;
  experiments: ExperimentResult[];
  totals: {
    experiments: number;
    running: number;
    exposures: number;
    conversions: number;
  };
};

export type RecommendationVersionResult = {
  version: string;
  generated: number;
  sessions: number;
  complete: number;
  partial: number;
  empty: number;
  completionRate: number;
  saveSessions: number;
  saveRate: number;
  shareSessions: number;
  shareRate: number;
  replacementEvents: number;
  positiveFeedbackSessions: number;
  positiveFeedbackRate: number;
  averageStops: number;
  averageCandidates: number;
  averageCategoryDiversity: number;
  averageNeighbourhoodDiversity: number;
  averageStopKindDiversity: number;
  sampleWarning: string | null;
};

export type RecommendationLab = {
  configured: boolean;
  migrationRequired: boolean;
  error: string | null;
  generatedAt: string;
  periodDays: AnalyticsPeriodDays;
  versions: RecommendationVersionResult[];
  totals: {
    generated: number;
    complete: number;
    saves: number;
    shares: number;
  };
};

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

function asString(
  value: unknown,
  fallback = ""
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function asNumber(
  value: unknown,
  fallback = 0
): number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : fallback;
}

function percent(
  part: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Number(
    (
      part /
      total *
      100
    ).toFixed(1)
  );
}

function average(
  values: number[]
): number {
  if (values.length === 0) {
    return 0;
  }

  return Number(
    (
      values.reduce(
        (sum, value) =>
          sum + value,
        0
      ) /
      values.length
    ).toFixed(1)
  );
}

function wilsonInterval(
  successes: number,
  total: number
): {
  low: number;
  high: number;
} {
  if (total <= 0) {
    return {
      low: 0,
      high: 0
    };
  }

  const z = 1.96;
  const rate =
    successes / total;
  const denominator =
    1 +
    z * z / total;
  const center =
    (
      rate +
      z * z /
      (2 * total)
    ) /
    denominator;
  const margin =
    (
      z *
      Math.sqrt(
        rate *
        (1 - rate) /
        total +
        z * z /
        (4 * total * total)
      )
    ) /
    denominator;

  return {
    low: Number(
      (
        Math.max(
          0,
          center - margin
        ) *
        100
      ).toFixed(1)
    ),
    high: Number(
      (
        Math.min(
          1,
          center + margin
        ) *
        100
      ).toFixed(1)
    )
  };
}

function cleanVariants(
  value: unknown
): ExperimentVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        return null;
      }

      const record =
        item as Record<string, unknown>;
      const key =
        asString(record.key).trim();
      const label =
        asString(
          record.label,
          key
        ).trim();
      const weight =
        asNumber(
          record.weight,
          0
        );

      if (
        !key ||
        weight <= 0
      ) {
        return null;
      }

      return {
        key,
        label: label || key,
        weight
      };
    })
    .filter(
      (
        item
      ): item is ExperimentVariant =>
        item !== null
    );
}

function cleanStringArray(
  value: unknown
): string[] {
  return Array.isArray(value)
    ? value
        .filter(
          (item) =>
            typeof item === "string"
        )
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean)
    : [];
}

async function fetchPaged<T>({
  table,
  select,
  since
}: {
  table: string;
  select: string;
  since?: string;
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
    from < MAX_ROWS;
    from += PAGE_SIZE
  ) {
    let query =
      supabase
        .from(table)
        .select(select)
        .order(
          "created_at",
          { ascending: true }
        )
        .range(
          from,
          from + PAGE_SIZE - 1
        );

    if (since) {
      query =
        query.gte(
          "created_at",
          since
        );
    }

    const result =
      await query;

    if (result.error) {
      return {
        rows,
        error: result.error
      };
    }

    const page =
      (result.data ?? []) as T[];

    rows.push(...page);

    if (
      page.length <
      PAGE_SIZE
    ) {
      break;
    }
  }

  return {
    rows,
    error: null
  };
}

async function fetchExperiments(): Promise<{
  rows: ExperimentRow[];
  error: {
    code?: string;
    message?: string;
  } | null;
}> {
  const supabase =
    getSupabaseAdminClient();

  const result =
    await supabase
      .from("venture_experiments")
      .select(
        "id,slug,name,hypothesis,status,variants,traffic_percentage,assignment_version,primary_event,guardrail_events,minimum_sample_size,starts_at,ends_at,created_at,updated_at"
      )
      .order(
        "created_at",
        { ascending: false }
      );

  if (result.error) {
    return {
      rows: [],
      error: result.error
    };
  }

  const rows =
    (result.data ?? [])
      .map((raw) => {
        const record =
          raw as Record<
            string,
            unknown
          >;

        return {
          id:
            asString(record.id),
          slug:
            asString(record.slug),
          name:
            asString(record.name),
          hypothesis:
            asString(
              record.hypothesis
            ),
          status:
            asString(
              record.status,
              "draft"
            ) as ExperimentStatus,
          variants:
            cleanVariants(
              record.variants
            ),
          traffic_percentage:
            asNumber(
              record
                .traffic_percentage,
              100
            ),
          assignment_version:
            asNumber(
              record
                .assignment_version,
              1
            ),
          primary_event:
            asString(
              record.primary_event
            ),
          guardrail_events:
            cleanStringArray(
              record.guardrail_events
            ),
          minimum_sample_size:
            asNumber(
              record
                .minimum_sample_size,
              40
            ),
          starts_at:
            typeof record.starts_at ===
              "string"
              ? record.starts_at
              : null,
          ends_at:
            typeof record.ends_at ===
              "string"
              ? record.ends_at
              : null,
          created_at:
            asString(
              record.created_at
            ),
          updated_at:
            asString(
              record.updated_at
            )
        };
      });

  return {
    rows,
    error: null
  };
}

function getSince(
  days: AnalyticsPeriodDays
): string {
  return new Date(
    Date.now() -
    days *
    24 *
    60 *
    60 *
    1000
  ).toISOString();
}

export async function getExperimentLab(
  periodDays: AnalyticsPeriodDays
): Promise<ExperimentLab> {
  const since =
    getSince(periodDays);

  const [
    experimentsResult,
    eventsResult,
    feedbackResult
  ] =
    await Promise.all([
      fetchExperiments(),
      fetchPaged<EventRow>({
        table: "beta_events",
        select:
          "id,session_id,visitor_id,event_name,page_path,properties,created_at",
        since
      }),
      fetchPaged<FeedbackRow>({
        table: "beta_feedback",
        select:
          "session_id,rating,page_path,created_at",
        since
      })
    ]);

  if (experimentsResult.error) {
    const migrationRequired =
      experimentsResult.error.code ===
        "42P01" ||
      experimentsResult.error.code ===
        "PGRST205";

    return {
      configured: false,
      migrationRequired,
      error:
        migrationRequired
          ? "Apply the Experiment Lab migration to create the private experiment registry."
          : experimentsResult.error.message ||
            "Venture could not load experiments.",
      generatedAt:
        new Date().toISOString(),
      periodDays,
      experiments: [],
      totals: {
        experiments: 0,
        running: 0,
        exposures: 0,
        conversions: 0
      }
    };
  }

  if (eventsResult.error) {
    return {
      configured: false,
      migrationRequired: false,
      error:
        eventsResult.error.message ||
        "Venture could not load experiment events.",
      generatedAt:
        new Date().toISOString(),
      periodDays,
      experiments: [],
      totals: {
        experiments:
          experimentsResult.rows.length,
        running:
          experimentsResult.rows.filter(
            (experiment) =>
              experiment.status ===
              "running"
          ).length,
        exposures: 0,
        conversions: 0
      }
    };
  }

  const feedback =
    feedbackResult.error
      ? []
      : feedbackResult.rows;

  const eventsBySession =
    new Map<string, EventRow[]>();

  for (const event of eventsResult.rows) {
    const list =
      eventsBySession.get(
        event.session_id
      ) ?? [];

    list.push(event);
    eventsBySession.set(
      event.session_id,
      list
    );
  }

  const feedbackBySession =
    new Map<string, FeedbackRow[]>();

  for (const item of feedback) {
    const list =
      feedbackBySession.get(
        item.session_id
      ) ?? [];

    list.push(item);
    feedbackBySession.set(
      item.session_id,
      list
    );
  }

  const firstExposure =
    new Map<
      string,
      {
        event: EventRow;
        slug: string;
        variant: string;
      }
    >();

  for (const event of eventsResult.rows) {
    if (
      event.event_name !==
      "experiment_exposure"
    ) {
      continue;
    }

    const slug =
      asString(
        event.properties
          .experimentSlug
      );

    const variant =
      asString(
        event.properties.variant
      );

    if (!slug || !variant) {
      continue;
    }

    const key =
      `${slug}:${event.session_id}`;

    if (!firstExposure.has(key)) {
      firstExposure.set(
        key,
        {
          event,
          slug,
          variant
        }
      );
    }
  }

  const experiments =
    experimentsResult.rows.map(
      (experiment): ExperimentResult => {
        const variantResults =
          experiment.variants.map(
            (variant): VariantResult => {
              const exposures =
                Array.from(
                  firstExposure.values()
                ).filter(
                  (exposure) =>
                    exposure.slug ===
                      experiment.slug &&
                    exposure.variant ===
                      variant.key
                );

              const conversionSessions =
                new Set<string>();

              const guardrailSessions =
                new Map<
                  string,
                  Set<string>
                >();

              for (
                const eventName
                of experiment.guardrail_events
              ) {
                guardrailSessions.set(
                  eventName,
                  new Set<string>()
                );
              }

              const negativeFeedbackSessions =
                new Set<string>();

              for (
                const exposure
                of exposures
              ) {
                const exposureTime =
                  new Date(
                    exposure.event
                      .created_at
                  ).getTime();

                const sessionEvents =
                  eventsBySession.get(
                    exposure.event
                      .session_id
                  ) ?? [];

                for (
                  const event
                  of sessionEvents
                ) {
                  if (
                    new Date(
                      event.created_at
                    ).getTime() <
                    exposureTime
                  ) {
                    continue;
                  }

                  if (
                    event.event_name ===
                    experiment.primary_event
                  ) {
                    conversionSessions.add(
                      exposure.event
                        .session_id
                    );
                  }

                  const set =
                    guardrailSessions.get(
                      event.event_name
                    );

                  if (set) {
                    set.add(
                      exposure.event
                        .session_id
                    );
                  }
                }

                const sessionFeedback =
                  feedbackBySession.get(
                    exposure.event
                      .session_id
                  ) ?? [];

                if (
                  sessionFeedback.some(
                    (item) =>
                      item.rating !==
                        null &&
                      item.rating <= 2 &&
                      new Date(
                        item.created_at
                      ).getTime() >=
                        exposureTime
                  )
                ) {
                  negativeFeedbackSessions.add(
                    exposure.event
                      .session_id
                  );
                }
              }

              const interval =
                wilsonInterval(
                  conversionSessions.size,
                  exposures.length
                );

              return {
                key: variant.key,
                label:
                  variant.label,
                exposures:
                  exposures.length,
                conversions:
                  conversionSessions.size,
                conversionRate:
                  percent(
                    conversionSessions.size,
                    exposures.length
                  ),
                confidenceLow:
                  interval.low,
                confidenceHigh:
                  interval.high,
                guardrails:
                  experiment
                    .guardrail_events
                    .map(
                      (eventName) => {
                        const sessions =
                          guardrailSessions
                            .get(
                              eventName
                            )?.size ?? 0;

                        return {
                          event:
                            eventName,
                          sessions,
                          rate:
                            percent(
                              sessions,
                              exposures.length
                            )
                        };
                      }
                    ),
                negativeFeedback:
                  negativeFeedbackSessions.size,
                negativeFeedbackRate:
                  percent(
                    negativeFeedbackSessions.size,
                    exposures.length
                  ),
                minimumReached:
                  exposures.length >=
                    experiment
                      .minimum_sample_size
              };
            }
          );

        const control =
          variantResults[0] ??
          null;
        const comparisonVariant =
          variantResults[1] ??
          null;

        let verdict:
          ExperimentResult[
            "comparison"
          ]["verdict"] =
            "not-comparable";

        let explanation =
          "At least two variants are required for comparison.";

        let differencePoints:
          number | null = null;

        if (
          control &&
          comparisonVariant
        ) {
          differencePoints =
            Number(
              (
                comparisonVariant
                  .conversionRate -
                control.conversionRate
              ).toFixed(1)
            );

          if (
            !control.minimumReached ||
            !comparisonVariant
              .minimumReached
          ) {
            verdict =
              "insufficient-sample";
            explanation =
              `Wait until each variant has at least ${experiment.minimum_sample_size} exposures.`;
          } else if (
            comparisonVariant
              .confidenceLow >
            control.confidenceHigh
          ) {
            verdict =
              "promising";
            explanation =
              "The variant interval is currently above the control interval. Treat this as evidence, not an automatic launch decision.";
          } else if (
            comparisonVariant
              .confidenceHigh <
            control.confidenceLow
          ) {
            verdict =
              "watch";
            explanation =
              "The variant interval is currently below the control interval. Check guardrails and implementation quality before stopping.";
          } else {
            verdict =
              "no-clear-difference";
            explanation =
              "The 95% intervals overlap, so the current sample does not show a clear difference.";
          }
        }

        const totalExposures =
          variantResults.reduce(
            (sum, variant) =>
              sum +
              variant.exposures,
            0
          );

        return {
          experiment,
          totalExposures,
          sampleWarning:
            totalExposures <
              experiment.minimum_sample_size *
              experiment.variants.length
              ? `Early read: ${totalExposures} total exposures. The planned minimum is ${experiment.minimum_sample_size} per variant.`
              : null,
          variants:
            variantResults,
          comparison: {
            controlKey:
              control?.key ?? null,
            variantKey:
              comparisonVariant
                ?.key ?? null,
            differencePoints,
            verdict,
            explanation
          }
        };
      }
    );

  return {
    configured: true,
    migrationRequired: false,
    error: null,
    generatedAt:
      new Date().toISOString(),
    periodDays,
    experiments,
    totals: {
      experiments:
        experiments.length,
      running:
        experiments.filter(
          (item) =>
            item.experiment.status ===
            "running"
        ).length,
      exposures:
        experiments.reduce(
          (sum, item) =>
            sum +
            item.totalExposures,
          0
        ),
      conversions:
        experiments.reduce(
          (sum, item) =>
            sum +
            item.variants.reduce(
              (
                variantSum,
                variant
              ) =>
                variantSum +
                variant.conversions,
              0
            ),
          0
        )
    }
  };
}

export async function getRecommendationLab(
  periodDays: AnalyticsPeriodDays
): Promise<RecommendationLab> {
  const since =
    getSince(periodDays);

  const [
    eventsResult,
    feedbackResult
  ] =
    await Promise.all([
      fetchPaged<EventRow>({
        table: "beta_events",
        select:
          "id,session_id,visitor_id,event_name,page_path,properties,created_at",
        since
      }),
      fetchPaged<FeedbackRow>({
        table: "beta_feedback",
        select:
          "session_id,rating,page_path,created_at",
        since
      })
    ]);

  if (eventsResult.error) {
    const migrationRequired =
      eventsResult.error.code ===
        "42P01" ||
      eventsResult.error.code ===
        "PGRST205";

    return {
      configured: false,
      migrationRequired,
      error:
        eventsResult.error.message ||
        "Venture could not load recommendation events.",
      generatedAt:
        new Date().toISOString(),
      periodDays,
      versions: [],
      totals: {
        generated: 0,
        complete: 0,
        saves: 0,
        shares: 0
      }
    };
  }

  const generated =
    eventsResult.rows.filter(
      (event) =>
        event.event_name ===
        "outing_generated"
    );

  const versions =
    Array.from(
      new Set(
        generated.map(
          (event) =>
            asString(
              event.properties
                .recommendationVersion,
              "legacy"
            )
        )
      )
    )
      .sort()
      .map(
        (
          version
        ): RecommendationVersionResult => {
          const versionEvents =
            generated.filter(
              (event) =>
                asString(
                  event.properties
                    .recommendationVersion,
                  "legacy"
                ) === version
            );

          const sessions =
            new Set(
              versionEvents.map(
                (event) =>
                  event.session_id
              )
            );

          const related =
            eventsResult.rows.filter(
              (event) =>
                sessions.has(
                  event.session_id
                )
            );

          const saveSessions =
            new Set(
              related
                .filter(
                  (event) =>
                    event.event_name ===
                    "outing_saved"
                )
                .map(
                  (event) =>
                    event.session_id
                )
            );

          const shareSessions =
            new Set(
              related
                .filter(
                  (event) =>
                    event.event_name ===
                    "outing_shared"
                )
                .map(
                  (event) =>
                    event.session_id
                )
            );

          const positiveFeedbackSessions =
            new Set(
              (
                feedbackResult.error
                  ? []
                  : feedbackResult.rows
              )
                .filter(
                  (item) =>
                    sessions.has(
                      item.session_id
                    ) &&
                    item.rating !==
                      null &&
                    item.rating >= 4
                )
                .map(
                  (item) =>
                    item.session_id
                )
            );

          const statuses =
            versionEvents.map(
              (event) =>
                asString(
                  event.properties
                    .planStatus,
                  "unknown"
                )
            );

          const complete =
            statuses.filter(
              (status) =>
                status === "complete"
            ).length;

          const partial =
            statuses.filter(
              (status) =>
                status === "partial"
            ).length;

          const empty =
            statuses.filter(
              (status) =>
                status === "empty"
            ).length;

          return {
            version,
            generated:
              versionEvents.length,
            sessions:
              sessions.size,
            complete,
            partial,
            empty,
            completionRate:
              percent(
                complete,
                versionEvents.length
              ),
            saveSessions:
              saveSessions.size,
            saveRate:
              percent(
                saveSessions.size,
                sessions.size
              ),
            shareSessions:
              shareSessions.size,
            shareRate:
              percent(
                shareSessions.size,
                sessions.size
              ),
            replacementEvents:
              related.filter(
                (event) =>
                  event.event_name ===
                  "outing_stop_replaced"
              ).length,
            positiveFeedbackSessions:
              positiveFeedbackSessions
                .size,
            positiveFeedbackRate:
              percent(
                positiveFeedbackSessions
                  .size,
                sessions.size
              ),
            averageStops:
              average(
                versionEvents.map(
                  (event) =>
                    asNumber(
                      event.properties
                        .actualStopCount
                    )
                )
              ),
            averageCandidates:
              average(
                versionEvents.map(
                  (event) =>
                    asNumber(
                      event.properties
                        .candidateCount
                    )
                )
              ),
            averageCategoryDiversity:
              average(
                versionEvents.map(
                  (event) =>
                    asNumber(
                      event.properties
                        .categoryDiversity
                    )
                )
              ),
            averageNeighbourhoodDiversity:
              average(
                versionEvents.map(
                  (event) =>
                    asNumber(
                      event.properties
                        .neighbourhoodDiversity
                    )
                )
              ),
            averageStopKindDiversity:
              average(
                versionEvents.map(
                  (event) =>
                    asNumber(
                      event.properties
                        .stopKindDiversity
                    )
                )
              ),
            sampleWarning:
              sessions.size < 20
                ? `Only ${sessions.size} sessions used this version. Treat rates as directional.`
                : null
          };
        }
      );

  return {
    configured: true,
    migrationRequired: false,
    error: null,
    generatedAt:
      new Date().toISOString(),
    periodDays,
    versions,
    totals: {
      generated:
        generated.length,
      complete:
        versions.reduce(
          (sum, version) =>
            sum +
            version.complete,
          0
        ),
      saves:
        versions.reduce(
          (sum, version) =>
            sum +
            version.saveSessions,
          0
        ),
      shares:
        versions.reduce(
          (sum, version) =>
            sum +
            version.shareSessions,
          0
        )
    }
  };
}

export type ExperimentExportDataset =
  | "experiments"
  | "recommendations";

export async function getExperimentExportRows(
  dataset: ExperimentExportDataset,
  periodDays: AnalyticsPeriodDays
): Promise<Array<Record<
  string,
  string | number | boolean | null
>>> {
  if (dataset === "recommendations") {
    const lab =
      await getRecommendationLab(
        periodDays
      );

    return lab.versions.map(
      (version) => ({
        recommendation_version:
          version.version,
        generated:
          version.generated,
        sessions:
          version.sessions,
        complete:
          version.complete,
        partial:
          version.partial,
        empty:
          version.empty,
        completion_rate:
          version.completionRate,
        save_rate:
          version.saveRate,
        share_rate:
          version.shareRate,
        replacement_events:
          version.replacementEvents,
        positive_feedback_rate:
          version.positiveFeedbackRate,
        average_stops:
          version.averageStops,
        average_candidates:
          version.averageCandidates,
        average_category_diversity:
          version
            .averageCategoryDiversity,
        average_neighbourhood_diversity:
          version
            .averageNeighbourhoodDiversity,
        average_stop_kind_diversity:
          version
            .averageStopKindDiversity
      })
    );
  }

  const lab =
    await getExperimentLab(
      periodDays
    );

  return lab.experiments.flatMap(
    (result) =>
      result.variants.map(
        (variant) => ({
          experiment_slug:
            result.experiment.slug,
          experiment_name:
            result.experiment.name,
          status:
            result.experiment.status,
          assignment_version:
            result.experiment
              .assignment_version,
          variant:
            variant.key,
          variant_label:
            variant.label,
          exposures:
            variant.exposures,
          primary_event:
            result.experiment
              .primary_event,
          conversions:
            variant.conversions,
          conversion_rate:
            variant.conversionRate,
          confidence_low:
            variant.confidenceLow,
          confidence_high:
            variant.confidenceHigh,
          negative_feedback_rate:
            variant
              .negativeFeedbackRate,
          minimum_reached:
            variant.minimumReached
        })
      )
  );
}
