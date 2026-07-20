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
} from "./pipeline-shell";
import {
  PipelineTestButton
} from "./pipeline-test-button";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "Data Pipeline Monitor | Venture Admin",
  description:
    "Private Venture analytics ingestion and data-quality monitor."
};

type PageProps = {
  searchParams: Promise<{
    days?: string | string[];
  }>;
};

function formatLatency(
  value: number | null
): string {
  if (value === null) {
    return "—";
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(value / 1000).toFixed(1)} s`;
}

export default async function DataPipelinePage({
  searchParams
}: PageProps) {
  await requireVentureAdmin();

  const params = await searchParams;
  const periodDays =
    readPipelinePeriod(params.days);
  const lab =
    await getDataPipelineLab(periodDays);
  const maxHourly = Math.max(
    1,
    ...lab.hourly.map(
      (hour) => hour.events
    )
  );

  return (
    <PipelineShell
      active="/admin/data-pipeline"
      periodDays={periodDays}
      title="Data Pipeline Monitor"
      intro="Inspect whether Venture's analytics events are arriving completely, promptly, in the right order, and with enough metadata to support defensible decisions."
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

      <section
        className={styles.metrics}
        aria-label="Pipeline summary"
      >
        <article className={styles.metric}>
          <span>Quality score</span>
          <strong>
            {lab.qualityScore === null
              ? "—"
              : `${lab.qualityScore}`}
          </strong>
          <small>{lab.qualityLabel}</small>
        </article>

        <article className={styles.metric}>
          <span>Events</span>
          <strong>
            {lab.totals.selectedPeriod}
          </strong>
          <small>
            {periodDays === 1
              ? "Past 24 hours"
              : `Past ${periodDays} days`}
          </small>
        </article>

        <article className={styles.metric}>
          <span>Last hour</span>
          <strong>
            {lab.totals.lastHour}
          </strong>
          <small>
            {lab.totals.last24Hours} in 24 hours
          </small>
        </article>

        <article className={styles.metric}>
          <span>Visitors</span>
          <strong>
            {lab.totals.visitors}
          </strong>
          <small>
            {lab.totals.sessions} sessions
          </small>
        </article>

        <article className={styles.metric}>
          <span>Suspicious events</span>
          <strong>
            {lab.totals.suspicious}
          </strong>
          <small>
            Warnings and errors, excluding legacy-version notices
          </small>
        </article>

        <article className={styles.metric}>
          <span>P95 ingestion</span>
          <strong>
            {formatLatency(
              lab.latency.p95Ms
            )}
          </strong>
          <small>
            {lab.latency.measured} client timestamps measured
          </small>
        </article>
      </section>

      <section className={`${styles.grid} ${styles.two}`}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                TRUST SIGNAL
              </p>
              <h2>Pipeline quality</h2>
              <p className={styles.cardCopy}>
                A weighted health score, not a claim that every event is perfect.
              </p>
            </div>
          </div>

          <div className={styles.score}>
            <strong>
              {lab.qualityScore === null
                ? "—"
                : lab.qualityScore}
            </strong>
            <p>
              {lab.qualityScore === null
                ? "Send a test event or browse Venture to begin measuring the pipeline."
                : `${lab.qualityLabel}. Review the Quality section before using these events for product decisions.`}
            </p>
          </div>

          <div className={styles.statList}>
            <div className={styles.statLine}>
              <span>Median ingestion</span>
              <strong>
                {formatLatency(
                  lab.latency.medianMs
                )}
              </strong>
            </div>
            <div className={styles.statLine}>
              <span>Slow events</span>
              <strong>
                {lab.latency.slowEvents}
              </strong>
            </div>
            <div className={styles.statLine}>
              <span>Future client timestamps</span>
              <strong>
                {lab.latency.futureEvents}
              </strong>
            </div>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                LIVE CHECK
              </p>
              <h2>End-to-end test</h2>
              <p className={styles.cardCopy}>
                Sends one marked event through the same browser endpoint used by public Venture journeys.
              </p>
            </div>
          </div>

          <PipelineTestButton />
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.kicker}>
              INGESTION VOLUME
            </p>
            <h2>Last 24 hours</h2>
            <p className={styles.cardCopy}>
              Hourly event arrivals using the server timestamp as the source of truth.
            </p>
          </div>
        </div>

        <div
          className={styles.hourly}
          aria-label="Hourly analytics event volume"
        >
          {lab.hourly.map((hour) => (
            <div
              className={styles.hourColumn}
              key={hour.hour}
              title={`${new Date(hour.hour).toLocaleString()}: ${hour.events} events`}
            >
              <div
                className={styles.hourFill}
                style={{
                  height:
                    `${Math.max(
                      3,
                      Math.round(
                        hour.events /
                        maxHourly *
                        100
                      )
                    )}%`
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.grid} ${styles.two}`}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                METADATA COVERAGE
              </p>
              <h2>Can the data answer questions?</h2>
            </div>
          </div>

          <div className={styles.barList}>
            {[
              ["Visitor IDs", lab.coverage.visitorId],
              ["Current version", lab.coverage.currentVersion],
              ["Client timestamps", lab.coverage.clientTimestamp],
              ["Environment labels", lab.coverage.environment]
            ].map(([label, value]) => (
              <div
                className={styles.barRow}
                key={String(label)}
              >
                <span>{label}</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${value}%`
                    }}
                  />
                </div>
                <strong>{value}%</strong>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                ENVIRONMENTS
              </p>
              <h2>Where events came from</h2>
            </div>
          </div>

          {lab.environments.length === 0 ? (
            <p className={styles.empty}>
              No environment metadata yet.
            </p>
          ) : (
            <div className={styles.statList}>
              {lab.environments.map(
                (environment) => (
                  <div
                    className={styles.statLine}
                    key={environment.name}
                  >
                    <span>{environment.name}</span>
                    <strong>
                      {environment.events} · {environment.percentage}%
                    </strong>
                  </div>
                )
              )}
            </div>
          )}
        </article>
      </section>

      <section className={`${styles.grid} ${styles.two}`}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                EXPERIMENT PIPELINE
              </p>
              <h2>Exposure integrity</h2>
            </div>
          </div>

          <div className={styles.statList}>
            <div className={styles.statLine}>
              <span>Exposure events</span>
              <strong>
                {lab.experiments.exposures}
              </strong>
            </div>
            <div className={styles.statLine}>
              <span>Structurally valid</span>
              <strong>
                {lab.experiments.validExposures}
              </strong>
            </div>
            <div className={styles.statLine}>
              <span>Duplicate exposures</span>
              <strong>
                {lab.experiments.duplicateExposures}
              </strong>
            </div>
            <div className={styles.statLine}>
              <span>Reached primary outcome</span>
              <strong>
                {lab.experiments.exposuresWithPrimaryOutcome}
              </strong>
            </div>
            <div className={styles.statLine}>
              <span>No primary outcome yet</span>
              <strong>
                {lab.experiments.exposuresWithoutPrimaryOutcome}
              </strong>
            </div>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                RECOMMENDATION PIPELINE
              </p>
              <h2>Version coverage</h2>
            </div>
          </div>

          <div className={styles.statList}>
            <div className={styles.statLine}>
              <span>Generated outings</span>
              <strong>
                {lab.recommendations.generated}
              </strong>
            </div>
            <div className={styles.statLine}>
              <span>Versioned generations</span>
              <strong>
                {lab.recommendations.versionedGenerated}
              </strong>
            </div>
            <div className={styles.statLine}>
              <span>Outcome events</span>
              <strong>
                {lab.recommendations.outcomeEvents}
              </strong>
            </div>
            <div className={styles.statLine}>
              <span>Versioned outcomes</span>
              <strong>
                {lab.recommendations.versionedOutcomeEvents}
              </strong>
            </div>
            <div className={styles.statLine}>
              <span>Generation coverage</span>
              <strong>
                {lab.coverage.recommendationVersion === null
                  ? "—"
                  : `${lab.coverage.recommendationVersion}%`}
              </strong>
            </div>
          </div>
        </article>
      </section>
    </PipelineShell>
  );
}
