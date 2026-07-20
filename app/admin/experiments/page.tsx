import type {
  Metadata
} from "next";
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
} from "./experiment-shell";
import {
  ExperimentStatusControls
} from "./experiment-status-controls";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "Experiment Lab | Venture Admin",
  description:
    "Private Venture experimentation workspace."
};

type PageProps = {
  searchParams: Promise<{
    days?: string | string[];
  }>;
};

function statusClass(
  status: string
): string {
  if (status === "running") {
    return `${styles.status} ${styles.running}`;
  }

  if (status === "paused") {
    return `${styles.status} ${styles.paused}`;
  }

  if (status === "archived") {
    return `${styles.status} ${styles.archived}`;
  }

  return styles.status;
}

function verdictLabel(
  value: string
): string {
  if (value === "promising") {
    return "Promising signal";
  }

  if (value === "watch") {
    return "Variant is trailing";
  }

  if (
    value ===
    "no-clear-difference"
  ) {
    return "No clear difference";
  }

  if (
    value ===
    "insufficient-sample"
  ) {
    return "Insufficient sample";
  }

  return "Not comparable";
}

export default async function ExperimentsPage({
  searchParams
}: PageProps) {
  await requireVentureAdmin();

  const params =
    await searchParams;

  const periodDays =
    readExperimentPeriod(
      params.days
    );

  const lab =
    await getExperimentLab(
      periodDays
    );

  return (
    <ExperimentShell
      active="/admin/experiments"
      periodDays={periodDays}
      title="Experiment Lab"
      intro="Run deterministic, privacy-conscious product experiments, compare conversion intervals, and resist declaring a winner before the sample earns it."
      migrationRequired={
        lab.migrationRequired
      }
    >
      {lab.error ? (
        <section className={styles.error}>
          {lab.error}
        </section>
      ) : null}

      <section className={styles.metrics}>
        <article className={styles.metric}>
          <span>Experiments</span>
          <strong>
            {lab.totals.experiments}
          </strong>
          <small>
            Registered tests
          </small>
        </article>

        <article className={styles.metric}>
          <span>Running</span>
          <strong>
            {lab.totals.running}
          </strong>
          <small>
            Assigning traffic now
          </small>
        </article>

        <article className={styles.metric}>
          <span>Exposures</span>
          <strong>
            {lab.totals.exposures}
          </strong>
          <small>
            Deduplicated sessions
          </small>
        </article>

        <article className={styles.metric}>
          <span>Conversions</span>
          <strong>
            {lab.totals.conversions}
          </strong>
          <small>
            Primary-event sessions
          </small>
        </article>
      </section>

      <section className={styles.grid}>
        {lab.experiments.length ===
        0 ? (
          <article className={styles.card}>
            <h2>No experiments yet</h2>
            <p className={styles.empty}>
              Apply the migration to seed the first outing-results presentation test.
            </p>
          </article>
        ) : (
          lab.experiments.map(
            (result) => (
              <article
                className={styles.card}
                key={
                  result.experiment.id
                }
              >
                <div className={styles.cardHeader}>
                  <div>
                    <span
                      className={statusClass(
                        result.experiment
                          .status
                      )}
                    >
                      {result.experiment.status}
                    </span>

                    <h2>
                      {result.experiment.name}
                    </h2>

                    <p className={styles.cardCopy}>
                      {result.experiment.hypothesis}
                    </p>
                  </div>

                  <Link
                    className={styles.detailLink}
                    href={`/admin/experiments/${result.experiment.slug}?days=${periodDays}`}
                  >
                    Full analysis
                  </Link>
                </div>

                {result.sampleWarning ? (
                  <div className={styles.warning}>
                    {result.sampleWarning}
                  </div>
                ) : null}

                <div className={styles.variantGrid}>
                  {result.variants.map(
                    (variant) => (
                      <section
                        className={styles.variant}
                        key={variant.key}
                      >
                        <div className={styles.variantHeader}>
                          <strong>
                            {variant.label}
                          </strong>
                          <span>
                            {variant.exposures} exposures
                          </span>
                        </div>

                        <div className={styles.rate}>
                          <strong>
                            {variant.conversionRate}%
                          </strong>
                          <small>
                            {variant.conversions} primary conversions
                            <br />
                            95% interval {variant.confidenceLow}% to {variant.confidenceHigh}%
                          </small>
                        </div>

                        <div className={styles.statList}>
                          <div className={styles.statLine}>
                            <span>
                              Negative feedback
                            </span>
                            <strong>
                              {variant.negativeFeedbackRate}%
                            </strong>
                          </div>

                          <div className={styles.statLine}>
                            <span>
                              Planned minimum
                            </span>
                            <strong>
                              {variant.minimumReached
                                ? "Reached"
                                : "Not reached"}
                            </strong>
                          </div>
                        </div>
                      </section>
                    )
                  )}
                </div>

                <div className={styles.verdict}>
                  <strong>
                    {verdictLabel(
                      result.comparison.verdict
                    )}
                    {result.comparison
                      .differencePoints !==
                    null
                      ? ` · ${result.comparison.differencePoints > 0 ? "+" : ""}${result.comparison.differencePoints} points`
                      : ""}
                  </strong>
                  {result.comparison.explanation}
                </div>

                <ExperimentStatusControls
                  experimentId={
                    result.experiment.id
                  }
                  currentStatus={
                    result.experiment.status
                  }
                />
              </article>
            )
          )
        )}
      </section>

      <section className={styles.exportActions}>
        <Link
          href={`/api/admin/experiments/export?dataset=experiments&days=${periodDays}`}
        >
          Export experiment CSV
        </Link>
      </section>
    </ExperimentShell>
  );
}
