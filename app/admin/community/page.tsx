import type {
  Metadata
} from "next";

import Link from "next/link";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  getAdminCommunityExperiences
} from "@/lib/community";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  addCommunityStop,
  duplicateCommunityExperience,
  moveCommunityStop,
  removeCommunityStop,
  saveCommunityExperience,
  setCommunityExperienceStatus
} from "./actions";

import {
  CommunityGuestOperations
} from "./guest-operations";

import {
  CommunityLaunchTools
} from "./community-launch-tools";

import styles from "./page.module.css";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "Venture Community Builder",
  description:
    "Create and operate monthly Venture is Building community experiences."
};

type ListingOption = {
  value: string;
  label: string;
};


type AdminExperience =
  Awaited<
    ReturnType<
      typeof getAdminCommunityExperiences
    >
  >[number];

type LaunchCheck = {
  label: string;
  ready: boolean;
};

function getLaunchChecks(
  experience: AdminExperience
): LaunchCheck[] {
  const orderedStops =
    [...experience.stops].sort(
      (left, right) =>
        left.position -
        right.position
    );

  return [
    {
      label:
        "The date, time and capacity are set",
      ready:
        Boolean(
          experience.startsAt
        ) &&
        experience.capacity >= 4
    },
    {
      label:
        "The public summary explains the experience",
      ready:
        experience.summary.trim().length >= 45
    },
    {
      label:
        "At least two itinerary stops are added",
      ready:
        orderedStops.length >= 2
    },
    {
      label:
        "Every itinerary stop has an arrival time",
      ready:
        orderedStops.length > 0 &&
        orderedStops.every(
          (stop) =>
            Boolean(stop.startsAt)
        )
    },
    {
      label:
        "The meeting point and arrival instructions are clear",
      ready:
        Boolean(
          experience.meetingPoint?.trim()
        ) &&
        Boolean(
          experience.meetingInstructions?.trim()
        )
    },
    {
      label:
        "A host is named for the group",
      ready:
        Boolean(
          experience.hostName?.trim()
        )
    }
  ];
}

type AdminRsvp = {
  id: string;
  experience_id: string;
  user_id: string;
  attendee_count: number;
  status: string;
  attending_alone: boolean;
  dietary_notes: string;
  accessibility_notes: string;
  created_at: string;
};

function localDateTime(
  value: string | null
): string {
  if (!value) {
    return "";
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

function formatDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Winnipeg",
      dateStyle:
        "medium",
      timeStyle:
        "short"
    }
  ).format(
    new Date(value)
  );
}

function statusLabel(
  status: string
): string {
  return status
    .replaceAll("_", " ")
    .replace(
      /^./,
      (letter) =>
        letter.toUpperCase()
    );
}

function nextPrimaryStatus(
  status: string
): {
  value: string;
  label: string;
} {
  if (status === "draft") {
    return {
      value: "published",
      label: "Publish experience"
    };
  }

  if (status === "published") {
    return {
      value: "completed",
      label: "Mark completed"
    };
  }

  if (status === "completed") {
    return {
      value: "archived",
      label: "Archive experience"
    };
  }

  return {
    value: "draft",
    label: "Return to draft"
  };
}

