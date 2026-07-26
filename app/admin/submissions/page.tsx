import Link from "next/link";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  publishRestaurant,
  rejectRestaurant,
  saveRestaurantDraft
} from "../restaurants/actions";

import {
  completeLinkedSubmission,
  openSubmissionInEditor,
  publishEventSubmission,
  publishRestaurantSubmission,
  rejectSubmission,
  requestSubmissionChanges,
  saveSubmissionReview
} from "./actions";

import ModerationQueueTools from "./moderation-queue-tools";

import styles from "./page.module.css";


export const dynamic =
  "force-dynamic";


type SubmissionRow = {
  id: string;
  submission_type:
    | "restaurant"
    | "event";
  status:
    | "pending"
    | "in_review"
    | "needs_changes";
  submitter_name: string;
  submitter_email: string;
  submitter_relationship: string;
  payload: Record<
    string,
    unknown
  >;
  source_url: string | null;
  submitter_notes: string | null;
  review_notes: string | null;
  linked_entity_type: "place" | "event" | null;
  linked_entity_id: string | null;
  approved_entity_type: "place" | "event" | null;
  approved_entity_id: string | null;
  created_at: string;
};


type ImportedRestaurant = {
  id: string;
  name: string;
  address_line1: string;
  neighbourhood: string | null;
  primary_category: string;
  place_type: string;
  official_website: string | null;
  official_phone: string | null;
  short_description: string;
};


type ImportedEvent = {
  id: string;
  title: string;
  primary_category: string;
  start_at: string;
  status: string;
  verification_status: string;
  organizer_name: string;
  venue_id: string | null;
};


type VenueOption = {
  id: string;
  name: string;
  address_line1: string;
};


const placeTypeOptions = [
  ["restaurant", "Restaurant"],
  ["cafe", "Cafe"],
  [
    "bakery_dessert",
    "Bakery or dessert"
  ],
  ["bar_pub", "Bar or pub"],
  ["brewery", "Brewery"],
  [
    "food_truck",
    "Food truck"
  ],
  [
    "fast_casual",
    "Fast casual"
  ],
  [
    "fine_dining",
    "Fine dining"
  ],
  [
    "late_night_food",
    "Late-night food"
  ],
  ["market", "Market"]
] as const;


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
      ? value
      : ""
  );
}


function localDateTimeValue(
  payload: Record<
    string,
    unknown
  >,
  key: string
): string {
  const value =
    textValue(
      payload,
      key
    );

  if (!value) {
    return "";
  }

  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(
      value
    )
  ) {
    return value;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Winnipeg",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hourCycle:
          "h23"
      }
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value
        ]
      )
    );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}


function reference(
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


function formattedDate(
  value: string
): string {
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
  ).format(
    new Date(value)
  );
}


