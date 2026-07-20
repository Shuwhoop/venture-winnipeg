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
    "Feedback Analytics | Venture Analytics Lab",
  description:
    "Private Venture tester feedback analysis."
};

type PageProps = {
  searchParams: Promise<{
    days?: string | string[];
  }>;
};

function formatDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Winnipeg",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(new Date(value));
}

function label(
  value: string
): string {
  return value
    .split(/[-_]/)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

export default async function FeedbackAnalyticsPage({
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

  const maxRatingCount =
    Math.max(
      1,
      ...lab.feedback.ratings.map(
        (item) => item.count
      )
    );

  return (
    <AnalyticsShell
      active="/admin/analytics/feedback"
      periodDays={periodDays}
      title="Feedback Analysis"
      intro="Turn tester comments into structured evidence without flattening every opinion into one average score."
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
          <span>Submissions</span>
          <strong>
            {lab.feedback.count}
          </strong>
          <small>
            Feedback in the selected period
          </small>
        </article>

        <article className={styles.metric}>
          <span>Average usefulness</span>
          <strong>
            {lab.feedback.averageRating === null
              ? "—"
              : `${lab.feedback.averageRating}/5`}
          </strong>
          <small>
            Optional rating only
          </small>
        </article>

        <article className={styles.metric}>
          <span>Negative pages</span>
          <strong>
            {lab.feedback.negativePages.length}
          </strong>
          <small>
            Pages with ratings of one or two
          </small>
        </article>

        <article className={styles.metric}>
          <span>Recurring keywords</span>
          <strong>
            {lab.feedback.keywords.length}
          </strong>
          <small>
            Common non-stopword terms
          </small>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                RATING DISTRIBUTION
              </p>
              <h2>Do not hide the shape</h2>
              <p className={styles.cardCopy}>
                The distribution matters more than an isolated average.
              </p>
            </div>
          </div>

          <div className={styles.barList}>
            {lab.feedback.ratings.map(
              (item) => (
                <div
                  className={styles.barRow}
                  key={item.rating}
                >
                  <span>
                    {item.rating} / 5
                  </span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width:
                          `${Math.round(
                            item.count /
                            maxRatingCount *
                            100
                          )}%`
                      }}
                    />
                  </div>
                  <strong>
                    {item.count}
                  </strong>
                </div>
              )
            )}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                TOPICS
              </p>
              <h2>Feedback categories</h2>
            </div>
          </div>

          {lab.feedback.categories.length === 0 ? (
            <p className={styles.empty}>
              No feedback categories yet.
            </p>
          ) : (
            <div className={styles.simpleList}>
              {lab.feedback.categories.map(
                (item) => (
                  <div
                    className={styles.statLine}
                    key={item.name}
                  >
                    <span>
                      {label(item.name)}
                    </span>
                    <strong>
                      {item.count}
                    </strong>
                  </div>
                )
              )}
            </div>
          )}
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                TEXT SIGNALS
              </p>
              <h2>Common words</h2>
              <p className={styles.cardCopy}>
                Lightweight frequency analysis, not sentiment truth. Read the original comments before making product decisions.
              </p>
            </div>
          </div>

          {lab.feedback.keywords.length === 0 ? (
            <p className={styles.empty}>
              More written feedback is needed before recurring language appears.
            </p>
          ) : (
            <div className={styles.keywordCloud}>
              {lab.feedback.keywords.map(
                (item) => (
                  <span
                    className={styles.keyword}
                    key={item.word}
                    style={{
                      "--weight":
                        String(
                          Math.min(
                            6,
                            item.count
                          )
                        )
                    } as React.CSSProperties}
                  >
                    {item.word} · {item.count}
                  </span>
                )
              )}
            </div>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                FRICTION
              </p>
              <h2>Low-rated pages</h2>
            </div>
          </div>

          {lab.feedback.negativePages.length === 0 ? (
            <p className={styles.empty}>
              No one- or two-star page ratings in this period.
            </p>
          ) : (
            <div className={styles.simpleList}>
              {lab.feedback.negativePages.map(
                (item) => (
                  <div
                    className={styles.statLine}
                    key={item.path}
                  >
                    <span>{item.path}</span>
                    <strong>
                      {item.count} ·{" "}
                      {item.averageRating}/5
                    </strong>
                  </div>
                )
              )}
            </div>
          )}
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.kicker}>
              TESTER VOICE
            </p>
            <h2>Recent comments</h2>
          </div>
        </div>

        {lab.feedback.recent.length === 0 ? (
          <p className={styles.empty}>
            No feedback has been submitted in this period.
          </p>
        ) : (
          <div className={styles.feedbackList}>
            {lab.feedback.recent.map(
              (item) => (
                <article
                  className={styles.feedbackItem}
                  key={item.id}
                >
                  <header>
                    <span>
                      {label(item.category)}
                    </span>
                    <strong>
                      {item.rating === null
                        ? "No rating"
                        : `${item.rating}/5`}
                    </strong>
                    <time>
                      {formatDate(
                        item.created_at
                      )}
                    </time>
                  </header>

                  <p>{item.message}</p>

                  <footer>
                    <code>
                      {item.page_path}
                    </code>
                    {item.contact_email &&
                    item.permission_to_contact ? (
                      <a
                        href={`mailto:${item.contact_email}`}
                      >
                        Contact tester
                      </a>
                    ) : (
                      <span>Anonymous</span>
                    )}
                  </footer>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </AnalyticsShell>
  );
}
