import type {
  Metadata
} from "next";
import {
  notFound
} from "next/navigation";
import Link from "next/link";

import {
  getExperimentLab
} from "@/lib/admin/experiment-lab";
import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  ExperimentShell,
  experimentStyles as styles,
  readExperimentPeriod
} from "../experiment-shell";
import {
  ExperimentStatusControls
} from "../experiment-status-controls";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "Experiment Detail | Venture Admin",
  description:
    "Private Venture experiment analysis."
};

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    days?: string | string[];
  }>;
};

export default async function ExperimentDetailPage({
  params,
  searchParams
}: PageProps) {
  await requireVentureAdmin();

  const [
    routeParams,
    query
  ] =
    await Promise.all([
      params,
      searchParams
    ]);

  const periodDays =
    readExperimentPeriod(
      query.days
    );

  const lab =
    await getExperimentLab(
      periodDays
    );

  const result =
    lab.experiments.find(
      (item) =>
        item.experiment.slug ===
        routeParams.slug
    );

  if (!result && !lab.error) {
    notFound();
  }

  return (
    <ExperimentShell
      active="/admin/experiments"
      periodDays={periodDays}
      title={
        result?.experiment.name ||
        "Experiment detail"
      }
      intro={
        result?.experiment.hypothesis ||
        "Inspect exposure, conversion, guardrail, and uncertainty metrics."
      }
      migrationRequired={
        lab.migrationRequired
      }
    >
      {lab.error ? (
        <section className={styles.error}>
          {lab.error}
        </section>
      ) : null}

      {result ? (
        <>
          <section className={styles.metrics}>
            <article className={styles.metric}>
              <span>Total exposures</span>
              <strong>
                {result.totalExposures}
              </strong>
              <small>
                First exposure per session
              </small>
            </article>

            <article className={styles.metric}>
              <span>Primary event</span>
              <strong>
                {result.experiment.primary_event}
              </strong>
              <small>
                Conversion definition
              </small>
            </article>

            <article className={styles.metric}>
              <span>Traffic</span>
              <strong>
                {result.experiment.traffic_percentage}%
              </strong>
              <small>
                Eligible visitors assigned
              </small>
            </article>

            <article className={styles.metric}>
              <span>Assignment version</span>
              <strong>
                {result.experiment.assignment_version}
              </strong>
              <small>
                Deterministic hash version
              </small>
            </article>
          </section>

          {result.sampleWarning ? (
            <section className={styles.warning}>
              {result.sampleWarning}
            </section>
          ) : null}

          <section className={`${styles.grid} ${styles.two}`}>
            {result.variants.map(
              (variant) => (
                <article
                  className={styles.card}
                  key={variant.key}
                >
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.kicker}>
                        VARIANT
                      </p>
                      <h2>{variant.label}</h2>
                      <p className={styles.cardCopy}>
                        Key: <code>{variant.key}</code>
                      </p>
                    </div>
                  </div>

                  <div className={styles.rate}>
                    <strong>
                      {variant.conversionRate}%
                    </strong>
                    <small>
                      {variant.conversions} conversions from {variant.exposures} exposures
                    </small>
                  </div>

                  <div className={styles.notice}>
                    95% Wilson interval:
                    {" "}
                    <strong>
                      {variant.confidenceLow}% to {variant.confidenceHigh}%
                    </strong>
                  </div>

                  <div className={styles.statList}>
                    {variant.guardrails.map(
                      (guardrail) => (
                        <div
                          className={styles.statLine}
                          key={guardrail.event}
                        >
                          <span>
                            {guardrail.event}
                          </span>
                          <strong>
                            {guardrail.rate}% · {guardrail.sessions}
                          </strong>
                        </div>
                      )
                    )}

                    <div className={styles.statLine}>
                      <span>
                        Negative feedback
                      </span>
                      <strong>
                        {variant.negativeFeedbackRate}% · {variant.negativeFeedback}
                      </strong>
                    </div>
                  </div>
                </article>
              )
            )}
          </section>

          <section className={styles.card}>
            <div>
              <p className={styles.kicker}>
                INTERPRETATION
              </p>
              <h2>
                {result.comparison.verdict.replaceAll("-", " ")}
              </h2>
              <p className={styles.cardCopy}>
                {result.comparison.explanation}
              </p>
            </div>

            <div className={styles.statLine}>
              <span>
                Difference from control
              </span>
              <strong>
                {result.comparison.differencePoints ===
                null
                  ? "Not available"
                  : `${result.comparison.differencePoints > 0 ? "+" : ""}${result.comparison.differencePoints} percentage points`}
              </strong>
            </div>

            <ExperimentStatusControls
              experimentId={
                result.experiment.id
              }
              currentStatus={
                result.experiment.status
              }
            />
          </section>

          <section className={styles.exportActions}>
            <Link href="/admin/experiments">
              Back to experiments
            </Link>
            <Link
              href={`/api/admin/experiments/export?dataset=experiments&days=${periodDays}`}
            >
              Export CSV
            </Link>
          </section>
        </>
      ) : null}
    </ExperimentShell>
  );
}
