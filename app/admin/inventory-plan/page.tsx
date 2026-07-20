import type { Metadata } from "next";
import Link from "next/link";

import { getInventoryPlannerReport } from "@/lib/admin/inventory-planner";
import { requireVentureAdmin } from "@/lib/auth/admin";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inventory Plan | Venture Admin",
  description: "Private Venture coverage targets and practical inventory priorities."
};

function formatWeek(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Winnipeg",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function InventoryPlanPage() {
  await requireVentureAdmin();
  const report = await getInventoryPlannerReport();
  const { metrics, targets } = report;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>VENTURE OPERATIONS</p>
          <h1>Inventory Coverage Plan</h1>
          <p className={styles.intro}>
            Turn data-quality findings into a short, practical collection plan. This page uses simple counts and fixed targets, not a black-box model.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/admin/data-health">Data health</Link>
          <Link href="/admin/import">Import</Link>
          <Link href="/admin/analytics/inventory">Inventory analytics</Link>
          <a href="/api/admin/inventory-plan/export">Export CSV</a>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Inventory planning summary">
        <article>
          <span>Trusted public places</span>
          <strong>{metrics.trustedPublishedPlaces}</strong>
          <small>First target: {targets.trustedPublishedPlaces}</small>
          <progress value={metrics.trustedPublishedPlaces} max={targets.trustedPublishedPlaces} />
        </article>
        <article>
          <span>Trusted future events</span>
          <strong>{metrics.trustedFutureEvents}</strong>
          <small>First target: {targets.trustedFutureEvents}</small>
          <progress value={metrics.trustedFutureEvents} max={targets.trustedFutureEvents} />
        </article>
        <article>
          <span>Outing eligible</span>
          <strong>{metrics.outingEligible}</strong>
          <small>First target: {targets.outingEligibleRecords}</small>
          <progress value={metrics.outingEligible} max={targets.outingEligibleRecords} />
        </article>
        <article className={styles.warningMetric}>
          <span>Missing neighbourhood</span>
          <strong>{metrics.missingNeighbourhood}</strong>
          <small>These records weaken local coverage analysis</small>
        </article>
        <article>
          <span>Near-ready drafts</span>
          <strong>{metrics.nearReadyDrafts}</strong>
          <small>Three or fewer repair items remaining</small>
        </article>
        <article>
          <span>Pitch ready</span>
          <strong>{metrics.pitchReady}</strong>
          <small>Current source, trusted, located, and usable</small>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>DO NEXT</p>
            <h2>Practical priorities</h2>
          </div>
          <time dateTime={report.generatedAt}>Updated {formatDate(report.generatedAt)}</time>
        </div>

        <div className={styles.actionGrid}>
          {report.actions.map((action) => (
            <article key={action.title} className={styles.actionCard}>
              <span className={styles[action.priority]}>{action.priority}</span>
              <h3>{action.title}</h3>
              <p>{action.detail}</p>
              <Link href={action.href}>{action.linkLabel}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.twoColumn}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>NEIGHBOURHOODS</p>
              <h2>Trusted depth</h2>
              <p>Initial target: {targets.trustedPerNeighbourhood} trusted published listings in each active neighbourhood.</p>
            </div>
          </div>
          <div className={styles.list}>
            {report.neighbourhoods.slice(0, 12).map((row) => (
              <div className={styles.coverageRow} key={row.name}>
                <div>
                  <strong>{row.name}</strong>
                  <small>{row.trustedPublished} trusted · {row.published} published · {row.total} total</small>
                </div>
                <div className={styles.progressBlock}>
                  <progress value={row.trustedPublished} max={row.target} />
                  <span>{row.gap === 0 ? "Target met" : `${row.gap} needed`}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>CATEGORIES</p>
              <h2>Choice within categories</h2>
              <p>Initial target: {targets.trustedPerCategory} trusted published options per category.</p>
            </div>
          </div>
          <div className={styles.list}>
            {report.categories.slice(0, 12).map((row) => (
              <div className={styles.coverageRow} key={row.name}>
                <div>
                  <strong>{row.name}</strong>
                  <small>{row.trustedPublished} trusted · {row.published} published · {row.total} total</small>
                </div>
                <div className={styles.progressBlock}>
                  <progress value={row.trustedPublished} max={row.target} />
                  <span>{row.gap === 0 ? "Target met" : `${row.gap} needed`}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>COVERAGE MATRIX</p>
            <h2>Where trusted supply exists</h2>
            <p>Counts are trusted, published records. Zeroes reveal where outing variety is likely to be thin.</p>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.matrixTable}>
            <thead>
              <tr>
                <th>Neighbourhood</th>
                {report.matrix.categories.map((category) => <th key={category}>{category}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {report.matrix.rows.map((row) => (
                <tr key={row.neighbourhood}>
                  <td data-label="Neighbourhood"><strong>{row.neighbourhood}</strong></td>
                  {report.matrix.categories.map((category) => (
                    <td data-label={category} key={category} className={row.counts[category] === 0 ? styles.zeroCell : ""}>
                      {row.counts[category] ?? 0}
                    </td>
                  ))}
                  <td data-label="Total"><strong>{row.total}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.twoColumn}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>EVENT SUPPLY</p>
              <h2>Trusted future events by week</h2>
            </div>
          </div>
          {report.upcomingEventsByWeek.length === 0 ? (
            <div className={styles.empty}>
              <strong>No pitch-ready future events found.</strong>
              <p>Import current event drafts, verify their sources and venues, then publish them manually.</p>
              <Link href="/admin/import">Import events</Link>
            </div>
          ) : (
            <div className={styles.list}>
              {report.upcomingEventsByWeek.map((week) => (
                <div className={styles.statRow} key={week.week}>
                  <span>Week of {formatWeek(week.week)}</span>
                  <strong>{week.count}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>READING THE PLAN</p>
              <h2>What these targets mean</h2>
            </div>
          </div>
          <div className={styles.notes}>
            <p><strong>They are operating targets, not scientific predictions.</strong> They create enough choice to test Venture more fairly.</p>
            <p><strong>Trusted means source-backed.</strong> Paying Venture must never buy verification or organic rank.</p>
            <p><strong>Repair beats random volume.</strong> Near-ready drafts are usually the fastest route to a stronger candidate pool.</p>
            <p><strong>The model stays simple.</strong> More complex recommendation methods only become useful after real inventory and user behaviour are available.</p>
          </div>
        </article>
      </section>

      <section className={styles.section} id="repair-candidates">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>REPAIR VALUE</p>
            <h2>Drafts worth finishing first</h2>
            <p>The score is a transparent checklist: fewer serious issues, existing trust, and useful coverage gaps increase priority.</p>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.repairTable}>
            <thead>
              <tr>
                <th>Listing</th>
                <th>Priority</th>
                <th>Why now</th>
                <th>Remaining work</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {report.repairCandidates.map((candidate) => (
                <tr key={candidate.key}>
                  <td data-label="Listing">
                    <strong>{candidate.name}</strong>
                    <small>{candidate.entityType} · {candidate.category}</small>
                    <small>{candidate.neighbourhood ?? "Neighbourhood missing"}</small>
                  </td>
                  <td data-label="Priority"><span className={styles.score}>{candidate.priorityScore}</span></td>
                  <td data-label="Why now">
                    <ul>{candidate.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  </td>
                  <td data-label="Remaining work">
                    <span>{candidate.issueLabels.slice(0, 3).join(" · ")}</span>
                    {candidate.issueLabels.length > 3 ? <small>+{candidate.issueLabels.length - 3} more</small> : null}
                  </td>
                  <td data-label="Action"><Link className={styles.repairLink} href={candidate.repairPath}>Repair</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
