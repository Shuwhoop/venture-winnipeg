import type {
  Metadata
} from "next";
import Link from "next/link";

import {
  getAdminHubOverview
} from "@/lib/admin/admin-hub";
import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import styles from "./page.module.css";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Workspace | Venture",
  description:
    "Private command centre for Venture listings, trust, analytics, and data operations."
};

const SECTIONS = [
  {
    eyebrow: "LISTINGS & OPERATIONS",
    title: "Keep the city database useful",
    cards: [
      ["/admin/data-health", "◎", "Data health", "Find missing, stale, or unusable listing fields."],
      ["/admin/quick-repair", "✎", "Quick repair", "Fix common listing issues without opening every full form."],
      ["/admin/inventory-plan", "▦", "Inventory plan", "See which categories and neighbourhoods need depth next."],
      ["/admin/import", "⇧", "Import inventory", "Preview and import draft places or events from CSV."],
      ["/admin/submissions", "+", "Submissions", "Review community place and event submissions."],
      ["/admin/reports", "!", "Incorrect-info reports", "Review factual corrections from public listing pages."],
      ["/admin/claims", "✓", "Business claims", "Verify owners and authorized business representatives."]
    ]
  },
  {
    eyebrow: "ANALYTICS & DATA SCIENCE",
    title: "Understand how Venture performs",
    cards: [
      ["/admin/beta-readiness", "🚦", "Beta readiness", "See launch blockers, live system checks, and the human testing checklist in one place."],
      ["/admin/pwa-readiness", "▣", "PWA readiness", "Check installation, offline support, icons, and app update handling."],
      ["/admin/analytics", "▥", "Analytics Lab", "Product KPIs, sessions, funnels, retention, and inventory behaviour."],
      ["/admin/beta", "◌", "Beta inbox", "Read tester feedback and usefulness ratings."],
      ["/admin/experiments", "A/B", "Experiments", "Compare controlled product variants with sample warnings."],
      ["/admin/recommendations", "↗", "Recommendations", "Evaluate outing completion, saves, shares, and diversity."],
      ["/admin/data-pipeline", "⌁", "Data pipeline", "Check event quality, identifiers, versions, latency, and duplicates."]
    ]
  }
] as const;

export default async function AdminHomePage() {
  await requireVentureAdmin();
  const overview =
    await getAdminHubOverview();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            VENTURE ADMIN WORKSPACE
          </p>
          <h1>Run the whole platform from here.</h1>
          <p>
            Move between listing repair, submissions, trust queues, inventory planning, analytics, experiments, recommendations, and pipeline quality without hunting for hidden routes.
          </p>
        </div>

        <div className={styles.heroActions}>
          <Link href="/admin/quick-repair">
            Edit listings
          </Link>
          <Link href="/admin/analytics">
            Open analytics
          </Link>
          <Link href="/">
            View public site
          </Link>
          <Link href="/build-outing">
            Test outing builder
          </Link>
        </div>
      </section>

      {overview.claimsMigrationRequired ? (
        <div className={styles.notice}>
          Apply <code>supabase/migrations/20260721023000_create_business_claim_requests.sql</code> before public business claims can be collected and reviewed.
        </div>
      ) : null}

      <section className={styles.metrics}>
        <article className={styles.metric}>
          <span>Total listings</span>
          <strong>{overview.totalListings}</strong>
          <small>Places and events in Venture</small>
        </article>
        <article className={styles.metric}>
          <span>Pitch ready</span>
          <strong>{overview.pitchReady}</strong>
          <small>Trusted, current, and usable</small>
        </article>
        <article className={styles.metric}>
          <span>Needs attention</span>
          <strong>{overview.needsAttention}</strong>
          <small>Listing repairs across all statuses</small>
        </article>
        <article className={styles.metric}>
          <span>Future events</span>
          <strong>{overview.futureEvents}</strong>
          <small>Published and upcoming</small>
        </article>
        <article className={styles.metric}>
          <span>Open reports</span>
          <strong>{overview.openReports}</strong>
          <small>Public corrections waiting for review</small>
        </article>
        <article className={styles.metric}>
          <span>Pending claims</span>
          <strong>{overview.pendingClaims}</strong>
          <small>Businesses awaiting verification</small>
        </article>
        <article className={styles.metric}>
          <span>Submissions</span>
          <strong>{overview.pendingSubmissions}</strong>
          <small>Community drafts waiting for review</small>
        </article>
      </section>

      {SECTIONS.map((section) => (
        <section
          className={styles.section}
          key={section.title}
        >
          <header className={styles.sectionHeader}>
            <span>{section.eyebrow}</span>
            <h2>{section.title}</h2>
          </header>

          <div className={styles.cards}>
            {section.cards.map(
              ([href, icon, title, description]) => (
                <Link
                  className={styles.card}
                  href={href}
                  key={href}
                >
                  <span className={styles.icon}>
                    {icon}
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  <b aria-hidden="true">›</b>
                </Link>
              )
            )}
          </div>
        </section>
      ))}
    </main>
  );
}
