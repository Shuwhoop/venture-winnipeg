import "server-only";

import {
  getDataHealthReport,
  type DataHealthRecord
} from "@/lib/admin/data-health";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const TRUSTED_STATUSES = new Set([
  "official_source",
  "verified_venture",
  "verified_business"
]);

export const INVENTORY_PLANNER_TARGETS = {
  trustedPublishedPlaces: 50,
  trustedFutureEvents: 25,
  trustedPerNeighbourhood: 5,
  trustedPerCategory: 3,
  outingEligibleRecords: 40
} as const;

export type InventoryPlannerAction = {
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
  linkLabel: string;
};

export type InventoryCoverageRow = {
  name: string;
  total: number;
  published: number;
  trustedPublished: number;
  outingEligible: number;
  pitchReady: number;
  target: number;
  gap: number;
  progress: number;
};

export type InventoryRepairCandidate = {
  key: string;
  id: string;
  entityType: "place" | "event";
  name: string;
  category: string;
  neighbourhood: string | null;
  verificationStatus: string;
  priorityScore: number;
  reasons: string[];
  issueLabels: string[];
  repairPath: string;
};

export type InventoryCoverageMatrix = {
  categories: string[];
  rows: Array<{
    neighbourhood: string;
    counts: Record<string, number>;
    total: number;
  }>;
};

export type InventoryPlannerReport = {
  generatedAt: string;
  targets: typeof INVENTORY_PLANNER_TARGETS;
  metrics: {
    totalListings: number;
    trustedPublishedPlaces: number;
    trustedFutureEvents: number;
    outingEligible: number;
    pitchReady: number;
    missingNeighbourhood: number;
    nearReadyDrafts: number;
    trustedPlaceGap: number;
    trustedEventGap: number;
    outingEligibleGap: number;
  };
  actions: InventoryPlannerAction[];
  neighbourhoods: InventoryCoverageRow[];
  categories: InventoryCoverageRow[];
  matrix: InventoryCoverageMatrix;
  upcomingEventsByWeek: Array<{
    week: string;
    count: number;
  }>;
  repairCandidates: InventoryRepairCandidate[];
};

type EventDateRow = {
  id: string;
  start_at: string;
  end_at: string | null;
};

function isTrusted(record: DataHealthRecord): boolean {
  return TRUSTED_STATUSES.has(record.verificationStatus);
}

function percent(current: number, target: number): number {
  if (target <= 0) {
    return 100;
  }

  return Math.min(100, Math.round((current / target) * 100));
}

function startOfUtcWeek(value: Date): string {
  const date = new Date(Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate()
  ));
  const day = date.getUTCDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - distanceFromMonday);
  return date.toISOString().slice(0, 10);
}

function broadCategory(record: DataHealthRecord): string {
  if (record.entityType === "event") {
    return "Upcoming events";
  }

  const value = record.category.toLowerCase();

  if (/bar|pub|brew|night|club|karaoke/.test(value)) {
    return "Nightlife";
  }

  if (/art|museum|theatre|theater|gallery|culture|convention/.test(value)) {
    return "Arts & culture";
  }

  if (/activity|attraction|recreation|escape|bowling|arcade|park|tour/.test(value)) {
    return "Activities";
  }

  if (/market|community|workshop|class/.test(value)) {
    return "Markets & community";
  }

  if (/restaurant|cafe|bakery|brunch|dining|pizza|mexican|steak|food|noodle|burger/.test(value)) {
    return "Food & drink";
  }

  return "Other";
}

function buildCoverageRows(
  records: DataHealthRecord[],
  key: "neighbourhood" | "category",
  target: number
): InventoryCoverageRow[] {
  const groups = new Map<string, DataHealthRecord[]>();

  for (const record of records) {
    const raw = key === "neighbourhood"
      ? record.neighbourhood?.trim()
      : record.category.trim();

    if (!raw) {
      continue;
    }

    const current = groups.get(raw) ?? [];
    current.push(record);
    groups.set(raw, current);
  }

  return [...groups.entries()]
    .map(([name, grouped]) => {
      const trustedPublished = grouped.filter(
        (record) => record.status === "published" && isTrusted(record)
      ).length;

      return {
        name,
        total: grouped.length,
        published: grouped.filter((record) => record.status === "published").length,
        trustedPublished,
        outingEligible: grouped.filter((record) => record.outingEligible).length,
        pitchReady: grouped.filter((record) => record.pitchReady).length,
        target,
        gap: Math.max(0, target - trustedPublished),
        progress: percent(trustedPublished, target)
      };
    })
    .sort((a, b) =>
      b.gap - a.gap ||
      b.total - a.total ||
      a.name.localeCompare(b.name)
    );
}

