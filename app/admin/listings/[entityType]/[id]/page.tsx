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

export const metadata: Metadata = {
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
  searchParams: Promise<{
    returnTo?: string | string[];
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

function safeReturnTo(
  value: string | string[] | undefined
): string {
  const raw = Array.isArray(value)
    ? value[0]
    : value;

  if (
    !raw ||
    !raw.startsWith("/admin/") ||
    raw.startsWith("//")
  ) {
    return "/admin/data-health";
  }

  return raw;
}

export default async function AdminListingEditorPage({
  params,
  searchParams
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

  const returnTo = safeReturnTo(
    (await searchParams).returnTo
  );
  const name =
    data.record.entityType === "place"
      ? data.record.name
      : data.record.title;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            VENTURE ADMIN · LISTING EDITOR
          </p>
          <h1>{name}</h1>
          <p>
            Repair the fields that control discovery, trust, and outing eligibility. The primary save button returns you to the exact queue that opened this record.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href={returnTo}>
            Back to previous queue
          </Link>
          <Link href="/admin/quick-repair">
            Quick repair
          </Link>
          <Link href="/admin/analytics">
            Analytics
          </Link>
        </div>
      </header>

      <ListingEditorForm
        data={data}
        returnTo={returnTo}
      />
    </main>
  );
}
