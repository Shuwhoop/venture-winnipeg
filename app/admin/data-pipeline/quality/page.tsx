import type {
  Metadata
} from "next";

import {
  getDataPipelineLab
} from "@/lib/admin/data-pipeline";
import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  PipelineShell,
  pipelineStyles as styles,
  readPipelinePeriod
} from "../pipeline-shell";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "Analytics Data Quality | Venture Admin",
  description:
    "Private Venture analytics quality diagnostics."
};

type PageProps = {
  searchParams: Promise<{
    days?: string | string[];
  }>;
};

export default async function PipelineQualityPage({
  searchParams
}: PageProps) {
  await requireVentureAdmin();

  const params = await searchParams;
  const periodDays =
    readPipelinePeriod(params.days);
  const lab =
    await getDataPipelineLab(periodDays);

  return (
    <PipelineShell
      active="/admin/data-pipeline/quality"
      periodDays={periodDays}
      title="Data Quality"
      intro="Separate product behaviour from instrumentation defects by identifying malformed events, probable duplicates, weak metadata coverage, and impossible journey sequences."
      migrationRequired={
        lab.migrationRequired
      }
      truncated={lab.truncated}
    >
      {lab.error ? (
        <section className={styles.error}>
          {lab.error}
        </section>
      ) : null}

      <section className={styles.metrics}>
        <article className={styles.metric}>
          <span>Quality score</span>
          <strong>
            {lab.qualityScore === null
              ? "—"
              : lab.qualityScore}
          </strong>
          <small>{lab.qualityLabel}</small>
        </article>

        <article className={styles.metric}>
          <span>Flagged events</span>
          <strong>
            {lab.totals.suspicious}
          </strong>
          <small>
            Warnings or errors in this period
          </small>
        </article>

        <article className={styles.metric}>
          <span>Issue types</span>
          <strong>
            {lab.issues.length}
          </strong>
          <small>
            Distinct diagnostics currently present
          </small>
        </article>
      </section>

      <section className={`${styles.grid} ${styles.two}`}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                ISSUE REGISTER
              </p>
              <h2>What needs attention</h2>
            </div>
          </div>

          {lab.issues.length === 0 ? (
            <p className={styles.empty}>
              No quality issues were found in the selected period.
            </p>
          ) : (
            <div className={styles.issueList}>
              {lab.issues.map((item) => (
                <div
                  className={styles.statLine}
                  key={item.code}
                >
                  <span>
                    {item.label}
                    {" "}
                    <small>
                      ({item.severity})
                    </small>
                  </span>
                  <strong>
                    {item.count} · {item.percentage}%
                  </strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                JOURNEY ORDER
              </p>
              <h2>Sequence warnings</h2>
              <p className={styles.cardCopy}>
                These are diagnostic warnings, not automatic proof that a user journey was impossible.
              </p>
            </div>
          </div>

          {lab.sequences.length === 0 ? (
            <p className={styles.empty}>
              No out-of-order journey patterns were detected.
            </p>
          ) : (
            <div className={styles.statList}>
              {lab.sequences.map((item) => (
                <div
                  className={styles.statLine}
                  key={item.label}
                >
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.kicker}>
              SUSPICIOUS RECORDS
            </p>
            <h2>Repair the instrumentation, not the history</h2>
            <p className={styles.cardCopy}>
              Analytics events remain immutable. Fix the emitting code, document the affected period, and exclude defective rows in later analysis when necessary.
            </p>
          </div>
        </div>

        {lab.suspicious.length === 0 ? (
          <p className={styles.empty}>
            No warning or error records were found.
          </p>
        ) : (
          <div className={styles.stack}>
            {lab.suspicious
              .slice(0, 40)
              .map((event) => (
                <article
                  className={styles.eventCard}
                  key={event.id}
                >
                  <div className={styles.eventHeader}>
                    <div>
                      <h3>{event.eventName}</h3>
                      <p className={styles.eventPath}>
                        {event.pagePath}
                      </p>
                    </div>
                    <time
                      className={styles.muted}
                      dateTime={event.createdAt}
                    >
                      {new Date(
                        event.createdAt
                      ).toLocaleString()}
                    </time>
                  </div>

                  <div className={styles.issueBadges}>
                    {event.issues
                      .filter(
                        (item) =>
                          item.severity !== "info"
                      )
                      .map((item) => (
                        <span
                          className={`${styles.issueBadge} ${
                            item.severity === "error"
                              ? styles.errorBadge
                              : ""
                          }`}
                          key={item.code}
                        >
                          {item.label}
                        </span>
                      ))}
                  </div>
                </article>
              ))}
          </div>
        )}
      </section>

      <section className={styles.exportActions}>
        <a
          href={`/api/admin/data-pipeline/export?dataset=suspicious&days=${periodDays}`}
        >
          Export suspicious-event CSV
        </a>
      </section>
    </PipelineShell>
  );
}