export default async function ModerationPage() {
const supabase =
    getSupabaseAdminClient();

  const [
    submissionsResult,
    importsResult,
    importedEventsResult,
    venuesResult
  ] =
    await Promise.all([
      supabase
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
            submitter_relationship,
            payload,
            source_url,
            submitter_notes,
            review_notes,
            linked_entity_type,
            linked_entity_id,
            approved_entity_type,
            approved_entity_id,
            created_at
          `
        )
        .in(
          "status",
          [
            "pending",
            "in_review",
            "needs_changes"
          ]
        )
        .order(
          "created_at",
          {
            ascending:
              true
          }
        )
        .limit(100),

      supabase
        .from("places")
        .select(
          `
            id,
            name,
            address_line1,
            neighbourhood,
            primary_category,
            place_type,
            official_website,
            official_phone,
            short_description
          `
        )
        .eq(
          "import_source",
          "overture_maps"
        )
        .eq(
          "review_status",
          "needs_review"
        )
        .order(
          "name",
          {
            ascending:
              true
          }
        )
        .limit(500),

      supabase
        .from("events")
        .select(
          `
            id,
            title,
            primary_category,
            start_at,
            status,
            verification_status,
            organizer_name,
            venue_id
          `
        )
        .eq(
          "status",
          "draft"
        )
        .order(
          "start_at",
          {
            ascending:
              true
          }
        )
        .limit(500),

      supabase
        .from("places")
        .select(
          `
            id,
            name,
            address_line1
          `
        )
        .in(
          "status",
          [
            "draft",
            "published"
          ]
        )
        .order(
          "name",
          {
            ascending:
              true
          }
        )
        .limit(500)
    ]);

  if (
    submissionsResult.error
  ) {
    throw new Error(
      `Could not load public submissions: ${submissionsResult.error.message}`
    );
  }

  if (
    importsResult.error
  ) {
    throw new Error(
      `Could not load imported restaurants: ${importsResult.error.message}`
    );
  }

  if (
    importedEventsResult.error
  ) {
    throw new Error(
      `Could not load imported events: ${importedEventsResult.error.message}`
    );
  }

  if (
    venuesResult.error
  ) {
    throw new Error(
      `Could not load venues: ${venuesResult.error.message}`
    );
  }

  const submissions =
    (
      submissionsResult.data ??
      []
    ) as SubmissionRow[];

  const imports =
    (
      importsResult.data ??
      []
    ) as ImportedRestaurant[];

  const importedEvents =
    (
      importedEventsResult.data ??
      []
    ) as ImportedEvent[];

  const venues =
    (
      venuesResult.data ??
      []
    ) as VenueOption[];

  const linkedEventIds =
    new Set(
      submissions
        .map(
          (submission) =>
            submission.linked_entity_type === "event"
              ? submission.linked_entity_id
              : submission.approved_entity_type === "event"
                ? submission.approved_entity_id
                : null
        )
        .filter(
          (id): id is string =>
            Boolean(id)
        )
    );

  const standaloneImportedEvents =
    importedEvents.filter(
      (event) =>
        !linkedEventIds.has(
          event.id
        )
    );

  const venueById =
    new Map(
      venues.map(
        (venue) => [
          venue.id,
          venue
        ]
      )
    );

  const restaurantSubmissions =
    submissions.filter(
      (submission) =>
        submission.submission_type ===
        "restaurant"
    );

  const eventSubmissions =
    submissions.filter(
      (submission) =>
        submission.submission_type ===
        "event"
    );

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
        <div>
          <span>
            SECURE ADMIN TOOL
          </span>

          <h1>
            Venture moderation hub
          </h1>

          <p>
            Review, correct, and publish
            community submissions beside
            the Overture restaurant queue.
          </p>
        </div>

        <div
          className={
            styles.counter
          }
        >
          <strong>
            {
              submissions.length +
              imports.length +
              standaloneImportedEvents.length
            }
          </strong>

          <small>
            waiting
          </small>
        </div>
      </header>

      <ModerationQueueTools
        totalCount={
          submissions.length +
          imports.length +
          standaloneImportedEvents.length
        }
      />

      <nav
        className={
          styles.nav
        }
      >
        <a href="#restaurant-submissions">
          Restaurants
          <strong>
            {
              restaurantSubmissions.length
            }
          </strong>
        </a>

        <a href="#event-submissions">
          Events
          <strong>
            {
              eventSubmissions.length
            }
          </strong>
        </a>

        <a href="#imported-restaurants">
          Place imports
          <strong>
            {
              imports.length
            }
          </strong>
        </a>

        <a href="#imported-events">
          Event drafts
          <strong>
            {
              standaloneImportedEvents.length
            }
          </strong>
        </a>
      </nav>

      <section
        className={
          styles.notice
        }
      >
        <strong>
          Review before publishing
        </strong>

        <p>
          Publishing records the source,
          creates an audit entry, and
          keeps uncertain details marked
          as unverified rather than
          dressing guesses in a tiny
          factual moustache.
        </p>
      </section>

      <section
        className={
          styles.section
        }
        id="restaurant-submissions"
      >
        <header
          className={
            styles.sectionHeading
          }
        >
          <span>
            PUBLIC SUBMISSIONS
          </span>

          <h2>
            Restaurants
          </h2>

          <p>
            Confirm the map coordinates
            before publishing.
          </p>
        </header>

        {restaurantSubmissions.length ===
        0 ? (
          <p
            className={
              styles.empty
            }
          >
            No restaurant submissions
            are waiting.
          </p>
        ) : (
          <div
            className={
              styles.list
            }
          >
            {
              restaurantSubmissions.map(
                (submission) => (
                  <SubmissionCard
                    key={
                      submission.id
                    }
                    submission={
                      submission
                    }
                    venues={
                      venues
                    }
                    returnTo="/admin/submissions#restaurant-submissions"
                  />
                )
              )
            }
          </div>
        )}
      </section>

      <section
        className={
          styles.section
        }
        id="event-submissions"
      >
        <header
          className={
            styles.sectionHeading
          }
        >
          <span>
            PUBLIC SUBMISSIONS
          </span>

          <h2>
            Events
          </h2>

          <p>
            Link an existing place or
            provide coordinates for a
            new venue.
          </p>
        </header>

        {eventSubmissions.length ===
        0 ? (
          <p
            className={
              styles.empty
            }
          >
            No event submissions are
            waiting.
          </p>
        ) : (
          <div
            className={
              styles.list
            }
          >
            {
              eventSubmissions.map(
                (submission) => (
                  <SubmissionCard
                    key={
                      submission.id
                    }
                    submission={
                      submission
                    }
                    venues={
                      venues
                    }
                    returnTo="/admin/submissions#event-submissions"
                  />
                )
              )
            }
          </div>
        )}
      </section>

      <section
        className={
          styles.section
        }
        id="imported-restaurants"
      >
        <header
          className={
            styles.sectionHeading
          }
        >
          <span>
            AUTOMATED IMPORTS
          </span>

          <h2>
            Overture restaurants
          </h2>
        </header>

        {imports.length ===
        0 ? (
          <p
            className={
              styles.empty
            }
          >
            No imported restaurants are
            waiting.
          </p>
        ) : (
          <div
            className={
              styles.list
            }
          >
            {
              imports.map(
                (restaurant) => (
                  <details
                    className={
                      styles.card
                    }
                    data-kind="restaurant"
                    data-moderation-card="true"
                    data-search={`${restaurant.name} ${restaurant.address_line1} ${restaurant.neighbourhood ?? ""} ${restaurant.primary_category} ${restaurant.place_type}`.toLowerCase()}
                    data-source="import"
                    data-status="draft"
                    key={
                      restaurant.id
                    }
                  >
                    <summary
                      className={
                        styles.cardSummary
                      }
                    >
                      <div>
                        <span>
                          OVERTURE IMPORT
                        </span>

                        <h3>
                          {
                            restaurant.name
                          }
                        </h3>

                        <p>
                          {
                            restaurant.address_line1
                          }
                        </p>
                      </div>
                      <span className={styles.expandHint}>
                        Expand
                      </span>
                    </summary>

                    <form
                      className={
                        styles.form
                      }
                    >
                      <input
                        name="id"
                        type="hidden"
                        value={
                          restaurant.id
                        }
                      />

                      <div className={styles.quickActionBar}>
                        <Link
                          className={styles.edit}
                          href={`/admin/listings/place/${restaurant.id}?returnTo=${encodeURIComponent("/admin/submissions#imported-restaurants")}`}
                        >
                          Edit full listing
                        </Link>

                        <span>
                          Best for hours, sources, menus, parking, transit, and publishing checks.
                        </span>
                      </div>

                      <details className={styles.inlineEditor}>
                        <summary>
                          Show quick-edit fields
                        </summary>

                      <div
                        className={
                          styles.grid
                        }
                      >
                        <Field
                          label="Business name"
                          name="name"
                          value={
                            restaurant.name
                          }
                          required
                        />

                        <Field
                          label="Address"
                          name="address_line1"
                          value={
                            restaurant.address_line1
                          }
                          required
                        />

                        <Field
                          label="Neighbourhood"
                          name="neighbourhood"
                          value={
                            restaurant.neighbourhood ??
                            ""
                          }
                        />

                        <Field
                          label="Category"
                          name="primary_category"
                          value={
                            restaurant.primary_category
                          }
                          required
                        />

                        <label>
                          <span>
                            Venture type
                          </span>

                          <select
                            defaultValue={
                              restaurant.place_type
                            }
                            name="place_type"
                          >
                            {
                              placeTypeOptions.map(
                                ([
                                  value,
                                  label
                                ]) => (
                                  <option
                                    key={
                                      value
                                    }
                                    value={
                                      value
                                    }
                                  >
                                    {
                                      label
                                    }
                                  </option>
                                )
                              )
                            }
                          </select>
                        </label>

                        <Field
                          label="Phone"
                          name="official_phone"
                          value={
                            restaurant.official_phone ??
                            ""
                          }
                        />

                        <Field
                          label="Website"
                          name="official_website"
                          type="url"
                          value={
                            restaurant.official_website ??
                            ""
                          }
                          wide
                        />

                        <label
                          className={
                            styles.wide
                          }
                        >
                          <span>
                            Description
                          </span>

                          <textarea
                            defaultValue={
                              restaurant.short_description
                            }
                            name="short_description"
                            required
                            rows={
                              4
                            }
                          />
                        </label>
                      </div>
                      </details>

                      <div
                        className={
                          styles.actions
                        }
                      >
                        <button
                          className={
                            styles.save
                          }
                          formAction={
                            saveRestaurantDraft
                          }
                        >
                          Save draft
                        </button>

                        <button
                          className={
                            styles.approve
                          }
                          formAction={
                            publishRestaurant
                          }
                        >
                          Publish basic listing
                        </button>

                        <button
                          className={
                            styles.reject
                          }
                          formAction={
                            rejectRestaurant
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </form>
                  </details>
                )
              )
            }
          </div>
        )}
      </section>

      <section
        className={
          styles.section
        }
        id="imported-events"
      >
        <header
          className={
            styles.sectionHeading
          }
        >
          <span>
            INVENTORY DRAFTS
          </span>

          <h2>
            Events
          </h2>

          <p>
            Search and expand an event,
            then open the full editor for
            schedules, tickets, sources,
            parking, and transit details.
          </p>
        </header>

        {standaloneImportedEvents.length ===
        0 ? (
          <p
            className={
              styles.empty
            }
          >
            No event drafts are waiting.
          </p>
        ) : (
          <div
            className={
              styles.list
            }
          >
            {
              standaloneImportedEvents.map(
                (event) => {
                  const venue =
                    event.venue_id
                      ? venueById.get(
                          event.venue_id
                        )
                      : null;

                  return (
                    <details
                      className={
                        styles.card
                      }
                      data-kind="event"
                      data-moderation-card="true"
                      data-search={`${event.title} ${event.primary_category} ${event.organizer_name} ${venue?.name ?? ""} ${venue?.address_line1 ?? ""}`.toLowerCase()}
                      data-source="import"
                      data-status="draft"
                      key={
                        event.id
                      }
                    >
                      <summary
                        className={
                          styles.cardSummary
                        }
                      >
                        <div>
                          <span>
                            EVENT DRAFT
                          </span>

                          <h3>
                            {event.title}
                          </h3>

                          <p>
                            {event.primary_category}
                            {venue
                              ? ` · ${venue.name}`
                              : ""}
                          </p>
                        </div>

                        <div className={styles.summaryMeta}>
                          <strong>
                            {formattedDate(
                              event.start_at
                            )}
                          </strong>

                          <small>
                            {event.organizer_name}
                          </small>
                        </div>

                        <span className={styles.expandHint}>
                          Expand
                        </span>
                      </summary>

                      <div className={styles.compactBody}>
                        <div className={styles.quickFacts}>
                          <div>
                            <span>Category</span>
                            <strong>{event.primary_category}</strong>
                          </div>

                          <div>
                            <span>Venue</span>
                            <strong>{venue?.name ?? "No venue linked"}</strong>
                          </div>

                          <div>
                            <span>Status</span>
                            <strong>{event.status}</strong>
                          </div>

                          <div>
                            <span>Verification</span>
                            <strong>{event.verification_status}</strong>
                          </div>
                        </div>

                        <div className={styles.actions}>
                          <Link
                            className={styles.edit}
                            href={`/admin/listings/event/${event.id}?returnTo=${encodeURIComponent("/admin/submissions#imported-events")}`}
                          >
                            Edit full listing
                          </Link>
                        </div>
                      </div>
                    </details>
                  );
                }
              )
            }
          </div>
        )}
      </section>
    </main>
  );
}


function SubmissionCard({
  submission,
  venues,
  returnTo
}: {
  submission:
    SubmissionRow;
  venues:
    VenueOption[];
  returnTo:
    string;
}) {
  const payload =
    submission.payload;

  const isRestaurant =
    submission.submission_type ===
    "restaurant";

  const title =
    isRestaurant
      ? textValue(
          payload,
          "name"
        )
      : textValue(
          payload,
          "title"
        );

  const linkedEntityType =
    submission.linked_entity_type ??
    submission.approved_entity_type;
  const linkedEntityId =
    submission.linked_entity_id ??
    submission.approved_entity_id;
  const hasLinkedListing =
    Boolean(
      linkedEntityType &&
      linkedEntityId
    );

  return (
    <details
      className={
        styles.card
      }
      data-kind={
        submission.submission_type === "event"
          ? "event"
          : "restaurant"
      }
      data-moderation-card="true"
      data-search={`${title} ${textValue(payload, "addressLine1")} ${textValue(payload, "venueName")} ${textValue(payload, "venueAddress")} ${textValue(payload, "organizerName")} ${textValue(payload, "neighbourhood")} ${textValue(payload, "category")} ${submission.submitter_name} ${submission.submitter_email}`.toLowerCase()}
      data-source="public"
      data-status={
        submission.status
      }
    >
      <summary
        className={
          styles.cardSummary
        }
      >
        <div>
          <span>
            {
              submission.status
                .replaceAll(
                  "_",
                  " "
                )
            }
          </span>

          <h3>
            {
              title ||
              "Untitled submission"
            }
          </h3>

          <p>
            Reference{" "}
            {
              reference(
                submission.id
              )
            }
            {" · "}
            {
              formattedDate(
                submission.created_at
              )
            }
          </p>
        </div>

        <div
          className={
            styles.submitter
          }
        >
          <strong>
            {
              submission.submitter_name
            }
          </strong>

          <a
            href={`mailto:${submission.submitter_email}`}
          >
            {
              submission.submitter_email
            }
          </a>

          <small>
            {
              submission.submitter_relationship
                .replaceAll(
                  "_",
                  " "
                )
            }
          </small>
        </div>

        <span className={styles.expandHint}>
          Expand
        </span>
      </summary>

      <form
        className={
          styles.form
        }
      >
        <input
          name="id"
          type="hidden"
          value={
            submission.id
          }
        />

        <input
          name="submissionType"
          type="hidden"
          value={
            submission.submission_type
          }
        />

        <input
          name="returnTo"
          type="hidden"
          value={
            returnTo
          }
        />

        <div className={styles.quickActionBar}>
          {hasLinkedListing &&
          linkedEntityType &&
          linkedEntityId ? (
            <Link
              className={styles.edit}
              href={`/admin/listings/${linkedEntityType}/${linkedEntityId}?returnTo=${encodeURIComponent(returnTo)}`}
            >
              Edit full listing
            </Link>
          ) : (
            <button
              className={styles.edit}
              formAction={openSubmissionInEditor}
            >
              Create draft & edit full listing
            </button>
          )}

          <span>
            Open the complete Venture editor, or use the queue actions below for a faster decision.
          </span>
        </div>

        <details className={styles.inlineEditor}>
          <summary>
            Show submission details and quick-edit fields
          </summary>

        {hasLinkedListing ? (
          <div
            className={
              styles.linkedNotice
            }
          >
            <strong>
              Full listing connected
            </strong>
            <span>
              Continue detailed editing in the linked {linkedEntityType}. The submission remains in this queue until the public listing is published and marked complete.
            </span>
          </div>
        ) : null}

        {isRestaurant ? (
          <RestaurantFields
            payload={
              payload
            }
          />
        ) : (
          <EventFields
            payload={
              payload
            }
            venues={
              venues
            }
          />
        )}

        <label
          className={
            styles.reviewNotes
          }
        >
          <span>
            Reviewer notes
          </span>

          <textarea
            defaultValue={
              submission.review_notes ??
              ""
            }
            name="reviewNotes"
            placeholder="Required when asking for changes"
            rows={
              3
            }
          />
        </label>

        <div
          className={
            styles.context
          }
        >
          <strong>
            Submission context
          </strong>

          <span>
            {
              submission.submitter_notes ||
              "No additional notes."
            }
          </span>

          {
            submission.source_url
              ? (
                <a
                  href={
                    submission.source_url
                  }
                  rel="noreferrer"
                  target="_blank"
                >
                  Open supporting source
                </a>
              )
              : null
          }
        </div>
        </details>

        <div
          className={
            styles.actions
          }
        >
          {hasLinkedListing &&
          linkedEntityType &&
          linkedEntityId ? (
            <>
              <Link
                className={
                  styles.edit
                }
                href={`/admin/listings/${linkedEntityType}/${linkedEntityId}?returnTo=${encodeURIComponent(returnTo)}`}
              >
                Edit full listing
              </Link>

              <button
                className={
                  styles.approve
                }
                formAction={
                  completeLinkedSubmission
                }
                formNoValidate
              >
                Mark complete after publishing
              </button>
            </>
          ) : (
            <button
              className={
                styles.edit
              }
              formAction={
                openSubmissionInEditor
              }
            >
              Create draft & edit full listing
            </button>
          )}

          <button
            className={
              styles.save
            }
            formAction={
              saveSubmissionReview
            }
          >
            Save review
          </button>

          <button
            className={
              styles.changes
            }
            formAction={
              requestSubmissionChanges
            }
          >
            Needs changes
          </button>

          {!hasLinkedListing ? (
            <>
              <button
                className={
                  styles.approve
                }
                formAction={
                  isRestaurant
                    ? publishRestaurantSubmission
                    : publishEventSubmission
                }
              >
                {isRestaurant
                  ? "Publish basic restaurant"
                  : "Publish basic event"}
              </button>

              <button
                className={
                  styles.reject
                }
                formAction={
                  rejectSubmission
                }
              >
                Reject
              </button>
            </>
          ) : null}
        </div>
      </form>
    </details>
  );
}


function RestaurantFields({
  payload
}: {
  payload:
    Record<string, unknown>;
}) {
  return (
    <>
      <div
        className={
          styles.grid
        }
      >
        <Field
          label="Business name"
          name="name"
          value={
            textValue(
              payload,
              "name"
            )
          }
          required
        />

        <Field
          label="Address"
          name="addressLine1"
          value={
            textValue(
              payload,
              "addressLine1"
            )
          }
          required
        />

        <Field
          label="Neighbourhood"
          name="neighbourhood"
          value={
            textValue(
              payload,
              "neighbourhood"
            )
          }
        />

        <Field
          label="Category"
          name="category"
          value={
            textValue(
              payload,
              "category"
            )
          }
          required
        />

        <Field
          label="Cuisine"
          name="cuisine"
          value={
            textValue(
              payload,
              "cuisine"
            )
          }
        />

        <label>
          <span>
            Venture type
          </span>

          <select
            defaultValue={
              textValue(
                payload,
                "placeType"
              ) || "restaurant"
            }
            name="placeType"
          >
            {
              placeTypeOptions.map(
                ([
                  value,
                  label
                ]) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {label}
                  </option>
                )
              )
            }
          </select>
        </label>

        <Field
          label="Phone"
          name="phone"
          value={
            textValue(
              payload,
              "phone"
            )
          }
        />

        <Field
          label="Website"
          name="website"
          type="url"
          value={
            textValue(
              payload,
              "website"
            )
          }
        />

        <Field
          label="Latitude"
          name="latitude"
          type="number"
          placeholder="Example: 49.8951"
          value={
            textValue(
              payload,
              "latitude"
            )
          }
          required
        />

        <Field
          label="Longitude"
          name="longitude"
          type="number"
          placeholder="Example: -97.1384"
          value={
            textValue(
              payload,
              "longitude"
            )
          }
          required
        />

        <label
          className={
            styles.wide
          }
        >
          <span>
            Description
          </span>

          <textarea
            defaultValue={
              textValue(
                payload,
                "description"
              )
            }
            name="description"
            required
            rows={
              4
            }
          />
        </label>
      </div>

      <p
        className={
          styles.help
        }
      >
        Use coordinates from a trusted
        map source and confirm the pin
        lands on the correct entrance or
        building.
      </p>
    </>
  );
}


function EventFields({
  payload,
  venues
}: {
  payload:
    Record<string, unknown>;
  venues:
    VenueOption[];
}) {
  return (
    <>
      <div
        className={
          styles.grid
        }
      >
        <Field
          label="Event title"
          name="title"
          value={
            textValue(
              payload,
              "title"
            )
          }
          required
        />

        <Field
          label="Category"
          name="category"
          value={
            textValue(
              payload,
              "category"
            )
          }
          required
        />

        <Field
          label="Organizer"
          name="organizerName"
          value={
            textValue(
              payload,
              "organizerName"
            )
          }
          required
        />

        <Field
          label="Organizer website"
          name="organizerWebsite"
          type="url"
          value={
            textValue(
              payload,
              "organizerWebsite"
            )
          }
        />

        <Field
          label="Venue"
          name="venueName"
          value={
            textValue(
              payload,
              "venueName"
            )
          }
          required
        />

        <Field
          label="Venue address"
          name="venueAddress"
          value={
            textValue(
              payload,
              "venueAddress"
            )
          }
          required
        />

        <label
          className={
            styles.wide
          }
        >
          <span>
            Existing Venture venue
          </span>

          <select
            defaultValue={
              textValue(
                payload,
                "existingVenueId"
              )
            }
            name="existingVenueId"
          >
            <option value="">
              Create or automatically match the venue
            </option>

            {
              venues.map(
                (venue) => (
                  <option
                    key={
                      venue.id
                    }
                    value={
                      venue.id
                    }
                  >
                    {venue.name}
                    {" · "}
                    {
                      venue.address_line1
                    }
                  </option>
                )
              )
            }
          </select>
        </label>

        <Field
          label="New venue latitude"
          name="venueLatitude"
          type="number"
          placeholder="Only needed for a new venue"
          value={
            textValue(
              payload,
              "venueLatitude"
            )
          }
        />

        <Field
          label="New venue longitude"
          name="venueLongitude"
          type="number"
          placeholder="Only needed for a new venue"
          value={
            textValue(
              payload,
              "venueLongitude"
            )
          }
        />

        <Field
          label="Neighbourhood"
          name="neighbourhood"
          value={
            textValue(
              payload,
              "neighbourhood"
            )
          }
        />

        <Field
          label="Age label"
          name="ageLabel"
          value={
            textValue(
              payload,
              "ageLabel"
            )
          }
        />

        <Field
          label="Starts"
          name="startAt"
          type="datetime-local"
          value={
            localDateTimeValue(
              payload,
              "startAt"
            )
          }
          required
        />

        <Field
          label="Ends"
          name="endAt"
          type="datetime-local"
          value={
            localDateTimeValue(
              payload,
              "endAt"
            )
          }
        />

        <Field
          label="Minimum price"
          name="minimumPriceCad"
          type="number"
          value={
            textValue(
              payload,
              "minimumPriceCad"
            )
          }
        />

        <Field
          label="Maximum price"
          name="maximumPriceCad"
          type="number"
          value={
            textValue(
              payload,
              "maximumPriceCad"
            )
          }
        />

        <Field
          label="Ticket or official link"
          name="ticketUrl"
          type="url"
          value={
            textValue(
              payload,
              "ticketUrl"
            )
          }
          required
          wide
        />

        <label
          className={
            styles.wide
          }
        >
          <span>
            Description
          </span>

          <textarea
            defaultValue={
              textValue(
                payload,
                "description"
              )
            }
            name="description"
            required
            rows={
              5
            }
          />
        </label>

        <label
          className={
            styles.wide
          }
        >
          <span>
            Accessibility information
          </span>

          <textarea
            defaultValue={
              textValue(
                payload,
                "accessibilityNotes"
              )
            }
            name="accessibilityNotes"
            rows={
              3
            }
          />
        </label>
      </div>

      <p
        className={
          styles.help
        }
      >
        Selecting an existing venue
        ignores the new-coordinate
        fields. Leaving it blank makes
        Venture match by name and
        address, or create a new venue
        using the coordinates.
      </p>
    </>
  );
}


function Field({
  label,
  name,
  value,
  type = "text",
  required = false,
  wide = false,
  placeholder
}: {
  label:
    string;
  name:
    string;
  value:
    string;
  type?:
    string;
  required?:
    boolean;
  wide?:
    boolean;
  placeholder?:
    string;
}) {
  return (
    <label
      className={
        wide
          ? styles.wide
          : undefined
      }
    >
      <span>
        {label}
      </span>

      <input
        defaultValue={
          value
        }
        min={
          type === "number" &&
          !name.toLowerCase().includes(
            "latitude"
          ) &&
          !name.toLowerCase().includes(
            "longitude"
          )
            ? "0"
            : undefined
        }
        name={
          name
        }
        placeholder={
          placeholder
        }
        required={
          required
        }
        step={
          type === "number"
            ? "any"
            : undefined
        }
        type={
          type
        }
      />
    </label>
  );
}
