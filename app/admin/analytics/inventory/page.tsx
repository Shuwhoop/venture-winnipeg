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
    "Inventory Analytics | Venture Analytics Lab",
  description:
    "Private Venture listing coverage and engagement analytics."
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
      day: "numeric"
    }
  ).format(new Date(`${value}T00:00:00Z`));
}

export default async function InventoryAnalyticsPage({
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

  const maximumPublished =
    Math.max(
      1,
      ...lab.inventory.neighbourhoods.map(
        (area) =>
          area.published
      )
    );

  return (
    <AnalyticsShell
      active="/admin/analytics/inventory"
      periodDays={periodDays}
      title="Inventory Analytics"
      intro="Connect catalogue quality to product behaviour. See where Venture has enough verified options, where users show interest, and where the outing builder is starved of usable inventory."
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
          <span>Total places</span>
          <strong>
            {lab.inventory.places}
          </strong>
          <small>
            {lab.inventory.publishedPlaces} published
          </small>
        </article>

        <article className={styles.metric}>
          <span>Total events</span>
          <strong>
            {lab.inventory.events}
          </strong>
          <small>
            {lab.inventory.publishedEvents} published
          </small>
        </article>

        <article className={styles.metric}>
          <span>Upcoming events</span>
          <strong>
            {lab.inventory.upcomingEvents}
          </strong>
          <small>
            Published events with future start times
          </small>
        </article>

        <article className={styles.metric}>
          <span>Neighbourhoods</span>
          <strong>
            {lab.inventory.neighbourhoods.length}
          </strong>
          <small>
            Including missing-neighbourhood records
          </small>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                COVERAGE
              </p>
              <h2>Published inventory by neighbourhood</h2>
              <p className={styles.cardCopy}>
                Thin neighbourhoods are likely to create partial outings and repetitive recommendations.
              </p>
            </div>
          </div>

          {lab.inventory.neighbourhoods.length === 0 ? (
            <p className={styles.empty}>
              No inventory records found.
            </p>
          ) : (
            <div className={styles.barList}>
              {lab.inventory.neighbourhoods
                .slice(0, 20)
                .map((area) => (
                  <div
                    className={styles.barRow}
                    key={area.name}
                  >
                    <span>{area.name}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width:
                            `${Math.round(
                              area.published /
                              maximumPublished *
                              100
                            )}%`
                        }}
                      />
                    </div>
                    <strong>
                      {area.published}/{area.listings}
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
                EVENT SUPPLY
              </p>
              <h2>Upcoming events by week</h2>
              <p className={styles.cardCopy}>
                A healthy city-discovery product needs fresh event density, not only a large historical total.
              </p>
            </div>
          </div>

          <div className={styles.simpleList}>
            {lab.inventory.upcomingByWeek.map(
              (week) => (
                <div
                  className={styles.statLine}
                  key={week.week}
                >
                  <span>
                    Week of{" "}
                    {formatWeek(week.week)}
                  </span>
                  <strong>{week.count}</strong>
                </div>
              )
            )}
          </div>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                ENGAGEMENT
              </p>
              <h2>Top listing interactions</h2>
              <p className={styles.cardCopy}>
                Views and saves use listing IDs captured from instrumented cards, so anonymous route-only views are not falsely assigned.
              </p>
            </div>
          </div>

          {lab.inventory.topListings.length === 0 ? (
            <p className={styles.empty}>
              Listing-level engagement will appear after users open or save instrumented listing cards.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Type</th>
                    <th>Views</th>
                    <th>Saves</th>
                    <th>Save rate</th>
                  </tr>
                </thead>
                <tbody>
                  {lab.inventory.topListings.map(
                    (listing) => (
                      <tr key={listing.id}>
                        <td>
                          <strong>
                            {listing.name}
                          </strong>
                        </td>
                        <td>{listing.type}</td>
                        <td>{listing.views}</td>
                        <td>{listing.saves}</td>
                        <td>
                          {listing.saveRate === null
                            ? "—"
                            : `${listing.saveRate}%`}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>
                CATEGORY MIX
              </p>
              <h2>Catalogue distribution</h2>
            </div>
          </div>

          {lab.inventory.categories.length === 0 ? (
            <p className={styles.empty}>
              No category records found.
            </p>
          ) : (
            <div className={styles.simpleList}>
              {lab.inventory.categories
                .slice(0, 20)
                .map((category) => (
                  <div
                    className={styles.statLine}
                    key={category.name}
                  >
                    <span>{category.name}</span>
                    <strong>
                      {category.published}/{category.listings}
                    </strong>
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
              NEIGHBOURHOOD DEMAND
            </p>
            <h2>Coverage and engagement together</h2>
            <p className={styles.cardCopy}>
              A neighbourhood with high views and few published listings is a strong acquisition target. A neighbourhood with many listings and little engagement may need better curation or presentation.
            </p>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Neighbourhood</th>
                <th>Total</th>
                <th>Published</th>
                <th>Listing views</th>
                <th>Saves</th>
              </tr>
            </thead>
            <tbody>
              {lab.inventory.neighbourhoods.map(
                (area) => (
                  <tr key={area.name}>
                    <td>
                      <strong>
                        {area.name}
                      </strong>
                    </td>
                    <td>{area.listings}</td>
                    <td>{area.published}</td>
                    <td>{area.views}</td>
                    <td>{area.saves}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AnalyticsShell>
  );
}