export default async function CommunityAdminPage() {
  await requireVentureAdmin();

  const supabase =
    getSupabaseAdminClient();

  const {
    error: schemaError
  } =
    await supabase
      .from(
        "community_experiences"
      )
      .select("id")
      .limit(1);

  const migrationRequired =
    Boolean(schemaError);

  const [
    experiences,
    placesResult,
    eventsResult,
    rsvpsResult
  ] =
    migrationRequired
      ? [
          [],
          {
            data: []
          },
          {
            data: []
          },
          {
            data: []
          }
        ]
      : await Promise.all([
          getAdminCommunityExperiences(),

          supabase
            .from("places")
            .select(
              "id, name, neighbourhood"
            )
            .eq(
              "status",
              "published"
            )
            .order(
              "name",
              {
                ascending: true
              }
            )
            .limit(250),

          supabase
            .from("events")
            .select(
              "id, title, start_at"
            )
            .eq(
              "status",
              "published"
            )
            .gt(
              "expires_at",
              new Date()
                .toISOString()
            )
            .order(
              "start_at",
              {
                ascending: true
              }
            )
            .limit(250),

          supabase
            .from(
              "community_rsvps"
            )
            .select(
              "id, experience_id, user_id, attendee_count, status, attending_alone, dietary_notes, accessibility_notes, created_at"
            )
            .order(
              "created_at",
              {
                ascending: true
              }
            )
        ]);

  const listingOptions:
    ListingOption[] = [
      ...(
        placesResult.data ??
        []
      ).map(
        (place) => ({
          value:
            `place:${place.id}`,
          label:
            `${place.name}${
              place.neighbourhood
                ? ` · ${place.neighbourhood}`
                : ""
            }`
        })
      ),

      ...(
        eventsResult.data ??
        []
      ).map(
        (event) => ({
          value:
            `event:${event.id}`,
          label:
            `${event.title} · ${formatDate(
              event.start_at
            )}`
        })
      )
    ];

  const rsvps =
    (rsvpsResult.data ??
      []) as AdminRsvp[];

  const rsvpsByExperience =
    new Map<
      string,
      AdminRsvp[]
    >();

  for (
    const rsvp of rsvps
  ) {
    const current =
      rsvpsByExperience.get(
        rsvp.experience_id
      ) ?? [];

    current.push(rsvp);

    rsvpsByExperience.set(
      rsvp.experience_id,
      current
    );
  }

  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
      >
        <div>
          <p
            className={styles.eyebrow}
          >
            VENTURE IS BUILDING
          </p>

          <h1>
            Build the month in three simple steps.
          </h1>

          <p>
            Create the experience, add the stops,
            then publish when the plan is ready.
            RSVP operations stay tucked away until
            people begin joining.
          </p>
        </div>

        <div
          className={styles.heroActions}
        >
          <Link href="/community">
            View public page
          </Link>

          <Link href="/admin">
            Back to admin
          </Link>
        </div>
      </section>

      {migrationRequired ? (
        <section
          className={styles.notice}
        >
          Run{" "}
          <code>
            supabase/migrations/20260725130000_create_venture_community.sql
          </code>{" "}
          in Supabase before creating the first
          experience.
        </section>
      ) : null}

      <details
        className={styles.createPanel}
        open={
          experiences.length ===
          0
        }
      >
        <summary>
          <span>
            Create this month&apos;s experience
          </span>

          <b aria-hidden="true">＋</b>
        </summary>

        <ExperienceForm />
      </details>

      <section className={styles.list}>
        {experiences.length > 0 ? (
          experiences.map(
            (experience) => {
              const experienceRsvps =
                rsvpsByExperience.get(
                  experience.id
                ) ?? [];

              const primaryStatus =
                nextPrimaryStatus(
                  experience.status
                );

              const orderedStops =
                [...experience.stops].sort(
                  (left, right) =>
                    left.position -
                    right.position
                );

              return (
                <article
                  className={styles.experience}
                  key={experience.id}
                >
                  <header
                    className={styles.experienceHeader}
                  >
                    <div>
                      <span
                        className={styles.statusBadge}
                        data-status={experience.status}
                      >
                        {statusLabel(
                          experience.status
                        )}
                      </span>

                      <h2>
                        {experience.title}
                      </h2>

                      <p>
                        {formatDate(
                          experience.startsAt
                        )}
                        {" · "}
                        {experience.neighbourhood ??
                          "Winnipeg"}
                      </p>
                    </div>

                    <Link
                      href={`/community/${experience.slug}`}
                    >
                      Preview
                    </Link>
                  </header>

                  <div className={styles.metrics}>
                    <span>
                      <strong>
                        {experience.stops.length}
                      </strong>
                      Itinerary stops
                    </span>

                    <span>
                      <strong>
                        {experience.confirmedPeople}
                      </strong>
                      Confirmed
                    </span>

                    <span>
                      <strong>
                        {experience.remainingSpots}
                      </strong>
                      Spaces left
                    </span>
                  </div>

                  {(() => {
                    const launchChecks =
                      getLaunchChecks(
                        experience
                      );

                    const readyCount =
                      launchChecks.filter(
                        (check) =>
                          check.ready
                      ).length;

                    const readinessPercent =
                      Math.round(
                        (readyCount /
                          launchChecks.length) *
                        100
                      );

                    return (
                      <section
                        className={styles.launchPanel}
                        data-ready={
                          readyCount ===
                          launchChecks.length
                        }
                      >
                        <header
                          className={styles.launchPanelHeader}
                        >
                          <div>
                            <span>LAUNCH READINESS</span>

                            <h3>
                              {readyCount ===
                              launchChecks.length
                                ? "Ready to invite Winnipeg"
                                : `${readyCount} of ${launchChecks.length} essentials ready`}
                            </h3>

                            <p>
                              Finish the essentials, preview the public page, then share the link.
                            </p>
                          </div>

                          <strong>
                            {readinessPercent}%
                          </strong>
                        </header>

                        <div
                          className={styles.launchProgress}
                          aria-label={`${readinessPercent}% launch ready`}
                        >
                          <span
                            style={{
                              width:
                                `${readinessPercent}%`
                            }}
                          />
                        </div>

                        <div
                          className={styles.launchChecklist}
                        >
                          {launchChecks.map(
                            (check) => (
                              <span
                                data-ready={check.ready}
                                key={check.label}
                              >
                                <b aria-hidden="true">
                                  {check.ready
                                    ? "✓"
                                    : "·"}
                                </b>

                                {check.label}
                              </span>
                            )
                          )}
                        </div>

                        <div
                          className={styles.launchActions}
                        >
                          <CommunityLaunchTools
                            slug={experience.slug}
                            title={experience.title}
                          />

                          <form
                            action={duplicateCommunityExperience}
                          >
                            <input
                              type="hidden"
                              name="experienceId"
                              value={experience.id}
                            />

                            <button type="submit">
                              Duplicate for next month
                            </button>
                          </form>
                        </div>

                        <small
                          className={styles.duplicateNote}
                        >
                          Duplication creates a new draft four weeks later. Review its dates before publishing.
                        </small>
                      </section>
                    );
                  })()}

                  <div className={styles.primaryActions}>
                    <form
                      action={setCommunityExperienceStatus}
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={experience.id}
                      />

                      <input
                        type="hidden"
                        name="status"
                        value={primaryStatus.value}
                      />

                      <button type="submit">
                        {primaryStatus.label}
                      </button>
                    </form>

                    <details
                      className={styles.moreStatus}
                    >
                      <summary>
                        More status options
                      </summary>

                      <div>
                        {[
                          "draft",
                          "published",
                          "completed",
                          "cancelled",
                          "archived"
                        ].map(
                          (status) => (
                            <form
                              action={setCommunityExperienceStatus}
                              key={status}
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={experience.id}
                              />

                              <input
                                type="hidden"
                                name="status"
                                value={status}
                              />

                              <button
                                type="submit"
                                disabled={
                                  experience.status ===
                                  status
                                }
                              >
                                {statusLabel(
                                  status
                                )}
                              </button>
                            </form>
                          )
                        )}
                      </div>
                    </details>
                  </div>

                  <section className={styles.steps}>
                    <details
                      className={styles.stepPanel}
                      open={orderedStops.length === 0}
                    >
                      <summary>
                        <span>1</span>

                        <div>
                          <strong>
                            Build the itinerary
                          </strong>
                          <small>
                            Add places and events in order.
                          </small>
                        </div>

                        <b aria-hidden="true">＋</b>
                      </summary>

                      <div className={styles.stepBody}>
                        {orderedStops.length > 0 ? (
                          <div className={styles.stopList}>
                            {orderedStops.map(
                              (stop, index) => (
                                <article
                                  className={styles.stop}
                                  key={stop.id}
                                >
                                  <span>{index + 1}</span>

                                  <div>
                                    <strong>
                                      {stop.listingName}
                                    </strong>

                                    <small>
                                      {stop.startsAt
                                        ? formatDate(
                                            stop.startsAt
                                          )
                                        : "Flexible time"}
                                    </small>
                                  </div>

                                  <div
                                    className={styles.stopActions}
                                  >
                                    <form
                                      action={moveCommunityStop}
                                    >
                                      <input
                                        type="hidden"
                                        name="stopId"
                                        value={stop.id}
                                      />

                                      <input
                                        type="hidden"
                                        name="experienceId"
                                        value={experience.id}
                                      />

                                      <input
                                        type="hidden"
                                        name="direction"
                                        value="up"
                                      />

                                      <button
                                        type="submit"
                                        disabled={index === 0}
                                        aria-label="Move stop earlier"
                                      >
                                        ↑
                                      </button>
                                    </form>

                                    <form
                                      action={moveCommunityStop}
                                    >
                                      <input
                                        type="hidden"
                                        name="stopId"
                                        value={stop.id}
                                      />

                                      <input
                                        type="hidden"
                                        name="experienceId"
                                        value={experience.id}
                                      />

                                      <input
                                        type="hidden"
                                        name="direction"
                                        value="down"
                                      />

                                      <button
                                        type="submit"
                                        disabled={
                                          index ===
                                          orderedStops.length - 1
                                        }
                                        aria-label="Move stop later"
                                      >
                                        ↓
                                      </button>
                                    </form>

                                    <form
                                      action={removeCommunityStop}
                                    >
                                      <input
                                        type="hidden"
                                        name="stopId"
                                        value={stop.id}
                                      />

                                      <button type="submit">
                                        Remove
                                      </button>
                                    </form>
                                  </div>
                                </article>
                              )
                            )}
                          </div>
                        ) : (
                          <p className={styles.emptyInline}>
                            No stops yet. Choose the first place
                            or event below.
                          </p>
                        )}

                        <form
                          className={styles.addStopForm}
                          action={addCommunityStop}
                        >
                          <input
                            type="hidden"
                            name="experienceId"
                            value={experience.id}
                          />

                          <label
                            className={styles.fullField}
                          >
                            Add a Venture listing
                            <select
                              name="listingReference"
                              required
                            >
                              <option value="">
                                Choose a place or event
                              </option>

                              {listingOptions.map(
                                (option) => (
                                  <option
                                    value={option.value}
                                    key={option.value}
                                  >
                                    {option.label}
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          <label>
                            Arrival time
                            <input
                              type="datetime-local"
                              name="startsAt"
                            />
                          </label>

                          <label>
                            Departure time
                            <input
                              type="datetime-local"
                              name="endsAt"
                            />
                          </label>

                          <details
                            className={styles.stopAdvanced}
                          >
                            <summary>
                              Optional stop details
                            </summary>

                            <label>
                              Notes
                              <textarea
                                name="notes"
                                maxLength={800}
                                placeholder="Introductions, what happens here, or how the group moves on."
                              />
                            </label>

                            <label
                              className={styles.checkRow}
                            >
                              <input
                                type="checkbox"
                                name="joinableSeparately"
                              />
                              People may join at this stop
                            </label>
                          </details>

                          <button type="submit">
                            Add stop
                          </button>
                        </form>
                      </div>
                    </details>

                    <details className={styles.stepPanel}>
                      <summary>
                        <span>2</span>

                        <div>
                          <strong>
                            Edit the experience
                          </strong>
                          <small>
                            Change details, meeting notes and visuals.
                          </small>
                        </div>

                        <b aria-hidden="true">＋</b>
                      </summary>

                      <div className={styles.stepBody}>
                        <ExperienceForm
                          experience={experience}
                        />
                      </div>
                    </details>

                    <details className={styles.stepPanel}>
                      <summary>
                        <span>3</span>

                        <div>
                          <strong>
                            Guests and attendance
                          </strong>
                          <small>
                            Open this after people start joining.
                          </small>
                        </div>

                        <b aria-hidden="true">＋</b>
                      </summary>

                      <div className={styles.stepBody}>
                        <CommunityGuestOperations
                          experience={experience}
                          rsvps={experienceRsvps}
                        />
                      </div>
                    </details>
                  </section>
                </article>
              );
            }
          )
        ) : (
          <section className={styles.empty}>
            No community experiences have been created yet.
          </section>
        )}
      </section>
    </main>
  );
}

function ExperienceForm({
  experience
}: {
  experience?: Awaited<
    ReturnType<
      typeof getAdminCommunityExperiences
    >
  >[number];
}) {
  return (
    <form
      className={styles.form}
      action={saveCommunityExperience}
    >
      {experience ? (
        <input
          type="hidden"
          name="id"
          value={experience.id}
        />
      ) : null}

      <section className={styles.formSection}>
        <header>
          <span>ESSENTIALS</span>
          <h3>
            The information people need first
          </h3>
        </header>

        <div className={styles.formGrid}>
          <label className={styles.fullField}>
            Experience title
            <input
              name="title"
              defaultValue={experience?.title ?? ""}
              placeholder="Games, Food & New Faces"
              required
              maxLength={180}
            />
          </label>

          <label>
            Starts
            <input
              type="datetime-local"
              name="startsAt"
              defaultValue={localDateTime(
                experience?.startsAt ?? null
              )}
              required
            />
          </label>

          <label>
            Ends
            <input
              type="datetime-local"
              name="endsAt"
              defaultValue={localDateTime(
                experience?.endsAt ?? null
              )}
            />
          </label>

          <label>
            Neighbourhood
            <input
              name="neighbourhood"
              defaultValue={experience?.neighbourhood ?? ""}
              placeholder="Exchange District"
              maxLength={120}
            />
          </label>

          <label>
            Capacity
            <input
              type="number"
              name="capacity"
              min="2"
              max="200"
              defaultValue={experience?.capacity ?? 12}
              required
            />
          </label>

          <label className={styles.fullField}>
            Short summary
            <textarea
              name="summary"
              defaultValue={experience?.summary ?? ""}
              placeholder="A relaxed afternoon of games, food and meeting new people."
              required
              maxLength={420}
            />
          </label>

          <label className={styles.fullField}>
            Hero image URL
            <input
              type="url"
              name="heroImageUrl"
              defaultValue={experience?.heroImageUrl ?? ""}
              placeholder="Optional image URL"
              maxLength={1000}
            />
          </label>
        </div>
      </section>

      <details className={styles.advancedPanel}>
        <summary>
          Advanced details
          <span>
            Optional host, cost, access and meeting information
          </span>
        </summary>

        <div className={styles.formGrid}>
          <label>
            URL slug
            <input
              name="slug"
              defaultValue={experience?.slug ?? ""}
              placeholder="Auto-created from title"
              maxLength={140}
            />
          </label>

          <label>
            Eyebrow
            <input
              name="eyebrow"
              defaultValue={
                experience?.eyebrow ??
                "VENTURE IS BUILDING"
              }
              maxLength={80}
            />
          </label>

          <label className={styles.fullField}>
            Full description
            <textarea
              name="description"
              defaultValue={experience?.description ?? ""}
              maxLength={3000}
            />
          </label>

          <label>
            Minimum age
            <input
              type="number"
              name="minimumAge"
              min="0"
              max="99"
              defaultValue={experience?.minimumAge ?? ""}
            />
          </label>

          <label>
            Social vibe
            <input
              name="socialVibe"
              defaultValue={
                experience?.socialVibe.join(", ") ?? ""
              }
              placeholder="Relaxed, newcomer-friendly"
              maxLength={500}
            />
          </label>

          <label>
            Estimated spend minimum
            <input
              type="number"
              name="estimatedCostMinCad"
              min="0"
              step="0.01"
              defaultValue={
                experience?.estimatedCostMinCad ?? ""
              }
            />
          </label>

          <label>
            Estimated spend maximum
            <input
              type="number"
              name="estimatedCostMaxCad"
              min="0"
              step="0.01"
              defaultValue={
                experience?.estimatedCostMaxCad ?? ""
              }
            />
          </label>

          <label className={styles.fullField}>
            Meeting point
            <input
              name="meetingPoint"
              defaultValue={experience?.meetingPoint ?? ""}
              maxLength={250}
            />
          </label>

          <label className={styles.fullField}>
            Meeting instructions
            <textarea
              name="meetingInstructions"
              defaultValue={
                experience?.meetingInstructions ?? ""
              }
              maxLength={1000}
            />
          </label>

          <label className={styles.fullField}>
            Accessibility notes
            <textarea
              name="accessibilityNotes"
              defaultValue={
                experience?.accessibilityNotes ?? ""
              }
              maxLength={1000}
            />
          </label>

          <label className={styles.fullField}>
            Dietary notes
            <textarea
              name="dietaryNotes"
              defaultValue={experience?.dietaryNotes ?? ""}
              maxLength={1000}
            />
          </label>

          <label className={styles.fullField}>
            What to bring
            <textarea
              name="whatToBring"
              defaultValue={experience?.whatToBring ?? ""}
              maxLength={1000}
            />
          </label>

          <label>
            Host name
            <input
              name="hostName"
              defaultValue={experience?.hostName ?? ""}
              maxLength={160}
            />
          </label>

          <label className={styles.fullField}>
            Host description
            <textarea
              name="hostDescription"
              defaultValue={experience?.hostDescription ?? ""}
              maxLength={800}
            />
          </label>
        </div>
      </details>

      <button
        className={styles.saveButton}
        type="submit"
      >
        {experience
          ? "Save changes"
          : "Create draft and add stops"}
      </button>
    </form>
  );
}
