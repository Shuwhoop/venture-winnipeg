import Link from "next/link";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  reopenRejectedSubmission
} from "./actions";

import styles from "./page.module.css";


export const dynamic =
  "force-dynamic";


type HistoryStatus =
  | "approved"
  | "rejected";


type SubmissionHistoryRow = {
  id: string;
  submission_type:
    | "restaurant"
    | "event";
  status:
    HistoryStatus;
  submitter_name: string;
  submitter_email: string;
  organization_name: string | null;
  submitter_relationship: string;
  payload: Record<
    string,
    unknown
  >;
  source_url: string | null;
  submitter_notes: string | null;
  review_notes: string | null;
  approved_entity_type:
    | "place"
    | "event"
    | null;
  approved_entity_id: string | null;
  created_at: string;
  reviewed_at: string | null;
};


type LinkedEntity = {
  id: string;
  slug: string;
  label: string;
  status: string;
};


type SearchParameters = {
  q?: string;
  status?: string;
  page?: string;
};


const PAGE_SIZE =
  20;


function textValue(
  payload: Record<
    string,
    unknown
  >,
  key: string
): string {
  const value =
    payload[key];

  if (
    typeof value === "number"
  ) {
    return String(value);
  }

  return (
    typeof value === "string"
      ? value.trim()
      : ""
  );
}


function submissionTitle(
  submission:
    SubmissionHistoryRow
): string {
  return submission
    .submission_type ===
    "restaurant"
      ? (
          textValue(
            submission.payload,
            "name"
          ) ||
          "Untitled restaurant"
        )
      : (
          textValue(
            submission.payload,
            "title"
          ) ||
          "Untitled event"
        );
}


function shortReference(
  id: string
): string {
  return id
    .replaceAll(
      "-",
      ""
    )
    .slice(
      0,
      8
    )
    .toUpperCase();
}


function formatDate(
  value: string | null
): string {
  if (!value) {
    return "Not recorded";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",

      timeZone:
        "America/Winnipeg"
    }
  ).format(date);
}


function compactEventDate(
  value: string
): string {
  if (!value) {
    return "Start time not supplied";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",

      timeZone:
        "America/Winnipeg"
    }
  ).format(date);
}


function normalizedSearchText(
  submission:
    SubmissionHistoryRow
): string {
  return [
    shortReference(
      submission.id
    ),
    submissionTitle(
      submission
    ),
    submission.submitter_name,
    submission.submitter_email,
    submission.organization_name ??
      "",
    submission.submitter_relationship,
    submission.submission_type,
    submission.status,
    textValue(
      submission.payload,
      "addressLine1"
    ),
    textValue(
      submission.payload,
      "venueName"
    ),
    textValue(
      submission.payload,
      "venueAddress"
    ),
    textValue(
      submission.payload,
      "category"
    ),
    submission.review_notes ??
      ""
  ]
    .join(" ")
    .toLowerCase();
}


function pageHref({
  q,
  status,
  page
}: {
  q: string;
  status: string;
  page: number;
}): string {
  const parameters =
    new URLSearchParams();

  if (q) {
    parameters.set(
      "q",
      q
    );
  }

  if (
    status &&
    status !== "all"
  ) {
    parameters.set(
      "status",
      status
    );
  }

  if (page > 1) {
    parameters.set(
      "page",
      String(page)
    );
  }

  const query =
    parameters.toString();

  return query
    ? `/admin/submissions/history?${query}`
    : "/admin/submissions/history";
}


