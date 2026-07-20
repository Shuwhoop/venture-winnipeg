import type { Metadata } from "next";
import Link from "next/link";

import { requireVentureAdmin } from "@/lib/auth/admin";

import InventoryImportWorkbench from "./import-workbench";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inventory Import | Venture Admin",
  description:
    "Private Venture CSV preview and draft inventory import workspace."
};

export default async function InventoryImportPage() {
  const admin = await requireVentureAdmin();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>VENTURE ADMIN</p>
          <h1>Inventory Import</h1>
          <p>
            Grow Winnipeg coverage without letting questionable data slip into
            public discovery. Every imported listing remains a draft.
          </p>
        </div>

        <nav aria-label="Inventory administration">
          <Link href="/admin/data-health">Data health</Link>
          <Link href="/admin/import/history">Import history</Link>
          <Link href="/admin/submissions">Submissions</Link>
        </nav>
      </header>

      <div className={styles.sessionNote}>
        Signed in as <strong>{admin.email}</strong>
      </div>

      <InventoryImportWorkbench />
    </main>
  );
}
