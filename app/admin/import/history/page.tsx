import type { Metadata } from "next";
import Link from "next/link";

import { getInventoryImportHistory } from "@/lib/admin/inventory-import";
import { requireVentureAdmin } from "@/lib/auth/admin";

import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import History | Venture Admin",
  description: "Private history of Venture CSV inventory imports."
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Winnipeg",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export default async function InventoryImportHistoryPage() {
  await requireVentureAdmin();
  const history = await getInventoryImportHistory(100);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>VENTURE ADMIN</p>
          <h1>Import History</h1>
          <p>
            Review when inventory entered Venture, who imported it, and how
            many rows were accepted or skipped.
          </p>
        </div>

        <nav aria-label="Import navigation">
          <Link href="/admin/import">New import</Link>
          <Link href="/admin/data-health">Data health</Link>
        </nav>
      </header>

      {history.length === 0 ? (
        <section className={styles.emptyHistory}>
          <h2>No CSV imports yet.</h2>
          <p>Your first completed import will appear here.</p>
          <Link href="/admin/import">Start an import</Link>
        </section>
      ) : (
        <section className={styles.historyList}>
          {history.map((item) => (
            <article key={item.batchId}>
              <header>
                <div>
                  <span>{item.entityType === "place" ? "PLACES" : "EVENTS"}</span>
                  <h2>{item.filename}</h2>
                </div>
                <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
              </header>

              <dl>
                <div>
                  <dt>Total rows</dt>
                  <dd>{item.totalRows}</dd>
                </div>
                <div>
                  <dt>Imported</dt>
                  <dd>{item.importedRows}</dd>
                </div>
                <div>
                  <dt>Skipped</dt>
                  <dd>{item.skippedRows}</dd>
                </div>
                <div>
                  <dt>Failed</dt>
                  <dd>{item.failedRows}</dd>
                </div>
              </dl>

              <footer>
                <span>{item.adminEmail}</span>
                <code>{item.batchId.slice(0, 8)}</code>
              </footer>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