export default async function SubmissionHistoryPage({
  searchParams
}: {
  searchParams:
    Promise<SearchParameters>;
}) {
  const parameters =
    await searchParams;

  const query =
    (
      parameters.q ??
      ""
    )
      .trim()
      .slice(
        0,
        120
      );

  const selectedStatus =
    parameters.status ===
      "approved" ||
    parameters.status ===
      "rejected"
      ? parameters.status
      : "all";

  const requestedPage =
    Number.parseInt(
      parameters.page ??
      "1",
      10
    );

  const currentPage =
    Number.isFinite(
      requestedPage
    ) &&
    requestedPage > 0
      ? requestedPage
      : 1;

  const supabase =
    getSupabaseAdminClient();

  const {
    data,
    error
  } =
    await supabase
      .from(
        "listing_submissions"
      )
      .select(
        `
          id,
          submission_type,
          status,
          submitter_name,
          submitter_email,
          organization_name,
          submitter_relationship,
          payload,
          source_url,
          submitter_notes,
          review_notes,
          approved_entity_type,
          approved_entity_id,
          created_at,
          reviewed_at
        `
      )
      .in(
        "status",
        [
          "approved",
          "rejected"
        ]
      )
      .order(
        "reviewed_at",
        {
          ascending:
            false
        }
      )
      .limit(
        500
      );

  if (error) {
    throw new Error(
      `Could not load submission history: ${error.message}`
    );
  }

  const allHistory =
    (
      data ??
      []
    ) as SubmissionHistoryRow[];

  const approvedCount =
    allHistory.filter(
      (submission) =>
        submission.status ===
        "approved"
    ).length;

  const rejectedCount =
    allHistory.filter(
      (submission) =>
        submission.status ===
        "rejected"
    ).length;

  const normalizedQuery =
    query.toLowerCase();

  const filteredHistory =
    allHistory.filter(
      (submission) => {
        const statusMatches =
          selectedStatus ===
            "all" ||
          submission.status ===
            selectedStatus;

        const searchMatches =
          !normalizedQuery ||
          normalizedSearchText(
            submission
          ).includes(
            normalizedQuery
          );

        return (
          statusMatches &&
          searchMatches
        );
      }
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredHistory.length /
        PAGE_SIZE
      )
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages
    );

  const pageStart =
    (
      safePage - 1
    ) *
    PAGE_SIZE;

  const visibleHistory =
    filteredHistory.slice(
      pageStart,
      pageStart +
        PAGE_SIZE
    );

  const placeIds =
    Array.from(
      new Set(
        visibleHistory
          .filter(
            (submission) =>
              submission
                .approved_entity_type ===
                "place" &&
              submission
                .approved_entity_id
          )
          .map(
            (submission) =>
              submission
                .approved_entity_id!
          )
      )
    );

  const eventIds =
    Array.from(
      new Set(
        visibleHistory
          .filter(
            (submission) =>
              submission
                .approved_entity_type ===
                "event" &&
              submission
                .approved_entity_id
          )
          .map(
            (submission) =>
              submission
                .approved_entity_id!
          )
      )
    );

  const linkedEntities =
    new Map<
      string,
      LinkedEntity
    >();

  if (
    placeIds.length > 0
  ) {
    const {
      data: places,
      error: placesError
    } =
      await supabase
        .from("places")
        .select(
          "id, slug, name, status"
        )
        .in(
          "id",
          placeIds
        );

    if (placesError) {
      throw new Error(
        `Could not load approved places: ${placesError.message}`
      );
    }

    for (
      const place of
        places ??
        []
    ) {
      linkedEntities.set(
        place.id,
        {
          id:
            place.id,

          slug:
            place.slug,

          label:
            place.name,

          status:
            place.status
        }
      );
    }
  }

  if (
    eventIds.length > 0
  ) {
    const {
      data: events,
      error: eventsError
    } =
      await supabase
        .from("events")
        .select(
          "id, slug, title, status"
        )
        .in(
          "id",
          eventIds
        );

    if (eventsError) {
      throw new Error(
        `Could not load approved events: ${eventsError.message}`
      );
    }

    for (
      const event of
        events ??
        []
    ) {
      linkedEntities.set(
        event.id,
        {
          id:
            event.id,

          slug:
            event.slug,

          label:
            event.title,

          status:
            event.status
        }
      );
    }
  }

  return (
    <main
      className={
        styles.page
      }
    >
      <header
        className={
          styles.hero
        }
      >
        <div
          className={
            styles.heroCopy
          }
        >
          <span>
            MODERATION ARCHIVE
          </span>

          <h1>
            Approved and rejected
          </h1>

          <p>
            Search reviewed submissions,
            revisit decisions, and open
            the listings created from
            approved records.
          </p>
        </div>

        <div
          className={
            styles.heroStats
          }
        >
          <div>
            <strong>
              {approvedCount}
            </strong>

            <span>
              approved
            </span>
          </div>

          <div>
            <strong>
              {rejectedCount}
            </strong>

            <span>
              rejected
            </span>
          </div>
        </div>
      </header>

      <section
        className={
          styles.controls
        }
      >
        <form
          className={
            styles.searchForm
          }
          method="get"
        >
          <label
            className={
              styles.searchField
            }
          >
            <span>
              Search history
            </span>

            <input
              defaultValue={
                query
              }
              name="q"
              placeholder="Name, email, venue, or reference"
              type="search"
            />
          </label>

          <label
            className={
              styles.statusField
            }
          >
            <span>
              Decision
            </span>

            <select
              defaultValue={
                selectedStatus
              }
              name="status"
            >
              <option value="all">
                All decisions
              </option>

              <option value="approved">
                Approved
              </option>

              <option value="rejected">
                Rejected
              </option>
            </select>
          </label>

          <button
            type="submit"
          >
            Search
          </button>

          <Link
            className={
              styles.clear
            }
            href="/admin/submissions/history"
          >
            Clear
          </Link>
        </form>

        <p
          className={
            styles.resultCount
          }
        >
          Showing{" "}
          <strong>
            {visibleHistory.length}
          </strong>
          {" "}of{" "}
          <strong>
            {filteredHistory.length}
          </strong>
          {" "}matching records.
        </p>
      </section>

      {visibleHistory.length ===
      0 ? (
        <section
          className={
            styles.empty
          }
        >
          <span
            aria-hidden="true"
          >
            ◌
          </span>

          <h2>
            No history found
          </h2>

          <p>
            Try a different search or
            decision filter.
          </p>
        </section>
      ) : (
        <section
          className={
            styles.list
          }
        >
          {
            visibleHistory.map(
              (submission) => {
                const linkedEntity =
                  submission
                    .approved_entity_id
                    ? linkedEntities.get(
                        submission
                          .approved_entity_id
                      )
                    : undefined;

                const isRestaurant =
                  submission
                    .submission_type ===
                  "restaurant";

                const detailOne =
                  isRestaurant
                    ? textValue(
                        submission.payload,
                        "addressLine1"
                      )
                    : textValue(
                        submission.payload,
                        "venueName"
                      );

                const detailTwo =
                  isRestaurant
                    ? textValue(
                        submission.payload,
                        "category"
                      )
                    : compactEventDate(
                        textValue(
                          submission.payload,
                          "startAt"
                        )
                      );

                return (
                  <article
                    className={
                      styles.card
                    }
                    key={
                      submission.id
                    }
                  >
                    <header
                      className={
                        styles.cardHeader
                      }
                    >
                      <div
                        className={
                          styles.titleBlock
                        }
                      >
                        <div
                          className={
                            styles.badgeRow
                          }
                        >
                          <span
                            className={
                              submission.status ===
                              "approved"
                                ? styles.approvedBadge
                                : styles.rejectedBadge
                            }
                          >
                            {
                              submission.status
                            }
                          </span>

                          <span
                            className={
                              styles.typeBadge
                            }
                          >
                            {
                              submission
                                .submission_type
                            }
                          </span>
                        </div>

                        <h2>
                          {
                            submissionTitle(
                              submission
                            )
                          }
                        </h2>

                        <p>
                          Reference{" "}
                          <strong>
                            {
                              shortReference(
                                submission.id
                              )
                            }
                          </strong>
                        </p>
                      </div>

                      <dl
                        className={
                          styles.decisionMeta
                        }
                      >
                        <div>
                          <dt>
                            Submitted
                          </dt>

                          <dd>
                            {
                              formatDate(
                                submission.created_at
                              )
                            }
                          </dd>
                        </div>

                        <div>
                          <dt>
                            Reviewed
                          </dt>

                          <dd>
                            {
                              formatDate(
                                submission.reviewed_at
                              )
                            }
                          </dd>
                        </div>
                      </dl>
                    </header>

                    <div
                      className={
                        styles.cardBody
                      }
                    >
                      <dl
                        className={
                          styles.details
                        }
                      >
                        <div>
                          <dt>
                            Listing detail
                          </dt>

                          <dd>
                            {
                              detailOne ||
                              "Not supplied"
                            }
                          </dd>
                        </div>

                        <div>
                          <dt>
                            Category or time
                          </dt>

                          <dd>
                            {
                              detailTwo ||
                              "Not supplied"
                            }
                          </dd>
                        </div>

                        <div>
                          <dt>
                            Submitted by
                          </dt>

                          <dd>
                            {
                              submission
                                .submitter_name
                            }
                          </dd>
                        </div>

                        <div>
                          <dt>
                            Contact
                          </dt>

                          <dd>
                            <a
                              href={`mailto:${submission.submitter_email}`}
                            >
                              {
                                submission
                                  .submitter_email
                              }
                            </a>
                          </dd>
                        </div>
                      </dl>

                      <div
                        className={
                          styles.notesGrid
                        }
                      >
                        <section>
                          <h3>
                            Reviewer notes
                          </h3>

                          <p>
                            {
                              submission
                                .review_notes ||
                              "No reviewer notes were recorded."
                            }
                          </p>
                        </section>

                        <section>
                          <h3>
                            Submitter notes
                          </h3>

                          <p>
                            {
                              submission
                                .submitter_notes ||
                              "No submitter notes were supplied."
                            }
                          </p>
                        </section>
                      </div>

                      <div
                        className={
                          styles.actions
                        }
                      >
                        {
                          linkedEntity
                            ? (
                              <Link
                                className={
                                  styles.openListing
                                }
                                href={`/listings/${linkedEntity.slug}`}
                              >
                                Open{" "}
                                {
                                  linkedEntity.status ===
                                  "published"
                                    ? "published listing"
                                    : `${linkedEntity.status} listing`
                                }
                              </Link>
                            )
                            : submission.status ===
                              "approved"
                              ? (
                                <span
                                  className={
                                    styles.missingLink
                                  }
                                >
                                  Linked listing unavailable
                                </span>
                              )
                              : null
                        }

                        {
                          submission.source_url
                            ? (
                              <a
                                className={
                                  styles.sourceLink
                                }
                                href={
                                  submission.source_url
                                }
                                rel="noreferrer"
                                target="_blank"
                              >
                                Open source
                              </a>
                            )
                            : null
                        }

                        {
                          submission.status ===
                          "rejected"
                            ? (
                              <form
                                action={
                                  reopenRejectedSubmission
                                }
                              >
                                <input
                                  name="submissionId"
                                  type="hidden"
                                  value={
                                    submission.id
                                  }
                                />

                                <button
                                  type="submit"
                                >
                                  Reopen for review
                                </button>
                              </form>
                            )
                            : null
                        }
                      </div>
                    </div>
                  </article>
                );
              }
            )
          }
        </section>
      )}

      <nav
        aria-label="History pagination"
        className={
          styles.pagination
        }
      >
        {
          safePage > 1
            ? (
              <Link
                href={
                  pageHref({
                    q:
                      query,

                    status:
                      selectedStatus,

                    page:
                      safePage - 1
                  })
                }
              >
                Previous
              </Link>
            )
            : (
              <span
                aria-disabled="true"
              >
                Previous
              </span>
            )
        }

        <strong>
          Page {safePage} of{" "}
          {totalPages}
        </strong>

        {
          safePage <
          totalPages
            ? (
              <Link
                href={
                  pageHref({
                    q:
                      query,

                    status:
                      selectedStatus,

                    page:
                      safePage + 1
                  })
                }
              >
                Next
              </Link>
            )
            : (
              <span
                aria-disabled="true"
              >
                Next
              </span>
            )
        }
      </nav>

      <aside
        className={
          styles.approvedNote
        }
      >
        <strong>
          Approved records
        </strong>

        <p>
          Rejected submissions can be
          reopened here. Approved
          submissions remain linked to
          their created listing so a
          published record is never
          silently duplicated.
        </p>
      </aside>
    </main>
  );
}
