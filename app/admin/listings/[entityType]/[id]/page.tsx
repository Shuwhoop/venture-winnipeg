import type {
  Metadata
} from "next";
import Link from "next/link";
import {
  notFound
} from "next/navigation";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";
import {
  getAdminListingEditorData
} from "@/lib/admin/listing-editor";
import type {
  AdminListingEntityType
} from "@/lib/admin/listing-editor-types";

import ListingEditorForm from "./listing-editor-form";
import styles from "./page.module.css";

export const dynamic =
  "force-dynamic";

export const metadata:
  Metadata = {
    title:
      "Repair Listing | Venture Admin",
    description:
      "Private Venture editor for listing quality, trust, and outing eligibility."
  };

type PageProps = {
  params: Promise<{
    entityType: string;
    id: string;
  }>;
};

function isEntityType(
  value: string
): value is AdminListingEntityType {
  return (
    value === "place" ||
    value === "event"
  );
}

export default async function AdminListingEditorPage({
  params
}: PageProps) {
  await requireVentureAdmin();

  const {
    entityType,
    id
  } = await params;

  if (
    !isEntityType(entityType) ||
    !id
  ) {
    notFound();
  }

  const data =
    await getAdminListingEditorData(
      entityType,
      id
    );

  if (!data) {
    notFound();
  }

  const name =
    data.record.entityType === "place"
      ? data.record.name
      : data.record.title;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            VENTURE ADMIN · QUICK REPAIR
          </p>
          <h1>{name}</h1>
          <p>
            Repair the fields that control discovery,
            trust, and outing eligibility. Saving writes
            through the server-only administrator client
            and records an audit entry.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/admin/data-health">
            Back to data health
          </Link>
          <Link href="/admin/submissions">
            Review submissions
          </Link>
        </div>
      </header>

      <ListingEditorForm data={data} />
    </main>
  );
}
