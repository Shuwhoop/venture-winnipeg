import type { Metadata } from "next";
import Link from "next/link";

import {
  DATA_HEALTH_ISSUES,
  getDataHealthReport,
  type DataHealthEntityType,
  type DataHealthIssueCode
} from "@/lib/admin/data-health";
import { requireVentureAdmin } from "@/lib/auth/admin";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Data Health | Venture Admin",
  description:
    "Private Venture dashboard for listing quality, freshness, and outing eligibility."
};

type SearchParams = Record<
  string,
  string | string[] | undefined
>;

type PageProps = {
  searchParams: Promise<SearchParams>;
};

function firstValue(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Winnipeg",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatIssueLabel(code: DataHealthIssueCode): string {
  return code
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function DataHealthPage({
  searchParams
}: PageProps) {
  await requireVentureAdmin();

  const params = await searchParams;
  const rawType = firstValue(params.type);
  const rawIssue = firstValue(params.issue);
  const rawStatus = firstValue(params.status);
  const rawSearch = firstValue(params.search);

  const entityType: "all" | DataHealthEntityType =
    rawType === "place" || rawType === "event" ? rawType : "all";

  const issue: "all" | DataHealthIssueCode =
    DATA_HEALTH_ISSUES.includes(rawIssue as DataHealthIssueCode)
      ? (rawIssue as DataHealthIssueCode)
      : "all";

  const status =
    rawStatus === "published" ||
    rawStatus === "draft" ||
    rawStatus === "closed" ||
    rawStatus === "expired"
      ? rawStatus
      : "all";

  const report = await getDataHealthReport({
    entityType,
    issue,
    status,
    search: rawSearch,
    limit: 300
  });

  const { metrics } = report;

  const returnParams =
    new URLSearchParams();

  if (entityType !== "all") {
    returnParams.set("type", entityType);
  }

  if (issue !== "all") {
    returnParams.set("issue", issue);
  }

  if (status !== "all") {
    returnParams.set("status", status);
  }

  if (report.appliedFilter.search) {
    returnParams.set(
      "search",
      report.appliedFilter.search
    );
  }

  const returnTo =
    `/admin/data-health${
      returnParams.size > 0
        ? `?${returnParams.toString()}`
        : ""
    }`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>VENTURE ADMIN</p>
          <h1>Data Health</h1>
          <p className={styles.intro}>
            See which Winnipeg listings are ready for discovery and outing
            generation, and which records need repair before an outside beta.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/admin/analytics">Analytics Lab</Link>
          <Link href="/admin/inventory-plan">Inventory plan</Link>
          <Link href="/admin/quick-repair?issue=missing-neighbourhood&type=place">Quick repair</Link>
          <Link href="/admin/beta">Beta inbox</Link>
          <Link href="/admin/import">Import inventory</Link>
          <Link href="/admin/submissions">Review submissions</Link>
          <a href="/api/admin/data-health" target="_blank" rel="noreferrer">
            Open JSON report
          </a>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Listing health summary">
        <article>
          <span>Total listings</span>
          <strong>{metrics.totalRecords}</strong>
          <small>
            {metrics.totalPlaces} places · {metrics.totalEvents} events
          </small>
        </article>

        <article>
          <span>Published</span>
          <strong>{metrics.publishedPlaces + metrics.publishedEvents}</strong>
          <small>
            {metrics.publishedPlaces} places · {metrics.publishedEvents} events
          </small>
        </article>

        <article className={styles.metricGood}>
          <span>Outing eligible</span>
          <strong>{metrics.outingEligible}</strong>
          <small>Trusted, scheduled, and geographically usable</small>
        </article>

        <article className={styles.metricGood}>
          <span>Pitch ready</span>
          <strong>{metrics.pitchReady}</strong>
          <small>Outing ready with current source and location details</small>
        </article>

        <article className={styles.metricWarning}>
          <span>Public blockers</span>
          <strong>{metrics.publishedNeedsAttention}</strong>
          <small>{metrics.needsAttention} records need attention across all statuses</small>
        </article>

        <article>
          <span>Future events</span>
          <strong>{metrics.futureEvents}</strong>
          <small>Published and current · {metrics.expiredEvents} past or expired</small>
        </article>
      </section>

      <section className={styles.issueSummary} aria-label="Most common issues">
        <Link href="/admin/quick-repair?issue=missing-neighbourhood&type=place">
          <strong>{report.issueCounts["missing-neighbourhood"] ?? 0}</strong>
          <span>Quick-fix neighbourhoods</span>
        </Link>
        <Link href="?issue=missing-hours">
          <strong>{metrics.missingHours}</strong>
          <span>Missing or invalid hours</span>
        </Link>
        <Link href="?issue=missing-coordinates">
          <strong>{metrics.missingCoordinates}</strong>
          <span>Missing coordinates</span>
        </Link>
        <Link href="?issue=missing-source">
          <strong>{metrics.missingSources}</strong>
          <span>Missing primary sources</span>
        </Link>
        <Link href="?issue=unverified">
          <strong>{metrics.unverified}</strong>
          <span>Needs verification</span>
        </Link>
        <Link href="?issue=stale-source">
          <strong>{metrics.staleSources}</strong>
          <span>Source checks older than {report.staleAfterDays} days</span>
        </Link>
      </section>

      <form className={styles.filters} method="get">
        <label>
          Search
          <input
            type="search"
            name="search"
            defaultValue={report.appliedFilter.search}
            placeholder="Listing, category, or neighbourhood"
          />
        </label>

        <label>
          Type
          <select name="type" defaultValue={report.appliedFilter.entityType}>
            <option value="all">All listings</option>
            <option value="place">Places</option>
            <option value="event">Events</option>
          </select>
        </label>

        <label>
          Status
          <select name="status" defaultValue={report.appliedFilter.status}>
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed places</option>
            <option value="expired">Expired or past</option>
          </select>
        </label>

        <label>
          Issue
          <select name="issue" defaultValue={report.appliedFilter.issue}>
            <option value="all">All issues</option>
            {DATA_HEALTH_ISSUES.map((currentIssue) => (
              <option value={currentIssue} key={currentIssue}>
                {formatIssueLabel(currentIssue)} (
                {report.issueCounts[currentIssue] ?? 0})
              </option>
            ))}
          </select>
        </label>

        <div className={styles.filterActions}>
          <button type="submit">Apply filters</button>
          <Link href="/admin/data-health">Clear</Link>
        </div>
      </form>

      <section className={styles.resultsHeader}>
        <div>
          <h2>Listing repair queue</h2>
          <p>
            Showing {report.records.length} of {report.totalMatchingRecords}
            matching records. Public blockers and near-ready listings appear first; drafts follow.
          </p>
        </div>
        <time dateTime={report.generatedAt}>
          Checked {formatDate(report.generatedAt)}
        </time>
      </section>

      {report.records.length === 0 ? (
        <section className={styles.emptyState}>
          <h2>No listings match these filters.</h2>
          <p>Clear one or more filters to widen the repair queue.</p>
        </section>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Listing</th>
                <th>State</th>
                <th>Readiness</th>
                <th>Issues</th>
                <th>Source checked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {report.records.map((record) => (
                <tr key={record.key}>
                  <td data-label="Listing">
                    <strong>{record.name}</strong>
                    <span>
                      {record.entityType === "place" ? "Place" : "Event"} ·{" "}
                      {record.category}
                    </span>
                    <small>{record.neighbourhood ?? "Neighbourhood missing"}</small>
                  </td>
                  <td data-label="State">
                    <span className={styles.status}>{record.status}</span>
                    <small>{record.verificationStatus.replaceAll("_", " ")}</small>
                  </td>
                  <td data-label="Readiness">
                    <span
                      className={
                        record.pitchReady
                          ? styles.ready
                          : record.outingEligible
                            ? styles.eligible
                            : styles.notReady
                      }
                    >
                      {record.pitchReady
                        ? "Pitch ready"
                        : record.outingEligible
                          ? "Outing eligible"
                          : "Not eligible"}
                    </span>
                  </td>
                  <td data-label="Issues">
                    <div className={styles.issueList}>
                      {record.issues.length === 0 ? (
                        <span className={styles.noIssues}>No issues</span>
                      ) : (
                        record.issues.map((currentIssue) => (
                          <span
                            key={currentIssue.code}
                            className={styles[currentIssue.severity]}
                            title={currentIssue.code}
                          >
                            {currentIssue.label}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td data-label="Source checked">
                    <span>{formatDate(record.sourceCheckedAt)}</span>
                    {record.primarySourceUrl ? (
                      <a
                        href={record.primarySourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View source
                      </a>
                    ) : null}
                  </td>
                  <td data-label="Actions">
                    <div className={styles.rowActions}>
                      <Link
                        href={`/admin/listings/${record.entityType}/${record.id}?returnTo=${encodeURIComponent(returnTo)}`}
                      >
                        Repair
                      </Link>
                      <Link href={record.publicPath}>View</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
