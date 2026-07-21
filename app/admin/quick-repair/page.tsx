import type { Metadata } from "next";
import Link from "next/link";

import {
  DATA_HEALTH_ISSUES,
  getDataHealthReport,
  type DataHealthEntityType,
  type DataHealthIssueCode
} from "@/lib/admin/data-health";
import type { QuickRepairRecord } from "@/lib/admin/quick-repair-types";
import { requireVentureAdmin } from "@/lib/auth/admin";

import QuickRepairClient from "./quick-repair-client";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quick Repair | Venture Admin",
  description:
    "Repair common Venture listing fields without opening every full editor."
};

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams: Promise<SearchParams>;
};

const QUICK_ISSUES: readonly DataHealthIssueCode[] = [
  "missing-neighbourhood",
  "unverified",
  "missing-source",
  "unchecked-source",
  "stale-source"
];

function firstValue(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatIssueLabel(code: DataHealthIssueCode): string {
  return code
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function QuickRepairPage({
  searchParams
}: PageProps) {
  await requireVentureAdmin();

  const params = await searchParams;
  const rawType = firstValue(params.type);
  const rawIssue = firstValue(params.issue);
  const rawStatus = firstValue(params.status);
  const rawSearch = firstValue(params.search);

  const entityType: "all" | DataHealthEntityType =
    rawType === "event" || rawType === "all" ? rawType : "place";

  const issue: "all" | DataHealthIssueCode =
    DATA_HEALTH_ISSUES.includes(rawIssue as DataHealthIssueCode)
      ? (rawIssue as DataHealthIssueCode)
      : "missing-neighbourhood";

  const status =
    rawStatus === "published" || rawStatus === "draft"
      ? rawStatus
      : "all";

  const report = await getDataHealthReport({
    entityType,
    issue,
    status,
    search: rawSearch,
    limit: 200
  });

  const records: QuickRepairRecord[] = report.records.map((record) => ({
    key: record.key,
    entityType: record.entityType,
    id: record.id,
    name: record.name,
    category: record.category,
    status: record.status,
    verificationStatus: record.verificationStatus,
    neighbourhood: record.neighbourhood,
    sourceCheckedAt: record.sourceCheckedAt,
    primarySourceUrl: record.primarySourceUrl,
    issues: record.issues,
    publicPath: record.publicPath
  }));

  const categorySuggestions = Array.from(
    new Set(report.records.map((record) => record.category).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>VENTURE ADMIN</p>
          <h1>Quick Repair</h1>
          <p>
            Fix common listing fields from one queue. Publishing still requires
            the full editor, so speed does not weaken Venture&apos;s trust gate.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/admin/data-health">Data health</Link>
          <Link href="/admin/inventory-plan">Inventory plan</Link>
          <Link href="/admin/import">Import</Link>
        </div>
      </header>

      <form className={styles.filters} method="get">
        <label>
          Search
          <input
            type="search"
            name="search"
            defaultValue={report.appliedFilter.search}
            placeholder="Listing or category"
          />
        </label>

        <label>
          Type
          <select name="type" defaultValue={report.appliedFilter.entityType}>
            <option value="place">Places</option>
            <option value="event">Events</option>
            <option value="all">All listings</option>
          </select>
        </label>

        <label>
          Status
          <select name="status" defaultValue={report.appliedFilter.status}>
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>

        <label>
          Issue
          <select name="issue" defaultValue={report.appliedFilter.issue}>
            <option value="all">All common repairs</option>
            {QUICK_ISSUES.map((currentIssue) => (
              <option value={currentIssue} key={currentIssue}>
                {formatIssueLabel(currentIssue)} (
                {report.issueCounts[currentIssue] ?? 0})
              </option>
            ))}
          </select>
        </label>

        <div className={styles.filterActions}>
          <button type="submit">Apply</button>
          <Link href="/admin/quick-repair">Reset</Link>
        </div>
      </form>

      <section className={styles.queueIntro}>
        <div>
          <h2>{report.totalMatchingRecords} matching listings</h2>
          <p>
            Edit the visible cards, then save one record or all changed records.
          </p>
        </div>
        <small>Maximum 50 changes per save</small>
      </section>

      <QuickRepairClient
        records={records}
        categorySuggestions={categorySuggestions}
      />
    </main>
  );
}
