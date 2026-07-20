import type {
  Metadata
} from "next";
import Link from "next/link";

import {
  getRecommendationLab
} from "@/lib/admin/experiment-lab";
import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  ExperimentShell,
  experimentStyles as styles,
  readExperimentPeriod
} from "../experiments/experiment-shell";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "Recommendation Evaluation | Venture Admin",
  description:
    "Private Venture outing recommendation evaluation."
};

type PageProps = {
  searchParams: Promise<{
    days?: string | string[];
  }>;
};

export default async function RecommendationsPage({
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
    await getRecommendationLab(
      periodDays
    );

  return (
    <ExperimentShell
      active="/admin/recommendations"
      periodDays={periodDays}
      title="Recommendation Evaluation"
      intro="Compare outing-ranking versions using route completion, saves, shares, replacements, feedback, and diversity rather than relying on a single seductive metric."
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
          <span>Generated plans</span>
          <strong>
            {lab.totals.generated}
          </strong>
          <small>
            All tracked ranking versions
          </small>
        </article>

        <article className={styles.metric}>
          <span>Complete plans</span>
          <strong>
            {lab.totals.complete}
          </strong>
          <small>
            Every requested stop found
          </small>
        </article>

        <article className={styles.metric}>
          <span>Save sessions</span>
          <strong>
            {lab.totals.saves}
          </strong>
          <small>
            Sessions saving a generated plan
          </small>
        </article>

        <article className={styles.metric}>
          <span>Share sessions</span>
          <strong>
            {lab.totals.shares}
          </strong>
          <small>
            Sessions creating a share link
          </small>
        </article>
      </section>

      {lab.versions.length === 0 ? (
        <section className={styles.card}>
          <h2>No versioned outings yet</h2>
          <p className={styles.empty}>
            Generate a fresh outing after deployment. New plans are tagged with <code>route-score-v1</code>.
          </p>
        </section>
      ) : (
        <section className={styles.grid}>
          {lab.versions.map(
            (version) => (
              <article
                className={styles.card}
                key={version.version}
              >
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.kicker}>
                      RANKING VERSION
                    </p>
                    <h2>
                      {version.version}
                    </h2>
                    <p className={styles.cardCopy}>
                      {version.generated} plans across {version.sessions} sessions
                    </p>
                  </div>

                  <span className={`${styles.status} ${styles.running}`}>
                    observed
                  </span>
                </div>

                {version.sampleWarning ? (
                  <div className={styles.warning}>
                    {version.sampleWarning}
                  </div>
                ) : null}

                <div className={styles.variantGrid}>
                  <section className={styles.variant}>
                    <div className={styles.variantHeader}>
                      <strong>
                        Route quality
                      </strong>
                    </div>

                    <div className={styles.rate}>
                      <strong>
                        {version.completionRate}%
                      </strong>
                      <small>
                        complete route rate
                      </small>
                    </div>

                    <div className={styles.statList}>
                      <div className={styles.statLine}>
                        <span>Complete</span>
                        <strong>{version.complete}</strong>
                      </div>
                      <div className={styles.statLine}>
                        <span>Partial</span>
                        <strong>{version.partial}</strong>
                      </div>
                      <div className={styles.statLine}>
                        <span>Empty</span>
                        <strong>{version.empty}</strong>
                      </div>
                      <div className={styles.statLine}>
                        <span>Average stops</span>
                        <strong>{version.averageStops}</strong>
                      </div>
                      <div className={styles.statLine}>
                        <span>Average candidates</span>
                        <strong>{version.averageCandidates}</strong>
                      </div>
                    </div>
                  </section>

                  <section className={styles.variant}>
                    <div className={styles.variantHeader}>
                      <strong>
                        User outcomes
                      </strong>
                    </div>

                    <div className={styles.rate}>
                      <strong>
                        {version.saveRate}%
                      </strong>
                      <small>
                        save rate per generating session
                      </small>
                    </div>

                    <div className={styles.statList}>
                      <div className={styles.statLine}>
                        <span>Share rate</span>
                        <strong>{version.shareRate}%</strong>
                      </div>
                      <div className={styles.statLine}>
                        <span>Positive feedback</span>
                        <strong>{version.positiveFeedbackRate}%</strong>
                      </div>
                      <div className={styles.statLine}>
                        <span>Replacement events</span>
                        <strong>{version.replacementEvents}</strong>
                      </div>
                    </div>
                  </section>
                </div>

                <div className={styles.statList}>
                  <div className={styles.statLine}>
                    <span>
                      Average category diversity
                    </span>
                    <strong>
                      {version.averageCategoryDiversity}
                    </strong>
                  </div>
                  <div className={styles.statLine}>
                    <span>
                      Average neighbourhood diversity
                    </span>
                    <strong>
                      {version.averageNeighbourhoodDiversity}
                    </strong>
                  </div>
                  <div className={styles.statLine}>
                    <span>
                      Average stop-kind diversity
                    </span>
                    <strong>
                      {version.averageStopKindDiversity}
                    </strong>
                  </div>
                </div>
              </article>
            )
          )}
        </section>
      )}

      <section className={styles.exportActions}>
        <Link
          href={`/api/admin/experiments/export?dataset=recommendations&days=${periodDays}`}
        >
          Export recommendation CSV
        </Link>
      </section>
    </ExperimentShell>
  );
}
