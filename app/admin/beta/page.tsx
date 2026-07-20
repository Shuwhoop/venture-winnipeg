import type { Metadata } from "next";
import Link from "next/link";

import {
  getBetaInsights,
  type BetaPeriodDays
} from "@/lib/admin/beta-insights";
import { requireVentureAdmin } from "@/lib/auth/admin";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Beta Insights | Venture Admin",
  description:
    "Private Venture dashboard for outside-test usage and feedback."
};

type PageProps = {
  searchParams: Promise<{
    days?: string | string[];
  }>;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Winnipeg",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function categoryLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function BetaInsightsPage({
  searchParams
}: PageProps) {
  await requireVentureAdmin();

  const params = await searchParams;
  const rawDays = Array.isArray(params.days) ? params.days[0] : params.days;
  const periodDays: BetaPeriodDays =
    rawDays === "7" || rawDays === "90"
      ? Number(rawDays) as BetaPeriodDays
      : 30;

  const insights = await getBetaInsights(periodDays);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>VENTURE ADMIN</p>
          <h1>Beta Insights</h1>
          <p className={styles.intro}>
            See whether outside testers are discovering listings, reaching
            outing results, and telling Venture what should improve next.
          </p>
        </div>

        <div className={styles.actions}>
          <Link href="/admin/analytics">Analytics Lab</Link>
          <Link href="/admin/data-health">Data health</Link>
          <Link href="/admin/import">Import inventory</Link>
        </div>
      </header>

      <nav className={styles.periods} aria-label="Insight period">
        {[7, 30, 90].map((days) => (
          <Link
            key={days}
            className={periodDays === days ? styles.active : ""}
            href={`/admin/beta?days=${days}`}
          >
            {days} days
          </Link>
        ))}
      </nav>

      {!insights.configured ? (
        <section className={styles.setup}>
          <strong>Database setup required</strong>
          <p>{insights.error}</p>
          <code>
            supabase/migrations/20260720190000_create_beta_feedback.sql
          </code>
        </section>
      ) : insights.error ? (
        <section className={styles.setup}>
          <strong>Insights unavailable</strong>
          <p>{insights.error}</p>
        </section>
      ) : (
        <>
          <section className={styles.metrics} aria-label="Beta summary">
            <article>
              <span>Test sessions</span>
              <strong>{insights.metrics.sessions}</strong>
              <small>Anonymous browser sessions</small>
            </article>
            <article>
              <span>Page views</span>
              <strong>{insights.metrics.pageViews}</strong>
              <small>Public Venture screens viewed</small>
            </article>
            <article>
              <span>Feedback</span>
              <strong>{insights.metrics.feedbackCount}</strong>
              <small>
                {insights.metrics.feedbackOpenRate ?? 0}% opened the form
              </small>
            </article>
            <article>
              <span>Average usefulness</span>
              <strong>
                {insights.metrics.averageRating === null
                  ? "—"
                  : `${insights.metrics.averageRating}/5`}
              </strong>
              <small>Optional tester rating</small>
            </article>
          </section>

          <section className={styles.grid}>
            <article className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p>CORE JOURNEY</p>
                  <h2>Outside-test funnel</h2>
                </div>
              </div>

              <div className={styles.funnel}>
                {insights.funnel.map((stage) => (
                  <div key={stage.key}>
                    <span>{stage.label}</span>
                    <strong>{stage.sessions}</strong>
                    <small>{stage.percentage}% of sessions</small>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p>DISCOVERY</p>
                  <h2>Most viewed pages</h2>
                </div>
              </div>

              {insights.topPages.length === 0 ? (
                <p className={styles.empty}>No page views yet.</p>
              ) : (
                <div className={styles.pageList}>
                  {insights.topPages.map((page) => (
                    <div key={page.path}>
                      <code>{page.path}</code>
                      <span>{page.views} views</span>
                      <small>{page.sessions} sessions</small>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className={styles.feedbackSection}>
            <div className={styles.sectionHeading}>
              <div>
                <p>TESTER VOICE</p>
                <h2>Recent feedback</h2>
              </div>

              <div className={styles.categorySummary}>
                {insights.feedbackCategories.map((item) => (
                  <span key={item.category}>
                    {categoryLabel(item.category)} {item.count}
                  </span>
                ))}
              </div>
            </div>

            {insights.recentFeedback.length === 0 ? (
              <p className={styles.empty}>No feedback has been submitted yet.</p>
            ) : (
              <div className={styles.feedbackList}>
                {insights.recentFeedback.map((item) => (
                  <article key={item.id}>
                    <header>
                      <span>{categoryLabel(item.category)}</span>
                      <strong>
                        {item.rating === null ? "No rating" : `${item.rating}/5`}
                      </strong>
                      <time>{formatDate(item.created_at)}</time>
                    </header>
                    <p>{item.message}</p>
                    <footer>
                      <code>{item.page_path}</code>
                      {item.contact_email ? (
                        <a href={`mailto:${item.contact_email}`}>
                          Contact tester
                        </a>
                      ) : (
                        <span>Anonymous</span>
                      )}
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
