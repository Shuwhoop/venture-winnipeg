import "server-only";

import {
  getBetaInsights
} from "@/lib/admin/beta-insights";
import {
  getDataHealthReport
} from "@/lib/admin/data-health";
import {
  getDataPipelineLab
} from "@/lib/admin/data-pipeline";
import {
  getInventoryPlannerReport
} from "@/lib/admin/inventory-planner";
import type {
  BetaReadinessCheck,
  BetaReadinessReport,
  BetaReadinessStatus
} from "@/lib/admin/beta-readiness-types";

const BETA_TARGETS = {
  trustedPlaces: 15,
  futureEvents: 10,
  outingEligible: 15,
  maxMissingNeighbourhoods: 4
} as const;

function statusForMinimum(
  value: number,
  target: number,
  blockedBelow: number
): BetaReadinessStatus {
  if (value >= target) {
    return "ready";
  }

  if (value < blockedBelow) {
    return "blocked";
  }

  return "attention";
}

function statusForMaximum(
  value: number,
  target: number,
  blockedAbove: number
): BetaReadinessStatus {
  if (value <= target) {
    return "ready";
  }

  if (value > blockedAbove) {
    return "blocked";
  }

  return "attention";
}

function countStatuses(
  checks: BetaReadinessCheck[]
): BetaReadinessReport["summary"] {
  return checks.reduce(
    (summary, check) => {
      summary[check.status] += 1;
      return summary;
    },
    {
      blocked: 0,
      attention: 0,
      ready: 0
    }
  );
}

function getOverallStatus(
  checks: BetaReadinessCheck[]
): BetaReadinessStatus {
  if (
    checks.some(
      (check) => check.status === "blocked"
    )
  ) {
    return "blocked";
  }

  if (
    checks.some(
      (check) => check.status === "attention"
    )
  ) {
    return "attention";
  }

  return "ready";
}

function environmentChecks(): BetaReadinessCheck[] {
  const analyticsEnabled =
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";
  const feedbackEnabled =
    process.env.NEXT_PUBLIC_BETA_FEEDBACK_ENABLED !== "false";
  const hasAdminAllowlist = Boolean(
    process.env.VENTURE_ADMIN_EMAILS?.trim()
  );
  const hasResendKey = Boolean(
    process.env.RESEND_API_KEY?.trim()
  );
  const hasTokenSecret = Boolean(
    process.env.NEWSLETTER_TOKEN_SECRET?.trim()
  );
  const configuredFrom =
    process.env.VENTURE_EMAIL_FROM?.trim() ?? "";
  const usesVerifiedSender =
    Boolean(configuredFrom) &&
    !configuredFrom.includes("onboarding@resend.dev");

  return [
    {
      id: "admin-access",
      area: "Security",
      title: "Admin access allowlist",
      detail: hasAdminAllowlist
        ? "The private admin workspace has an explicit administrator email allowlist."
        : "VENTURE_ADMIN_EMAILS is missing, so private admin routes cannot be trusted for launch operations.",
      status: hasAdminAllowlist ? "ready" : "blocked",
      metric: hasAdminAllowlist ? "Configured" : "Missing",
      source: "automatic"
    },
    {
      id: "analytics-enabled",
      area: "Analytics",
      title: "Product analytics collection",
      detail: analyticsEnabled
        ? "Public Venture journeys are allowed to send analytics events."
        : "NEXT_PUBLIC_ANALYTICS_ENABLED is set to false, so the beta cannot be measured.",
      status: analyticsEnabled ? "ready" : "blocked",
      metric: analyticsEnabled ? "Enabled" : "Disabled",
      source: "automatic",
      href: "/admin/analytics",
      actionLabel: "Open analytics"
    },
    {
      id: "feedback-enabled",
      area: "Feedback",
      title: "Floating beta feedback",
      detail: feedbackEnabled
        ? "Public testers can open the Venture feedback control."
        : "NEXT_PUBLIC_BETA_FEEDBACK_ENABLED is set to false, so testers cannot send in-context feedback.",
      status: feedbackEnabled ? "ready" : "blocked",
      metric: feedbackEnabled ? "Enabled" : "Disabled",
      source: "automatic",
      href: "/admin/beta",
      actionLabel: "Open beta inbox"
    },
    {
      id: "newsletter-config",
      area: "Email",
      title: "Newsletter delivery configuration",
      detail:
        hasResendKey && hasTokenSecret
          ? usesVerifiedSender
            ? "Resend, unsubscribe tokens, and a non-onboarding sender are configured."
            : "Resend and unsubscribe tokens are configured, but the sender still appears to need a verified Venture domain."
          : "RESEND_API_KEY or NEWSLETTER_TOKEN_SECRET is missing. Newsletter delivery should remain out of the beta promise until both are configured.",
      status:
        hasResendKey && hasTokenSecret
          ? usesVerifiedSender
            ? "ready"
            : "attention"
          : "attention",
      metric:
        hasResendKey && hasTokenSecret
          ? usesVerifiedSender
            ? "Verified sender"
            : "Onboarding sender"
          : "Incomplete",
      source: "automatic",
      href: "/newsletter",
      actionLabel: "Test newsletter"
    }
  ];
}