function buildMatrix(
  records: DataHealthRecord[],
  neighbourhoods: InventoryCoverageRow[]
): InventoryCoverageMatrix {
  const selectedNeighbourhoods = neighbourhoods
    .slice()
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 8)
    .map((row) => row.name);

  const categoryTotals = new Map<string, number>();

  for (const record of records) {
    if (record.status !== "published" || !isTrusted(record)) {
      continue;
    }

    const category = broadCategory(record);
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + 1);
  }

  const categories = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);

  if (categories.length === 0) {
    categories.push("Food & drink", "Activities", "Upcoming events");
  }

  return {
    categories,
    rows: selectedNeighbourhoods.map((neighbourhood) => {
      const counts = Object.fromEntries(
        categories.map((category) => [category, 0])
      ) as Record<string, number>;

      for (const record of records) {
        if (
          record.neighbourhood !== neighbourhood ||
          record.status !== "published" ||
          !isTrusted(record)
        ) {
          continue;
        }

        const category = broadCategory(record);
        counts[category] = (counts[category] ?? 0) + 1;
      }

      return {
        neighbourhood,
        counts,
        total: Object.values(counts).reduce((sum, value) => sum + value, 0)
      };
    })
  };
}

function buildRepairCandidates(
  records: DataHealthRecord[],
  neighbourhoods: InventoryCoverageRow[],
  categories: InventoryCoverageRow[]
): InventoryRepairCandidate[] {
  const neighbourhoodGaps = new Map(
    neighbourhoods.map((row) => [row.name, row.gap])
  );
  const categoryGaps = new Map(
    categories.map((row) => [row.name, row.gap])
  );

  return records
    .filter((record) => record.status !== "published")
    .map((record) => {
      const highIssues = record.issues.filter((issue) => issue.severity === "high").length;
      const mediumIssues = record.issues.filter((issue) => issue.severity === "medium").length;
      const lowIssues = record.issues.filter((issue) => issue.severity === "low").length;
      const trusted = isTrusted(record);
      const neighbourhoodGap = record.neighbourhood
        ? neighbourhoodGaps.get(record.neighbourhood) ?? 0
        : 0;
      const categoryGap = categoryGaps.get(record.category) ?? 0;

      let score = 100;
      score -= highIssues * 20;
      score -= mediumIssues * 10;
      score -= lowIssues * 5;
      if (trusted) score += 15;
      if (record.neighbourhood) score += 10;
      if (neighbourhoodGap > 0) score += 8;
      if (categoryGap > 0) score += 8;
      score = Math.max(0, Math.min(100, score));

      const reasons: string[] = [];
      if (trusted) reasons.push("Already trusted");
      if (record.issues.length <= 3) reasons.push(`${record.issues.length} repair items remaining`);
      if (record.neighbourhood && neighbourhoodGap > 0) {
        reasons.push(`Helps ${record.neighbourhood} coverage`);
      }
      if (categoryGap > 0) reasons.push(`Helps ${record.category} depth`);
      if (reasons.length === 0) reasons.push("Useful after critical fields are repaired");

      return {
        key: record.key,
        id: record.id,
        entityType: record.entityType,
        name: record.name,
        category: record.category,
        neighbourhood: record.neighbourhood,
        verificationStatus: record.verificationStatus,
        priorityScore: score,
        reasons: reasons.slice(0, 3),
        issueLabels: record.issues.map((issue) => issue.label),
        repairPath: `/admin/listings/${record.entityType}/${record.id}`
      };
    })
    .sort((a, b) =>
      b.priorityScore - a.priorityScore ||
      a.issueLabels.length - b.issueLabels.length ||
      a.name.localeCompare(b.name)
    )
    .slice(0, 20);
}

function buildActions(
  metrics: InventoryPlannerReport["metrics"]
): InventoryPlannerAction[] {
  const actions: InventoryPlannerAction[] = [];

  if (metrics.missingNeighbourhood > 0) {
    actions.push({
      priority: "high",
      title: "Assign missing neighbourhoods",
      detail: `${metrics.missingNeighbourhood} listings cannot contribute to reliable neighbourhood coverage until this field is repaired.`,
      href: "/admin/data-health?issue=missing-neighbourhood",
      linkLabel: "Open repair queue"
    });
  }

  if (metrics.trustedEventGap > 0) {
    actions.push({
      priority: "high",
      title: "Build upcoming event supply",
      detail: `Add ${metrics.trustedEventGap} more trusted future events to reach the first operating target of ${INVENTORY_PLANNER_TARGETS.trustedFutureEvents}.`,
      href: "/admin/import",
      linkLabel: "Import event drafts"
    });
  }

  if (metrics.nearReadyDrafts > 0) {
    actions.push({
      priority: "medium",
      title: "Finish the closest drafts",
      detail: `${metrics.nearReadyDrafts} drafts have three or fewer remaining repair items and are the fastest path to better coverage.`,
      href: "/admin/inventory-plan#repair-candidates",
      linkLabel: "Review candidates"
    });
  }

  if (metrics.trustedPlaceGap > 0) {
    actions.push({
      priority: "medium",
      title: "Increase trusted place depth",
      detail: `Venture needs ${metrics.trustedPlaceGap} more trusted published places to reach the first target of ${INVENTORY_PLANNER_TARGETS.trustedPublishedPlaces}.`,
      href: "/admin/import",
      linkLabel: "Import place drafts"
    });
  }

  return actions.slice(0, 4);
}

