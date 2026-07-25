import Link from "next/link";

import type {
  CommunityExperience
} from "@/lib/community-types";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  checkInCommunityRsvp,
  updateCommunityRsvpStatus
} from "./actions";

import {
  CopyCommunityMessageButton
} from "./copy-community-message-button";

import styles from "./guest-operations.module.css";

export type CommunityAdminRsvp = {
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

const RSVP_STATUSES = [
  "confirmed",
  "waitlisted",
  "attended",
  "cancelled",
  "no_show"
] as const;

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

function shortUserId(
  value: string
): string {
  return value
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();
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

function messageDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Winnipeg",
      weekday:
        "long",
      month:
        "long",
      day:
        "numeric",
      hour:
        "numeric",
      minute:
        "2-digit"
    }
  ).format(
    new Date(value)
  );
}

function buildMessages(
  experience: CommunityExperience
) {
  const date =
    messageDate(
      experience.startsAt
    );

  const location =
    experience.meetingPoint ??
    experience.neighbourhood ??
    "the meeting point in the Venture plan";

  const link =
    `https://venture.boogiebangers.com/community/${experience.slug}`;

  return [
    {
      title:
        "RSVP confirmation",
      text:
        `You are confirmed for ${experience.title} on ${date}. We will meet at ${location}. Review the full plan here: ${link}`
    },
    {
      title:
        "One-week reminder",
      text:
        `A quick reminder that ${experience.title} is coming up on ${date}. The itinerary and latest meeting details are here: ${link}`
    },
    {
      title:
        "Day-before reminder",
      text:
        `Tomorrow is ${experience.title}. Meet us at ${location}. Please arrive a few minutes early and check the final plan before leaving: ${link}`
    },
    {
      title:
        "Waitlist promotion",
      text:
        `A space opened for ${experience.title}. You have been moved from the waitlist to confirmed for ${date}. See the plan here: ${link}`
    },
    {
      title:
        "Thank-you message",
      text:
        `Thank you for joining ${experience.title}. We hope the day gave you a few new places, people, or stories to carry forward. Venture would love to hear what worked and what should improve.`
    }
  ];
}

function peopleForStatus(
  rsvps: CommunityAdminRsvp[],
  status: string
): number {
  return rsvps
    .filter(
      (rsvp) =>
        rsvp.status === status
    )
    .reduce(
      (total, rsvp) =>
        total +
        rsvp.attendee_count,
      0
    );
}

