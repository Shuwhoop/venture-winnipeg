import type {
  Metadata
} from "next";

import {
  getAnalyticsLab
} from "@/lib/admin/analytics-lab";
import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  AnalyticsShell,
  analyticsStyles as styles,
  readAnalyticsPeriod
} from "../analytics-shell";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "Retention | Venture Analytics Lab",
  description:
    "Private Venture anonymous visitor cohort retention."
};

type PageProps = {
  searchParams: Promise<{
    days?: string | string[];
  }>;
};

function formatWeek(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  ).format(new Date(`${value}T00:00:00Z`));
}

export default async function RetentionPage({
  searchParams
}: PageProps) {
  await requireVentureAdmin();

  const params =
    await searchParams;

  const periodDays =
    readAnalyticsPeriod(
      params.days
    );

  const lab =
    await getAnalyticsLab(
      periodDays
    );

  return (
    <AnalyticsShell
      active="/admin/analytics/retention"
      periodDays={periodDays}
      title="Retention Cohorts"
      intro="Group anonymous visitors by their first active week and measure whether they return. This is the difference between curiosity and habit."
      migrationRequired={
        lab.migrationRequired
      }
      sampleWarning={
        lab.sampleWarning
      }
    >
      {lab.error ? (
        <section className={styles.error}>
          {lab.error}
        </section>
      ) : null}

      <section className={styles.metrics}>
        <article className={styles.metric}>
          <span>Tracked visitors</span>
          <strong>
            {lab.retention.trackedVisitors}
          </strong>
          <small>
            Visitors with the new persistent anonymous ID
          </small>
        </article>

        <article className={styles.metric}>
          <span>Legacy sessions excluded</span>
          <strong>
            {lab.retention.excludedLegacySessions}
          </strong>
          <small>
            Older sessions cannot support honest visitor retention
          </small>
        </article>

        <article className={styles.metric}>
          <span>Cohorts shown</span>
          <strong>
            {lab.retention.cohorts.length}
          </strong>
          <small>
            First-seen weekly groups
          </small>
        </article>

        <article className={styles.metric}>
          <span>Observation window</span>
          <strong>W0–W4</strong>
          <small>
            First week plus four return weeks
          </small>
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.kicker}>
              WEEKLY COHORT MATRIX
            </p>
            <h2>Anonymous visitor retention</h2>
            <p className={styles.cardCopy}>
              Week 0 is always 100%. Later cells show the share of that first-seen cohort active again in the corresponding calendar week.
            </p>
          </div>
        </div>

        {lab.retention.cohorts.length === 0 ? (
          <p className={styles.empty}>
            No visitor-level cohort data yet. Apply the migration, then collect at least two weeks of traffic.
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>First active week</th>
                  <th>Cohort size</th>
                  <th>Week 0</th>
                  <th>Week 1</th>
                  <th>Week 2</th>
                  <th>Week 3</th>
                  <th>Week 4</th>
                </tr>
              </thead>
              <tbody>
                {lab.retention.cohorts.map(
                  (cohort) => (
                    <tr key={cohort.cohort}>
                      <td>
                        <strong>
                          {formatWeek(
                            cohort.cohort
                          )}
                        </strong>
                      </td>
                      <td>{cohort.size}</td>
                      {cohort.weeks.map(
                        (week) => (
                          <td key={week.week}>
                            <span
                              className={styles.heat}
                              style={{
                                "--heat":
                                  `${
                                    week.percentage === null
                                      ? 0
                                      : Math.max(
                                          4,
                                          week.percentage
                                        )
                                  }%`
                              } as React.CSSProperties}
                              title={
                                week.observable
                                  ? `${week.retained} of ${cohort.size} visitors`
                                  : "This cohort has not reached this week yet"
                              }
                            >
                              {week.percentage === null
                                ? "—"
                                : `${week.percentage}%`}
                            </span>
                          </td>
                        )
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                DATA-SCIENCE NOTE
              </p>
              <h2>Why cohort retention matters</h2>
            </div>
          </div>

          <div className={styles.glossary}>
            <article>
              <strong>Acquisition is not retention</strong>
              <p>
                A launch post can create a traffic spike. Retention asks whether Venture remains useful after the first visit.
              </p>
            </article>
            <article>
              <strong>Do not average cohorts blindly</strong>
              <p>
                Newer cohorts have had less time to reach later weeks. Compare like-for-like cells instead of treating missing future weeks as zero.
              </p>
            </article>
            <article>
              <strong>Small cohorts are noisy</strong>
              <p>
                A single return visit can move a five-person cohort by 20 percentage points. Use the cell count alongside the percentage.
              </p>
            </article>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                PRIVACY
              </p>
              <h2>Anonymous by design</h2>
            </div>
          </div>

          <p className={styles.cardCopy}>
            Retention uses a random browser identifier. It is not an account ID, advertising profile, precise location, or stored IP address. Clearing browser storage resets it.
          </p>
        </article>
      </section>
    </AnalyticsShell>
  );
}
