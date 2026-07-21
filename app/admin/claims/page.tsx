import type {
  Metadata
} from "next";
import Link from "next/link";

import {
  ClaimReviewActions
} from "@/components/admin/claim-review-actions";
import {
  getClaimRequests
} from "@/lib/admin/trust-queues";
import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import styles from "../trust-queues.module.css";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title: "Business Claims | Venture Admin",
  description:
    "Review public requests to claim Venture business listings."
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
    ? value[0] ?? "pending"
    : value ?? "pending";
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

export default async function ClaimsPage({
  searchParams
}: PageProps) {
  await requireVentureAdmin();
  const status = first(
    (await searchParams).status
  );
  const result =
    await getClaimRequests(status);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            TRUST & OWNERSHIP
          </p>
          <h1>Business claims</h1>
          <p>
            Verify that claimants genuinely represent the business. Approval confirms the relationship, but does not buy ranking or automatic publication rights.
          </p>
        </div>
      </header>

      <nav className={styles.filters}>
        {[
          "pending",
          "approved",
          "rejected",
          "withdrawn",
          "all"
        ].map((option) => (
          <Link
            href={`/admin/claims?status=${option}`}
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

      {result.migrationRequired ? (
        <div className={styles.notice}>
          Apply <code>supabase/migrations/20260721023000_create_business_claim_requests.sql</code> before collecting or reviewing public claim requests.
        </div>
      ) : result.items.length === 0 ? (
        <div className={styles.empty}>
          No claim requests match this status.
        </div>
      ) : (
        <div className={styles.cards}>
          {result.items.map((item) => (
            <article
              className={styles.card}
              key={item.id}
            >
              <header className={styles.cardHeader}>
                <div>
                  <h2>{item.placeName}</h2>
                  <p>
                    {item.claimantName} · {item.claimantRole.replaceAll("_", " ")} · {formatDate(item.createdAt)}
                  </p>
                </div>
                <span className={styles.badge}>
                  {item.status}
                </span>
              </header>

              <div className={styles.details}>
                <div className={styles.row}>
                  <strong>Business email</strong>
                  <a href={`mailto:${item.businessEmail}`}>
                    {item.businessEmail}
                  </a>
                </div>
                {item.businessPhone ? (
                  <div className={styles.row}>
                    <strong>Business phone</strong>
                    <a href={`tel:${item.businessPhone}`}>
                      {item.businessPhone}
                    </a>
                  </div>
                ) : null}
                <div className={styles.row}>
                  <strong>Official website</strong>
                  <a
                    href={item.officialWebsite}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.officialWebsite}
                  </a>
                </div>
                <div className={styles.row}>
                  <strong>Verification evidence</strong>
                  <span>{item.evidence}</span>
                </div>
                <div className={styles.publicLinks}>
                  {item.placeSlug ? (
                    <Link href={`/listings/${item.placeSlug}`}>
                      View listing
                    </Link>
                  ) : null}
                  <Link href={`/admin/listings/place/${item.placeId}?returnTo=${encodeURIComponent(`/admin/claims?status=${status}`)}`}>
                    Edit listing
                  </Link>
                </div>
              </div>

              <div className={styles.actions}>
                <ClaimReviewActions
                  claimId={item.id}
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
