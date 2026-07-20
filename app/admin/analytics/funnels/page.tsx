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
    "Funnels | Venture Analytics Lab",
  description:
    "Private Venture ordered funnel analysis."
};

type PageProps = {
  searchParams: Promise<{
    days?: string | string[];
  }>;
};

export default async function FunnelsPage({
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
      active="/admin/analytics/funnels"
      periodDays={periodDays}
      title="Funnel Analysis"
      intro="Follow anonymous sessions through Venture’s core journey in event order, then locate the largest leak before adding more features."
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
          <span>Starting sessions</span>
          <strong>
            {lab.funnel[0]?.sessions ?? 0}
          </strong>
          <small>
            Sessions entering the ordered funnel
          </small>
        </article>

        <article className={styles.metric}>
          <span>Listing viewers</span>
          <strong>
            {lab.funnel.find(
              (stage) =>
                stage.key === "listing"
            )?.sessions ?? 0}
          </strong>
          <small>
            Sessions reaching a detail view
          </small>
        </article>

        <article className={styles.metric}>
          <span>Plans generated</span>
          <strong>
            {lab.funnel.find(
              (stage) =>
                stage.key === "generated"
            )?.sessions ?? 0}
          </strong>
          <small>
            Sessions generating a route
          </small>
        </article>

        <article className={styles.metric}>
          <span>Value actions</span>
          <strong>
            {lab.funnel.find(
              (stage) =>
                stage.key === "value"
            )?.sessions ?? 0}
          </strong>
          <small>
            Saves, shares, signups, or feedback
          </small>
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.kicker}>
              ORDERED CONVERSION
            </p>
            <h2>Core session funnel</h2>
            <p className={styles.cardCopy}>
              A session must hit each stage after the previous stage. Direct-entry users are therefore excluded from downstream stages unless they complete the ordered path.
            </p>
          </div>
        </div>

        {lab.funnel.length === 0 ? (
          <p className={styles.empty}>
            No funnel events yet.
          </p>
        ) : (
          <div className={styles.funnel}>
            {lab.funnel.map(
              (stage) => (
                <article
                  className={styles.funnelStep}
                  key={stage.key}
                >
                  <div className={styles.funnelTop}>
                    <span>{stage.label}</span>
                    <strong>
                      {stage.sessions}
                    </strong>
                  </div>

                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width:
                          `${stage.overallRate}%`
                      }}
                    />
                  </div>

                  <div className={styles.funnelMeta}>
                    <span className={styles.pill}>
                      {stage.overallRate}% of entry
                    </span>
                    <span className={styles.pill}>
                      {stage.previousRate}% from previous
                    </span>
                    {stage.dropoff > 0 ? (
                      <span className={styles.pill}>
                        {stage.dropoff} dropped
                      </span>
                    ) : null}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                OUTING QUALITY
              </p>
              <h2>Generation outcomes</h2>
            </div>
          </div>

          {lab.inventory.outingOutcomes.length === 0 ? (
            <p className={styles.empty}>
              No outing generation outcomes have been recorded yet.
            </p>
          ) : (
            <div className={styles.barList}>
              {lab.inventory.outingOutcomes.map(
                (outcome) => (
                  <div
                    className={styles.barRow}
                    key={outcome.status}
                  >
                    <span>{outcome.status}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width:
                            `${outcome.percentage}%`
                        }}
                      />
                    </div>
                    <strong>
                      {outcome.count} ·{" "}
                      {outcome.percentage}%
                    </strong>
                  </div>
                )
              )}
            </div>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                INTERPRETATION
              </p>
              <h2>How to use this</h2>
            </div>
          </div>

          <div className={styles.glossary}>
            <article>
              <strong>
                Large discovery drop
              </strong>
              <p>
                Revisit homepage clarity, navigation labels, and the value shown before a user commits to browsing.
              </p>
            </article>
            <article>
              <strong>
                Listing-to-builder drop
              </strong>
              <p>
                Add stronger “build around this” pathways and explain how Venture turns a listing into a complete outing.
              </p>
            </article>
            <article>
              <strong>
                Partial-plan concentration
              </strong>
              <p>
                Improve verified inventory coverage, opening hours, coordinates, and event schedules before changing the ranking algorithm.
              </p>
            </article>
          </div>
        </article>
      </section>
    </AnalyticsShell>
  );
}
