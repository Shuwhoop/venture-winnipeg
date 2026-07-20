import Link from "next/link";
import type {
  ReactNode
} from "react";

import type {
  PipelinePeriodDays
} from "@/lib/admin/data-pipeline";

import styles from "./data-pipeline.module.css";

const NAV_ITEMS = [
  ["/admin/data-pipeline", "Overview"],
  ["/admin/data-pipeline/events", "Events"],
  ["/admin/data-pipeline/quality", "Quality"]
] as const;

export function PipelineShell({
  active,
  periodDays,
  title,
  intro,
  migrationRequired,
  truncated,
  children
}: {
  active: string;
  periodDays: PipelinePeriodDays;
  title: string;
  intro: string;
  migrationRequired?: boolean;
  truncated?: boolean;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            VENTURE DATA ENGINEERING
          </p>
          <h1>{title}</h1>
          <p className={styles.intro}>
            {intro}
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/admin/analytics">
            Analytics
          </Link>
          <Link href="/admin/experiments">
            Experiments
          </Link>
          <Link href="/admin/data-health">
            Data health
          </Link>
          <Link href="/admin/import">
            Import
          </Link>
        </div>
      </header>

      <nav
        className={styles.nav}
        aria-label="Data pipeline sections"
      >
        {NAV_ITEMS.map(([href, label]) => (
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
        ))}
      </nav>

      <div className={styles.controls}>
        <nav
          className={styles.periods}
          aria-label="Pipeline period"
        >
          {[1, 7, 30].map((days) => (
            <Link
              key={days}
              href={`${active}?days=${days}`}
              className={
                periodDays === days
                  ? styles.active
                  : ""
              }
            >
              {days === 1
                ? "24 hours"
                : `${days} days`}
            </Link>
          ))}
        </nav>

        {migrationRequired ? (
          <div className={styles.notice}>
            Apply the corrected Analytics Lab migration at
            {" "}
            <code>
              supabase/migrations/20260720213000_create_analytics_lab.sql
            </code>
            {" "}
            before trusting visitor, version, and latency coverage.
          </div>
        ) : null}

        {truncated ? (
          <div className={styles.warning}>
            This report reached its 50,000-event safety limit. Narrow the date range before drawing conclusions.
          </div>
        ) : null}
      </div>

      {children}
    </main>
  );
}

export function readPipelinePeriod(
  value: string | string[] | undefined
): PipelinePeriodDays {
  const raw = Array.isArray(value)
    ? value[0]
    : value;

  if (raw === "1" || raw === "7") {
    return Number(raw) as PipelinePeriodDays;
  }

  return 30;
}

export {
  styles as pipelineStyles
};
