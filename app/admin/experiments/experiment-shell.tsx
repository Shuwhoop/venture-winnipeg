import Link from "next/link";
import type {
  ReactNode
} from "react";

import type {
  AnalyticsPeriodDays
} from "@/lib/admin/analytics-lab";

import styles from "./experiment-lab.module.css";

const NAV_ITEMS = [
  [
    "/admin/experiments",
    "Experiments"
  ],
  [
    "/admin/recommendations",
    "Recommendations"
  ]
] as const;

export function ExperimentShell({
  active,
  periodDays,
  title,
  intro,
  migrationRequired,
  children
}: {
  active: string;
  periodDays: AnalyticsPeriodDays;
  title: string;
  intro: string;
  migrationRequired?: boolean;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            VENTURE DATA SCIENCE
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
          <Link href="/admin/data-health">
            Data health
          </Link>
          <Link href="/admin/import">
            Import
          </Link>
          <Link href="/admin/data-pipeline">
            Pipeline
          </Link>
        </div>
      </header>

      <nav
        className={styles.nav}
        aria-label="Experiment Lab sections"
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
          aria-label="Analysis period"
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
              supabase/migrations/20260720230000_create_experiment_lab.sql
            </code>
            {" "}
            to activate assignment and reporting.
          </div>
        ) : null}
      </div>

      {children}
    </main>
  );
}

export function readExperimentPeriod(
  value:
    | string
    | string[]
    | undefined
): AnalyticsPeriodDays {
  const raw =
    Array.isArray(value)
      ? value[0]
      : value;

  if (
    raw === "7" ||
    raw === "90"
  ) {
    return Number(
      raw
    ) as AnalyticsPeriodDays;
  }

  return 30;
}

export {
  styles as experimentStyles
};
