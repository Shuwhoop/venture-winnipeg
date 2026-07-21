import type {
  Metadata
} from "next";
import Link from "next/link";

import {
  ReportReviewActions
} from "@/components/admin/report-review-actions";
import {
  getReportItems
} from "@/lib/admin/trust-queues";
import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import styles from "../trust-queues.module.css";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title: "Incorrect Information Reports | Venture Admin",
  description:
    "Review public reports about incorrect Venture listing information."
};

type PageProps = {
  searchParams: Promise<{
    status?: string | string[];
  }>;
};

function first(
  value: string | string[] | undefined
): string {
  return Array.isArray(value)
    ? value[0] ?? "open"
    : value ?? "open";
}

function readable(
  value: string
): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Winnipeg",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(new Date(value));
}

export default async function ReportsPage({
  searchParams
}: PageProps) {
  await requireVentureAdmin();
  const status = first(
    (await searchParams).status
  );
  const items =
    await getReportItems(status);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            TRUST & CORRECTIONS
          </p>
          <h1>Incorrect-info reports</h1>
          <p>
            Review reports against official or independently trustworthy sources before changing public information.
          </p>
        </div>
      </header>

      <nav className={styles.filters}>
        {[
          "open",
          "triaged",
          "investigating",
          "resolved",
          "rejected",
          "all"
        ].map((option) => (
          <Link
            href={`/admin/reports?status=${option}`}
            className={
              status === option
                ? styles.active
                : ""
            }
            key={option}
          >
            {option}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className={styles.empty}>
          No reports match this status.
        </div>
      ) : (
        <div className={styles.cards}>
          {items.map((item) => (
            <article
              className={styles.card}
              key={item.id}
            >
              <header className={styles.cardHeader}>
                <div>
                  <h2>{item.listingName}</h2>
                  <p>
                    {readable(item.reason)} · {formatDate(item.createdAt)}
                  </p>
                </div>
                <span className={styles.badge}>
                  {item.status}
                </span>
              </header>

              <div className={styles.details}>
                <div className={styles.row}>
                  <strong>Reported correction</strong>
                  <span>
                    {item.details || "No additional details supplied."}
                  </span>
                </div>
                {item.sourceUrl ? (
                  <div className={styles.row}>
                    <strong>Supporting source</strong>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.sourceUrl}
                    </a>
                  </div>
                ) : null}
                <div className={styles.publicLinks}>
                  {item.listingSlug ? (
                    <Link href={`/listings/${item.listingSlug}`}>
                      View listing
                    </Link>
                  ) : null}
                  <Link href={`/admin/listings/${item.entityType}/${item.entityId}?returnTo=${encodeURIComponent(`/admin/reports?status=${status}`)}`}>
                    Edit listing
                  </Link>
                </div>
              </div>

              <div className={styles.actions}>
                <ReportReviewActions
                  reportId={item.id}
                  currentStatus={item.status}
                  currentNotes={item.resolutionNotes}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
