import Link from "next/link";
import type {
  ReactNode
} from "react";

import type {
  AnalyticsPeriodDays
} from "@/lib/admin/analytics-lab";

import styles from "./analytics.module.css";

const NAV_ITEMS = [
  ["/admin/analytics", "Overview"],
  ["/admin/analytics/funnels", "Funnels"],
  ["/admin/analytics/retention", "Retention"],
  ["/admin/analytics/inventory", "Inventory"],
  ["/admin/analytics/feedback", "Feedback"]
] as const;

export function AnalyticsShell({
  active,
  periodDays,
  title,
  intro,
  migrationRequired,
  sampleWarning,
  children
}: {
  active: string;
  periodDays: AnalyticsPeriodDays;
  title: string;
  intro: string;
  migrationRequired?: boolean;
  sampleWarning?: string | null;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            VENTURE ANALYTICS LAB
          </p>
          <h1>{title}</h1>
          <p className={styles.intro}>
            {intro}
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/admin/data-health">
            Data health
          </Link>
          <Link href="/admin/inventory-plan">
            Inventory plan
          </Link>
          <Link href="/admin/import">
            Import
          </Link>
          <Link href="/admin/beta">
            Beta inbox
          </Link>
          <Link href="/admin/experiments">
            Experiment Lab
          </Link>
          <Link href="/admin/data-pipeline">
            Pipeline
          </Link>
        </div>
      </header>

      <nav
        className={styles.nav}
        aria-label="Analytics sections"
      >
        {NAV_ITEMS.map(
          ([href, label]) => (
            <Link
              key={href}
              href={`${href}?days=${periodDays}`}
              className={
                active === href
                  ? styles.active
                  : ""
              }
            >
              {label}
            </Link>
          )
        )}
      </nav>

      <div className={styles.controls}>
        <nav
          className={styles.periods}
          aria-label="Analytics period"
        >
          {[7, 30, 90].map((days) => (
            <Link
              key={days}
              href={`${active}?days=${days}`}
              className={
                periodDays === days
                  ? styles.active
                  : ""
              }
            >
              {days} days
            </Link>
          ))}
        </nav>

        {migrationRequired ? (
          <div className={styles.notice}>
            Apply
            {" "}
            <code>
              supabase/migrations/20260720213000_create_analytics_lab.sql
            </code>
            {" "}
            to unlock visitor retention and versioned events.
          </div>
        ) : null}

        {sampleWarning ? (
          <div className={styles.warning}>
            {sampleWarning}
          </div>
        ) : null}
      </div>

      {children}
    </main>
  );
}

export function readAnalyticsPeriod(
  value: string | string[] | undefined
): AnalyticsPeriodDays {
  const raw =
    Array.isArray(value)
      ? value[0]
      : value;

  if (raw === "7" || raw === "90") {
    return Number(raw) as AnalyticsPeriodDays;
  }

  return 30;
}

export { styles as analyticsStyles };
