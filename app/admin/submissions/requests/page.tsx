import Link from "next/link";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  updateExploreRequestStatus
} from "./actions";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type RequestStatus =
  | "new"
  | "reviewing"
  | "fulfilled"
  | "dismissed";

type ExploreRequest = {
  id: string;
  status: RequestStatus;
  search_query: string;
  requested_type: string;
  neighbourhood: string | null;
  details: string | null;
  contact_email: string | null;
  source_page: string;
  created_at: string;
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

const typeIcons: Record<string, string> = {
  restaurant: "🍽️",
  event: "🎟️",
  bar: "🍸",
  place: "📍",
  other: "✨"
};

function validStatus(
  value: string | undefined
): RequestStatus | "all" {
  if (
    value === "new" ||
    value === "reviewing" ||
    value === "fulfilled" ||
    value === "dismissed"
  ) {
    return value;
  }

  return "all";
}

function formatDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Winnipeg"
    }
  ).format(new Date(value));
}

export default async function ExploreRequestsPage({
  searchParams
}: PageProps) {
  await requireVentureAdmin();

  const {
    q = "",
    status: rawStatus
  } = await searchParams;

  const status = validStatus(rawStatus);
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("explore_listing_requests")
    .select(
      "id,status,search_query,requested_type,neighbourhood,details,contact_email,source_page,created_at"
    )
    .order("created_at", {
      ascending: false
    })
    .limit(150);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const {
    data,
    error
  } = await query;

  if (error) {
    throw new Error(
      `Venture could not load Explore requests: ${error.message}`
    );
  }

  const normalizedSearch =
    q.trim().toLowerCase();

  const requests =
    ((data || []) as ExploreRequest[]).filter(
      (request) =>
        !normalizedSearch ||
        [
          request.search_query,
          request.requested_type,
          request.neighbourhood || "",
          request.details || "",
          request.contact_email || ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
    );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span>EXPLORE DEMAND SIGNALS</span>
          <h1>Missing listing requests</h1>
          <p>
            See what people searched for but could
            not find, then turn the strongest demand
            into verified Venture inventory.
          </p>
        </div>

        <div className={styles.count}>
          <strong>{requests.length}</strong>
          <small>VISIBLE</small>
        </div>
      </section>

      <form className={styles.filters}>
        <label>
          <span>Search requests</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Restaurant, event, area, email..."
          />
        </label>

        <label>
          <span>Status</span>
          <select
            name="status"
            defaultValue={status}
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="reviewing">Reviewing</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </label>

        <div className={styles.filterActions}>
          <button type="submit">Apply filters</button>
          <Link href="/admin/submissions/requests">
            Clear
          </Link>
        </div>
      </form>

      <section className={styles.list}>
        {requests.length === 0 ? (
          <div className={styles.empty}>
            <h2>No matching requests</h2>
            <p>
              New requests from Explore will appear here.
            </p>
          </div>
        ) : (
          requests.map((request) => (
            <details
              className={styles.requestCard}
              key={request.id}
            >
              <summary>
                <span
                  className={styles.typeIcon}
                  aria-hidden="true"
                >
                  {typeIcons[request.requested_type] || "✨"}
                </span>

                <span className={styles.summaryCopy}>
                  <strong>{request.search_query}</strong>
                  <small>
                    {request.requested_type} · {formatDate(request.created_at)}
                  </small>
                </span>

                <span className={styles.status}>
                  {request.status}
                </span>
              </summary>

              <div className={styles.body}>
                <div className={styles.meta}>
                  <div>
                    <span>Neighbourhood</span>
                    <strong>
                      {request.neighbourhood || "Not provided"}
                    </strong>
                  </div>

                  <div>
                    <span>Contact</span>
                    {request.contact_email ? (
                      <a href={`mailto:${request.contact_email}`}>
                        {request.contact_email}
                      </a>
                    ) : (
                      <strong>Not provided</strong>
                    )}
                  </div>

                  <div>
                    <span>Source page</span>
                    <strong>{request.source_page}</strong>
                  </div>

                  <div>
                    <span>Reference</span>
                    <strong>
                      {request.id.replaceAll("-", "").slice(0, 8).toUpperCase()}
                    </strong>
                  </div>
                </div>

                <p className={styles.details}>
                  {request.details ||
                    "No extra details were provided."}
                </p>

                <form
                  action={updateExploreRequestStatus}
                  className={styles.statusForm}
                >
                  <input
                    type="hidden"
                    name="id"
                    value={request.id}
                  />
                  <select
                    name="status"
                    defaultValue={request.status}
                  >
                    <option value="new">New</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                  <button type="submit">Update status</button>
                </form>
              </div>
            </details>
          ))
        )}
      </section>
    </main>
  );
}