async function loadEventDates(): Promise<EventDateRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("id,start_at,end_at")
    .order("start_at", { ascending: true });

  if (error) {
    throw new Error(`Unable to load event dates for inventory planning: ${error.message}`);
  }

  return (data ?? []) as EventDateRow[];
}

export async function getInventoryPlannerReport(): Promise<InventoryPlannerReport> {
  const [health, eventDates] = await Promise.all([
    getDataHealthReport({ limit: 500 }),
    loadEventDates()
  ]);

  const records = health.records;
  const trustedPublishedPlaces = records.filter(
    (record) =>
      record.entityType === "place" &&
      record.status === "published" &&
      isTrusted(record)
  ).length;
  const trustedFutureEvents = records.filter(
    (record) => record.entityType === "event" && record.pitchReady
  ).length;
  const missingNeighbourhood = records.filter(
    (record) => !record.neighbourhood?.trim()
  ).length;
  const nearReadyDrafts = records.filter(
    (record) => record.status !== "published" && record.issues.length <= 3
  ).length;

  const metrics: InventoryPlannerReport["metrics"] = {
    totalListings: records.length,
    trustedPublishedPlaces,
    trustedFutureEvents,
    outingEligible: health.metrics.outingEligible,
    pitchReady: health.metrics.pitchReady,
    missingNeighbourhood,
    nearReadyDrafts,
    trustedPlaceGap: Math.max(
      0,
      INVENTORY_PLANNER_TARGETS.trustedPublishedPlaces - trustedPublishedPlaces
    ),
    trustedEventGap: Math.max(
      0,
      INVENTORY_PLANNER_TARGETS.trustedFutureEvents - trustedFutureEvents
    ),
    outingEligibleGap: Math.max(
      0,
      INVENTORY_PLANNER_TARGETS.outingEligibleRecords - health.metrics.outingEligible
    )
  };

  const neighbourhoods = buildCoverageRows(
    records,
    "neighbourhood",
    INVENTORY_PLANNER_TARGETS.trustedPerNeighbourhood
  );
  const categories = buildCoverageRows(
    records,
    "category",
    INVENTORY_PLANNER_TARGETS.trustedPerCategory
  );

  const recordById = new Map(
    records
      .filter((record) => record.entityType === "event")
      .map((record) => [record.id, record])
  );
  const upcomingByWeek = new Map<string, number>();

  for (const event of eventDates) {
    const record = recordById.get(event.id);
    if (!record?.pitchReady) {
      continue;
    }

    const date = new Date(event.start_at);
    if (!Number.isFinite(date.getTime())) {
      continue;
    }

    const week = startOfUtcWeek(date);
    upcomingByWeek.set(week, (upcomingByWeek.get(week) ?? 0) + 1);
  }

  return {
    generatedAt: new Date().toISOString(),
    targets: INVENTORY_PLANNER_TARGETS,
    metrics,
    actions: buildActions(metrics),
    neighbourhoods,
    categories,
    matrix: buildMatrix(records, neighbourhoods),
    upcomingEventsByWeek: [...upcomingByWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([week, count]) => ({ week, count })),
    repairCandidates: buildRepairCandidates(records, neighbourhoods, categories)
  };
}

export function getInventoryPlannerExportRows(
  report: InventoryPlannerReport
): Array<Record<string, string | number | boolean | null>> {
  const rows: Array<Record<string, string | number | boolean | null>> = [];

  for (const row of report.neighbourhoods) {
    rows.push({
      section: "neighbourhood",
      name: row.name,
      total: row.total,
      published: row.published,
      trusted_published: row.trustedPublished,
      outing_eligible: row.outingEligible,
      pitch_ready: row.pitchReady,
      target: row.target,
      gap: row.gap,
      progress_pct: row.progress
    });
  }

  for (const row of report.categories) {
    rows.push({
      section: "category",
      name: row.name,
      total: row.total,
      published: row.published,
      trusted_published: row.trustedPublished,
      outing_eligible: row.outingEligible,
      pitch_ready: row.pitchReady,
      target: row.target,
      gap: row.gap,
      progress_pct: row.progress
    });
  }

  for (const candidate of report.repairCandidates) {
    rows.push({
      section: "repair_candidate",
      name: candidate.name,
      entity_type: candidate.entityType,
      category: candidate.category,
      neighbourhood: candidate.neighbourhood,
      verification_status: candidate.verificationStatus,
      priority_score: candidate.priorityScore,
      reasons: candidate.reasons.join(" | "),
      issues: candidate.issueLabels.join(" | ")
    });
  }

  for (const week of report.upcomingEventsByWeek) {
    rows.push({
      section: "event_week",
      name: week.week,
      future_events: week.count
    });
  }

  return rows;
}