export async function getBetaReadinessReport():
  Promise<BetaReadinessReport> {
  const [
    healthResult,
    inventoryResult,
    betaResult,
    pipelineResult
  ] = await Promise.allSettled([
    getDataHealthReport({ limit: 500 }),
    getInventoryPlannerReport(),
    getBetaInsights(30),
    getDataPipelineLab(30)
  ]);

  const checks: BetaReadinessCheck[] = [
    ...environmentChecks()
  ];

  if (healthResult.status === "fulfilled") {
    const metrics = healthResult.value.metrics;

    checks.push(
      {
        id: "published-repairs",
        area: "Inventory",
        title: "Published listings needing repair",
        detail:
          metrics.publishedNeedsAttention === 0
            ? "No published listing is currently flagged by the data-health rules."
            : `${metrics.publishedNeedsAttention} published listings still have missing, stale, or unusable fields.`,
        status: statusForMaximum(
          metrics.publishedNeedsAttention,
          0,
          3
        ),
        metric: `${metrics.publishedNeedsAttention}`,
        source: "automatic",
        href: "/admin/data-health?status=published",
        actionLabel: "Review published listings"
      },
      {
        id: "stale-sources",
        area: "Trust",
        title: "Stale listing sources",
        detail:
          metrics.staleSources === 0
            ? "Published data is inside Venture's current source-check window."
            : `${metrics.staleSources} records have source checks older than the freshness standard.`,
        status: statusForMaximum(
          metrics.staleSources,
          0,
          5
        ),
        metric: `${metrics.staleSources}`,
        source: "automatic",
        href: "/admin/data-health?issue=stale-source",
        actionLabel: "Refresh sources"
      }
    );
  } else {
    checks.push({
      id: "data-health-unavailable",
      area: "Inventory",
      title: "Data-health report",
      detail:
        "The readiness centre could not load Venture's listing health report.",
      status: "blocked",
      metric: "Unavailable",
      source: "automatic",
      href: "/admin/data-health",
      actionLabel: "Open data health"
    });
  }

  if (inventoryResult.status === "fulfilled") {
    const metrics = inventoryResult.value.metrics;

    checks.push(
      {
        id: "trusted-places",
        area: "Inventory",
        title: "Trusted public places",
        detail: `${metrics.trustedPublishedPlaces} trusted published places are available. The small-beta target is ${BETA_TARGETS.trustedPlaces}.`,
        status: statusForMinimum(
          metrics.trustedPublishedPlaces,
          BETA_TARGETS.trustedPlaces,
          10
        ),
        metric: `${metrics.trustedPublishedPlaces} / ${BETA_TARGETS.trustedPlaces}`,
        source: "automatic",
        href: "/admin/inventory-plan",
        actionLabel: "Open inventory plan"
      },
      {
        id: "future-events",
        area: "Inventory",
        title: "Trusted future events",
        detail: `${metrics.trustedFutureEvents} trusted upcoming events are available. The small-beta target is ${BETA_TARGETS.futureEvents}.`,
        status: statusForMinimum(
          metrics.trustedFutureEvents,
          BETA_TARGETS.futureEvents,
          5
        ),
        metric: `${metrics.trustedFutureEvents} / ${BETA_TARGETS.futureEvents}`,
        source: "automatic",
        href: "/admin/import",
        actionLabel: "Add events"
      },
      {
        id: "outing-eligible",
        area: "Recommendations",
        title: "Outing-eligible inventory",
        detail: `${metrics.outingEligible} records can currently participate in outing generation. The small-beta target is ${BETA_TARGETS.outingEligible}.`,
        status: statusForMinimum(
          metrics.outingEligible,
          BETA_TARGETS.outingEligible,
          8
        ),
        metric: `${metrics.outingEligible} / ${BETA_TARGETS.outingEligible}`,
        source: "automatic",
        href: "/admin/recommendations",
        actionLabel: "Review recommendations"
      },
      {
        id: "missing-neighbourhoods",
        area: "Inventory",
        title: "Missing neighbourhoods",
        detail: `${metrics.missingNeighbourhood} records are missing neighbourhood data. Beta target: no more than ${BETA_TARGETS.maxMissingNeighbourhoods}.`,
        status: statusForMaximum(
          metrics.missingNeighbourhood,
          BETA_TARGETS.maxMissingNeighbourhoods,
          9
        ),
        metric: `${metrics.missingNeighbourhood}`,
        source: "automatic",
        href: "/admin/quick-repair",
        actionLabel: "Quick repair"
      }
    );
  } else {
    checks.push({
      id: "inventory-plan-unavailable",
      area: "Inventory",
      title: "Inventory readiness metrics",
      detail:
        "The readiness centre could not load Venture's inventory coverage report.",
      status: "blocked",
      metric: "Unavailable",
      source: "automatic",
      href: "/admin/inventory-plan",
      actionLabel: "Open inventory plan"
    });
  }

  if (pipelineResult.status === "fulfilled") {
    const pipeline = pipelineResult.value;
    let status: BetaReadinessStatus = "attention";

    if (
      !pipeline.configured ||
      pipeline.migrationRequired ||
      pipeline.error
    ) {
      status = "blocked";
    } else if (
      pipeline.qualityScore !== null &&
      pipeline.qualityScore >= 85
    ) {
      status = "ready";
    } else if (
      pipeline.qualityScore !== null &&
      pipeline.qualityScore < 70
    ) {
      status = "blocked";
    }

    checks.push({
      id: "pipeline-quality",
      area: "Analytics",
      title: "Analytics pipeline quality",
      detail:
        pipeline.error ??
        (pipeline.qualityScore === null
          ? "The pipeline is configured, but it needs test traffic before a quality score can be calculated."
          : `${pipeline.qualityLabel} pipeline quality across ${pipeline.totals.selectedPeriod} events in the last 30 days.`),
      status,
      metric:
        pipeline.qualityScore === null
          ? "Awaiting events"
          : `${pipeline.qualityScore} / 100`,
      source: "automatic",
      href: "/admin/data-pipeline",
      actionLabel: "Inspect pipeline"
    });
  } else {
    checks.push({
      id: "pipeline-unavailable",
      area: "Analytics",
      title: "Analytics pipeline quality",
      detail:
        "The readiness centre could not load the analytics pipeline monitor.",
      status: "blocked",
      metric: "Unavailable",
      source: "automatic",
      href: "/admin/data-pipeline",
      actionLabel: "Inspect pipeline"
    });
  }

  if (betaResult.status === "fulfilled") {
    const beta = betaResult.value;

    checks.push({
      id: "beta-feedback-storage",
      area: "Feedback",
      title: "Beta event and feedback storage",
      detail:
        beta.error ??
        (beta.configured
          ? `The feedback system is configured. It has recorded ${beta.metrics.sessions} sessions and ${beta.metrics.feedbackCount} feedback items in the last 30 days.`
          : "The beta tables are not configured."),
      status:
        beta.configured && !beta.error
          ? "ready"
          : "blocked",
      metric:
        beta.configured
          ? `${beta.metrics.feedbackCount} feedback`
          : "Migration needed",
      source: "automatic",
      href: "/admin/beta",
      actionLabel: "Open beta inbox"
    });
  } else {
    checks.push({
      id: "beta-feedback-unavailable",
      area: "Feedback",
      title: "Beta event and feedback storage",
      detail:
        "The readiness centre could not load the beta feedback system.",
      status: "blocked",
      metric: "Unavailable",
      source: "automatic",
      href: "/admin/beta",
      actionLabel: "Open beta inbox"
    });
  }

  const summary = countStatuses(checks);

  return {
    generatedAt: new Date().toISOString(),
    launchStatus: getOverallStatus(checks),
    summary,
    targets: BETA_TARGETS,
    automaticChecks: checks.sort((first, second) => {
      const rank: Record<BetaReadinessStatus, number> = {
        blocked: 0,
        attention: 1,
        ready: 2
      };

      return (
        rank[first.status] - rank[second.status] ||
        first.area.localeCompare(second.area) ||
        first.title.localeCompare(second.title)
      );
    })
  };
}
