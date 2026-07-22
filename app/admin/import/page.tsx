import type { Metadata } from "next";
import Link from "next/link";

import { getImportedInventory } from "@/lib/admin/imported-inventory";
import { requireVentureAdmin } from "@/lib/auth/admin";

import InventoryImportWorkbench from "./import-workbench";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inventory Import | Venture Admin",
  description:
    "Private Venture CSV preview, targeted Winnipeg inventory, and draft import workspace."
};

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams: Promise<SearchParams>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown date";

  const parsed = new Date(value);

  if (!Number.isFinite(parsed.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeZone: "America/Winnipeg"
  }).format(parsed);
}

export default async function InventoryImportPage({
  searchParams
}: PageProps) {
  const admin = await requireVentureAdmin();
  const params = await searchParams;

  const inventory = await getImportedInventory({
    search: firstValue(params.search),
    entityType:
      firstValue(params.entityType) === "event"
        ? "event"
        : firstValue(params.entityType) === "place"
          ? "place"
          : "all",
    targetArea: firstValue(params.targetArea),
    status:
      firstValue(params.status) === "published"
        ? "published"
        : firstValue(params.status) === "draft"
          ? "draft"
          : "all",
    placeType: firstValue(params.placeType),
    importSource: firstValue(params.importSource),
    limit: 300
  });

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>VENTURE ADMIN</p>
          <h1>Targeted Inventory Import</h1>
          <p>
            Build stronger coverage around the Winnipeg areas Venture needs
            most. Every imported restaurant, bar, venue, and event stays a
            private draft until you verify and publish it.
          </p>
        </div>

        <nav aria-label="Inventory administration">
          <Link href="/admin/data-health">Data health</Link>
          <Link href="/admin/import/history">Import history</Link>
          <Link href="/admin/quick-repair">Quick repair</Link>
          <Link href="/admin/submissions">Submissions</Link>
        </nav>
      </header>

      <div className={styles.sessionNote}>
        Signed in as <strong>{admin.email}</strong>
      </div>

      <section className={styles.coveragePlan}>
        <div>
          <p className={styles.eyebrow}>PRIORITY COVERAGE</p>
          <h2>Import around the places people actually build nights around</h2>
          <p>
            Start with Downtown, Exchange District, The Forks, Osborne Village,
            Corydon, Wellington Crescent, St. Boniface, both university areas,
            and Bridgwater.
          </p>
        </div>

        <div className={styles.coverageChips}>
          {[
            "Downtown",
            "Exchange District",
            "The Forks",
            "Osborne Village",
            "Corydon",
            "Wellington Crescent",
            "St. Boniface",
            "University areas",
            "Bridgwater"
          ].map((area) => (
            <span key={area}>{area}</span>
          ))}
        </div>
      </section>

      <InventoryImportWorkbench />

      <section className={styles.inventoryBrowser} id="imported-inventory">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>IMPORTED INVENTORY</p>
            <h2>Search every imported draft</h2>
            <p>
              Find a listing by business name, address, neighbourhood, category,
              source, or target area, then jump directly into the full editor.
            </p>
          </div>
          <strong>{inventory.total} matching listings</strong>
        </div>

        <form className={styles.inventoryFilters} method="get">
          <label className={styles.searchField}>
            Search
            <input
              type="search"
              name="search"
              defaultValue={inventory.appliedFilters.search}
              placeholder="Name, address, neighbourhood, category..."
            />
          </label>

          <label>
            Listing type
            <select
              name="entityType"
              defaultValue={inventory.appliedFilters.entityType}
            >
              <option value="all">Places and events</option>
              <option value="place">Places</option>
              <option value="event">Events</option>
            </select>
          </label>

          <label>
            Target area
            <select
              name="targetArea"
              defaultValue={inventory.appliedFilters.targetArea}
            >
              <option value="">All areas</option>
              {inventory.targetAreas.map((area) => (
                <option value={area} key={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select name="status" defaultValue={inventory.appliedFilters.status}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>

          <label>
            Place type
            <select
              name="placeType"
              defaultValue={inventory.appliedFilters.placeType}
            >
              <option value="">All place types</option>
              {inventory.placeTypes.map((placeType) => (
                <option value={placeType} key={placeType}>
                  {humanize(placeType)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Import source
            <select
              name="importSource"
              defaultValue={inventory.appliedFilters.importSource}
            >
              <option value="">All import sources</option>
              {inventory.importSources.map((source) => (
                <option value={source} key={source}>
                  {humanize(source)}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.filterActions}>
            <button type="submit">Search imports</button>
            <Link href="/admin/import#imported-inventory">Clear</Link>
          </div>
        </form>

        {inventory.records.length > 0 ? (
          <div className={styles.importedList}>
            {inventory.records.map((record) => (
              <article className={styles.importedCard} key={record.key}>
                <header>
                  <div>
                    <span>
                      {record.entityType === "place" ? "PLACE" : "EVENT"} ·{" "}
                      {humanize(record.importSource)}
                    </span>
                    <h3>{record.name}</h3>
                    <p>{record.address}</p>
                  </div>

                  <div className={styles.statusStack}>
                    <b className={styles[record.status] ?? ""}>
                      {humanize(record.status)}
                    </b>
                    <small>{humanize(record.verificationStatus)}</small>
                  </div>
                </header>

                <dl>
                  <div>
                    <dt>Neighbourhood</dt>
                    <dd>{record.neighbourhood || "Needs assignment"}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{record.category}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>
                      {record.placeType ? humanize(record.placeType) : "Event"}
                    </dd>
                  </div>
                  <div>
                    <dt>Imported</dt>
                    <dd>{formatDate(record.importedAt)}</dd>
                  </div>
                </dl>

                <footer>
                  <div className={styles.recordMeta}>
                    {record.targetArea ? <span>{record.targetArea}</span> : null}
                    {record.batchId ? (
                      <span>Batch {record.batchId.slice(0, 8)}</span>
                    ) : null}
                  </div>

                  <div className={styles.recordActions}>
                    <Link href={record.editPath}>Edit full listing</Link>
                    {record.status === "published" ? (
                      <Link href={record.publicPath}>View public</Link>
                    ) : (
                      <Link
                        href={`/admin/quick-repair?search=${encodeURIComponent(record.name)}&status=draft&type=${record.entityType}`}
                      >
                        Quick repair
                      </Link>
                    )}
                  </div>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyInventory}>
            <h3>No imported listings match those filters.</h3>
            <p>
              Clear the filters or import a priority-area CSV above. The city is
              hiding, not gone.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