export async function CommunityGuestOperations({
  experience,
  rsvps
}: {
  experience: CommunityExperience;
  rsvps: CommunityAdminRsvp[];
}) {
  const supabase =
    getSupabaseAdminClient();

  const {
    data: checkIns,
    error: checkInError
  } =
    await supabase
      .from(
        "community_check_ins"
      )
      .select(
        "rsvp_id, checked_in_at"
      )
      .eq(
        "experience_id",
        experience.id
      );

  if (checkInError) {
    throw new Error(
      checkInError.message
    );
  }

  const checkInMap =
    new Map(
      (checkIns ?? []).map(
        (checkIn) => [
          checkIn.rsvp_id,
          checkIn.checked_in_at
        ]
      )
    );

  const messages =
    buildMessages(experience);

  const confirmedPeople =
    peopleForStatus(
      rsvps,
      "confirmed"
    );

  const attendedPeople =
    peopleForStatus(
      rsvps,
      "attended"
    );

  const activePeople =
    confirmedPeople +
    attendedPeople;

  const waitlistedPeople =
    peopleForStatus(
      rsvps,
      "waitlisted"
    );

  const capacityTone =
    activePeople >=
    experience.capacity
      ? "full"
      : experience.capacity -
          activePeople <=
        3
        ? "low"
        : "open";

  return (
    <div
      className={styles.operations}
    >
      <section
        className={styles.overview}
      >
        <article>
          <span>ACTIVE</span>
          <strong>
            {activePeople}
          </strong>
          <small>
            Confirmed or checked in
          </small>
        </article>

        <article>
          <span>WAITLIST</span>
          <strong>
            {waitlistedPeople}
          </strong>
          <small>
            Waiting for a space
          </small>
        </article>

        <article
          data-tone={capacityTone}
        >
          <span>CAPACITY</span>
          <strong>
            {Math.max(
              experience.capacity -
                activePeople,
              0
            )}
          </strong>
          <small>
            {capacityTone === "full"
              ? "The experience is full"
              : "Spaces still available"}
          </small>
        </article>
      </section>

      <nav
        className={styles.tools}
        aria-label="Community operations tools"
      >
        <Link
          href={`/admin/community/${experience.id}/guests`}
          download
        >
          Export guest CSV
        </Link>

        <Link
          href={`/admin/community/${experience.id}/run-sheet`}
          target="_blank"
        >
          Open host run sheet
        </Link>
      </nav>

      {capacityTone !== "open" ? (
        <p
          className={styles.capacityNotice}
          data-tone={capacityTone}
        >
          {capacityTone === "full"
            ? "Capacity is full. New RSVPs will be waitlisted."
            : "Only a few spaces remain. Review the guest list before manually confirming anyone from the waitlist."}
        </p>
      ) : null}

      {rsvps.length > 0 ? (
        <div
          className={styles.statusGroups}
        >
          {RSVP_STATUSES.map(
            (status) => {
              const statusRsvps =
                rsvps.filter(
                  (rsvp) =>
                    rsvp.status ===
                    status
                );

              if (
                statusRsvps.length ===
                0
              ) {
                return null;
              }

              return (
                <details
                  className={styles.statusGroup}
                  open={
                    status ===
                      "confirmed" ||
                    status ===
                      "waitlisted"
                  }
                  key={status}
                >
                  <summary>
                    <span>
                      {statusLabel(
                        status
                      )}
                    </span>

                    <b>
                      {peopleForStatus(
                        statusRsvps,
                        status
                      )}
                    </b>
                  </summary>

                  <div
                    className={styles.guestList}
                  >
                    {statusRsvps.map(
                      (rsvp) => {
                        const checkedInAt =
                          checkInMap.get(
                            rsvp.id
                          );

                        return (
                          <article
                            className={styles.guest}
                            key={rsvp.id}
                          >
                            <header>
                              <div>
                                <strong>
                                  User{" "}
                                  {shortUserId(
                                    rsvp.user_id
                                  )}
                                </strong>

                                <small>
                                  {rsvp.attendee_count}{" "}
                                  {rsvp.attendee_count ===
                                  1
                                    ? "person"
                                    : "people"}
                                  {" · "}
                                  {rsvp.attending_alone
                                    ? "arriving independently"
                                    : "arriving with someone"}
                                </small>
                              </div>

                              <span
                                data-status={
                                  rsvp.status
                                }
                              >
                                {checkedInAt
                                  ? "Checked in"
                                  : statusLabel(
                                      rsvp.status
                                    )}
                              </span>
                            </header>

                            {checkedInAt ? (
                              <p
                                className={styles.checkInTime}
                              >
                                Checked in{" "}
                                {formatDate(
                                  checkedInAt
                                )}
                              </p>
                            ) : null}

                            {rsvp.dietary_notes ||
                            rsvp.accessibility_notes ? (
                              <div
                                className={styles.privateNotes}
                              >
                                <small>
                                  PRIVATE HOST NOTES
                                </small>

                                {rsvp.dietary_notes ? (
                                  <p>
                                    <strong>
                                      Dietary:
                                    </strong>{" "}
                                    {
                                      rsvp.dietary_notes
                                    }
                                  </p>
                                ) : null}

                                {rsvp.accessibility_notes ? (
                                  <p>
                                    <strong>
                                      Accessibility:
                                    </strong>{" "}
                                    {
                                      rsvp.accessibility_notes
                                    }
                                  </p>
                                ) : null}
                              </div>
                            ) : null}

                            <div
                              className={styles.quickActions}
                            >
                              {rsvp.status ===
                                "confirmed" &&
                              !checkedInAt ? (
                                <form
                                  action={checkInCommunityRsvp}
                                >
                                  <input
                                    type="hidden"
                                    name="rsvpId"
                                    value={rsvp.id}
                                  />

                                  <button
                                    type="submit"
                                    data-action="check-in"
                                  >
                                    Check in
                                  </button>
                                </form>
                              ) : null}

                              {rsvp.status ===
                              "waitlisted" ? (
                                <StatusButton
                                  rsvpId={rsvp.id}
                                  status="confirmed"
                                  label="Move to confirmed"
                                />
                              ) : null}

                              {rsvp.status ===
                              "confirmed" ? (
                                <StatusButton
                                  rsvpId={rsvp.id}
                                  status="waitlisted"
                                  label="Move to waitlist"
                                />
                              ) : null}

                              {rsvp.status ===
                              "cancelled" ? (
                                <StatusButton
                                  rsvpId={rsvp.id}
                                  status="waitlisted"
                                  label="Restore to waitlist"
                                />
                              ) : null}

                              {![
                                "cancelled",
                                "attended"
                              ].includes(
                                rsvp.status
                              ) ? (
                                <StatusButton
                                  rsvpId={rsvp.id}
                                  status="cancelled"
                                  label="Cancel RSVP"
                                  tone="quiet"
                                />
                              ) : null}
                            </div>

                            <details
                              className={styles.moreActions}
                            >
                              <summary>
                                More status options
                              </summary>

                              <form
                                action={updateCommunityRsvpStatus}
                              >
                                <input
                                  type="hidden"
                                  name="rsvpId"
                                  value={rsvp.id}
                                />

                                <select
                                  name="status"
                                  defaultValue={rsvp.status}
                                >
                                  {RSVP_STATUSES.map(
                                    (option) => (
                                      <option
                                        value={option}
                                        key={option}
                                      >
                                        {statusLabel(
                                          option
                                        )}
                                      </option>
                                    )
                                  )}
                                </select>

                                <button
                                  type="submit"
                                >
                                  Save status
                                </button>
                              </form>
                            </details>
                          </article>
                        );
                      }
                    )}
                  </div>
                </details>
              );
            }
          )}
        </div>
      ) : (
        <p
          className={styles.empty}
        >
          No RSVPs yet. Publish the experience and the guest list will grow here.
        </p>
      )}

      <details
        className={styles.messageKit}
      >
        <summary>
          Attendee message kit
          <span>
            Ready-to-copy reminders and updates
          </span>
        </summary>

        <div
          className={styles.messages}
        >
          {messages.map(
            (message) => (
              <article
                key={message.title}
              >
                <strong>
                  {message.title}
                </strong>

                <p>
                  {message.text}
                </p>

                <CopyCommunityMessageButton
                  text={message.text}
                />
              </article>
            )
          )}
        </div>
      </details>
    </div>
  );
}

function StatusButton({
  rsvpId,
  status,
  label,
  tone = "default"
}: {
  rsvpId: string;
  status: string;
  label: string;
  tone?: "default" | "quiet";
}) {
  return (
    <form
      action={updateCommunityRsvpStatus}
    >
      <input
        type="hidden"
        name="rsvpId"
        value={rsvpId}
      />

      <input
        type="hidden"
        name="status"
        value={status}
      />

      <button
        type="submit"
        data-tone={tone}
      >
        {label}
      </button>
    </form>
  );
}
