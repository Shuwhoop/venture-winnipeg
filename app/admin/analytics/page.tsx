import type {
  Metadata
} from "next";

import Link from "next/link";

import {
  ANALYTICS_EVENT_TAXONOMY,
  ANALYTICS_METRIC_GLOSSARY,
  getAnalyticsLab
} from "@/lib/admin/analytics-lab";
import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  AnalyticsShell,
  analyticsStyles as styles,
  readAnalyticsPeriod
} from "./analytics-shell";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "Analytics Lab | Venture Admin",
  description:
    "Private Venture product analytics, metrics, and data-science workspace."
};

type PageProps = {
  searchParams: Promise<{
    days?: string | string[];
  }>;
};

export default async function AnalyticsOverviewPage({
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

  const maxViews =
    Math.max(
      1,
      ...lab.daily.map(
        (day) =>
          day.pageViews
      )
    );

  return (
    <AnalyticsShell
      active="/admin/analytics"
      periodDays={periodDays}
      title="Analytics Lab"
      intro="Measure real product behaviour with explicit definitions, honest sample warnings, and privacy-conscious anonymous identifiers."
      migrationRequired={
        lab.migrationRequired
      }
      sampleWarning={
        lab.sampleWarning
      }
    >
      {lab.error ? (
        <section
          className={styles.error}
        >
          {lab.error}
        </section>
      ) : null}

      <section
        className={styles.metrics}
        aria-label="Product analytics summary"
      >
        <article className={styles.metric}>
          <span>Active visitors</span>
          <strong>
            {lab.overview.visitors}
          </strong>
          <small>
            {lab.overview.newVisitors} new ·{" "}
            {lab.overview.returningVisitors} returning
          </small>
        </article>

        <article className={styles.metric}>
          <span>Sessions</span>
          <strong>
            {lab.overview.sessions}
          </strong>
          <small>
            {lab.overview.averageSessionDepth} page views per session
          </small>
        </article>

        <article className={styles.metric}>
          <span>Bounce rate</span>
          <strong>
            {lab.overview.bounceRate}%
          </strong>
          <small>
            Sessions with one or fewer page views
          </small>
        </article>

        <article className={styles.metric}>
          <span>Outing completion</span>
          <strong>
            {lab.overview.outingCompletionRate === null
              ? "—"
              : `${lab.overview.outingCompletionRate}%`}
          </strong>
          <small>
            {lab.overview.outingsGenerated} plans generated
          </small>
        </article>

        <article className={styles.metric}>
          <span>Page views</span>
          <strong>
            {lab.overview.pageViews}
          </strong>
          <small>
            Public routes only
          </small>
        </article>

        <article className={styles.metric}>
          <span>Shares</span>
          <strong>
            {lab.overview.shares}
          </strong>
          <small>
            Share links successfully created
          </small>
        </article>

        <article className={styles.metric}>
          <span>Feedback</span>
          <strong>
            {lab.overview.feedbackCount}
          </strong>
          <small>
            Tester submissions in this period
          </small>
        </article>

        <article className={styles.metric}>
          <span>Inventory</span>
          <strong>
            {lab.inventory.publishedPlaces +
              lab.inventory.publishedEvents}
          </strong>
          <small>
            Published places and events
          </small>
        </article>
      </section>

      <section
        className={styles.metrics}
        aria-label="Discovery and conversion signals"
      >
        <article className={styles.metric}>
          <span>Searches</span>
          <strong>
            {lab.journey.searches}
          </strong>
          <small>
            {lab.journey.resultViews} result sets viewed
          </small>
        </article>

        <article className={styles.metric}>
          <span>Zero-result rate</span>
          <strong>
            {lab.journey.zeroResultRate === null
              ? "—"
              : `${lab.journey.zeroResultRate}%`}
          </strong>
          <small>
            {lab.journey.zeroResultSearches} searches need catalogue or search repair
          </small>
        </article>

        <article className={styles.metric}>
          <span>Listing save rate</span>
          <strong>
            {lab.journey.listingSaveRate === null
              ? "—"
              : `${lab.journey.listingSaveRate}%`}
          </strong>
          <small>
            {lab.journey.listingSaves} saves from {lab.journey.listingOpens} detail opens
          </small>
        </article>

        <article className={styles.metric}>
          <span>Plan generation</span>
          <strong>
            {lab.journey.generationRate === null
              ? "—"
              : `${lab.journey.generationRate}%`}
          </strong>
          <small>
            {lab.journey.outingsGenerated} generated from {lab.journey.builderOpens} builder opens
          </small>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                SEARCH DEMAND
              </p>
              <h2>Top search phrases</h2>
              <p className={styles.cardCopy}>
                Repeated zero-result phrases point directly to catalogue or search gaps.
              </p>
            </div>
          </div>

          {lab.journey.topSearches.length === 0 ? (
            <p className={styles.empty}>
              Search activity will appear here.
            </p>
          ) : (
            <div className={styles.simpleList}>
              {lab.journey.topSearches.map((item) => (
                <div
                  className={styles.statLine}
                  key={item.query}
                >
                  <span>{item.query}</span>
                  <strong>
                    {item.count}
                    {item.zeroResults > 0
                      ? ` · ${item.zeroResults} empty`
                      : ""}
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
                DISCOVERY CONTROLS
              </p>
              <h2>Most-used filters</h2>
              <p className={styles.cardCopy}>
                Shows which discovery shortcuts are earning their space.
              </p>
            </div>
          </div>

          {lab.journey.topFilters.length === 0 ? (
            <p className={styles.empty}>
              Filter activity will appear here.
            </p>
          ) : (
            <div className={styles.simpleList}>
              {lab.journey.topFilters.map((item) => (
                <div
                  className={styles.statLine}
                  key={item.filter}
                >
                  <span>{item.filter}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                ACTIVITY TREND
              </p>
              <h2>Daily page views</h2>
              <p className={styles.cardCopy}>
                Hover a bar to inspect the daily count.
              </p>
            </div>
          </div>

          <div
            className={styles.trend}
            aria-hidden="true"
          >
            {lab.daily.map((day) => (
              <div
                key={day.date}
                className={styles.trendBar}
                style={{
                  height:
                    `${Math.max(
                      3,
                      Math.round(
                        day.pageViews /
                        maxViews *
                        100
                      )
                    )}%`
                }}
                data-label={`${day.date}: ${day.pageViews} views, ${day.sessions} sessions`}
                title={`${day.date}: ${day.pageViews} page views`}
              />
            ))}
          </div>

          <ul className="sr-only">
            {lab.daily.map((day) => (
              <li key={day.date}>
                {day.date}: {day.pageViews} page views and {day.sessions} sessions.
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                SEGMENTS
              </p>
              <h2>Device mix</h2>
            </div>
          </div>

          {lab.devices.length === 0 ? (
            <p className={styles.empty}>
              No device data yet.
            </p>
          ) : (
            <div className={styles.barList}>
              {lab.devices.map((device) => (
                <div
                  className={styles.barRow}
                  key={device.label}
                >
                  <span>{device.label}</span>
                  <div
                    className={styles.barTrack}
                  >
                    <div
                      className={styles.barFill}
                      style={{
                        width:
                          `${device.percentage}%`
                      }}
                    />
                  </div>
                  <strong>
                    {device.sessions} ·{" "}
                    {device.percentage}%
                  </strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                ACQUISITION
              </p>
              <h2>Referrer hosts</h2>
            </div>
          </div>

          {lab.referrers.length === 0 ? (
            <p className={styles.empty}>
              No referrer data yet.
            </p>
          ) : (
            <div className={styles.simpleList}>
              {lab.referrers.map((item) => (
                <div
                  className={styles.statLine}
                  key={item.label}
                >
                  <span>{item.label}</span>
                  <strong>
                    {item.sessions}
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
                EXPORTS
              </p>
              <h2>Take the data further</h2>
              <p className={styles.cardCopy}>
                Export clean CSVs for Python, R, Power BI, Excel, or a portfolio notebook.
              </p>
            </div>
          </div>

          <div className={styles.exportActions}>
            <a
              href={`/api/admin/analytics/export?dataset=events&days=${periodDays}`}
            >
              Events CSV
            </a>
            <a
              href={`/api/admin/analytics/export?dataset=sessions&days=${periodDays}`}
            >
              Sessions CSV
            </a>
            <a
              href={`/api/admin/analytics/export?dataset=feedback&days=${periodDays}`}
            >
              Feedback CSV
            </a>
            <a
              href={`/api/admin/analytics/export?dataset=inventory&days=${periodDays}`}
            >
              Inventory CSV
            </a>
          </div>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                METRIC CONTRACTS
              </p>
              <h2>Metric glossary</h2>
              <p className={styles.cardCopy}>
                Each metric has an explicit numerator, denominator, and interpretation.
              </p>
            </div>
          </div>

          <div className={styles.glossary}>
            {ANALYTICS_METRIC_GLOSSARY.map(
              (item) => (
                <article key={item.metric}>
                  <strong>
                    {item.metric}
                  </strong>
                  <p>
                    {item.definition}
                  </p>
                  <p>
                    <b>Denominator:</b>{" "}
                    {item.denominator}
                  </p>
                </article>
              )
            )}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                EVENT MODEL
              </p>
              <h2>Tracking taxonomy</h2>
              <p className={styles.cardCopy}>
                Stable event names keep analysis reproducible as Venture grows.
              </p>
            </div>
          </div>

          <div className={styles.taxonomy}>
            {ANALYTICS_EVENT_TAXONOMY.map(
              (group) => (
                <article key={group.group}>
                  <strong>
                    {group.group}
                  </strong>
                  {group.events.map(
                    ([event, meaning]) => (
                      <p key={event}>
                        <code>{event}</code>
                        {" · "}
                        {meaning}
                      </p>
                    )
                  )}
                </article>
              )
            )}
          </div>
        </article>
      </section>

      <div className={styles.exportActions}>
        <Link
          href={`/admin/analytics/funnels?days=${periodDays}`}
        >
          Study funnel drop-off
        </Link>
        <Link
          href="/admin/analytics/retention"
        >
          Open retention cohorts
        </Link>
      </div>
    </AnalyticsShell>
  );
}
