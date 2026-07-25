import type {
  Metadata
} from "next";

import Link from "next/link";

import {
  notFound
} from "next/navigation";

import {
  cancelCommunityRsvp,
  joinCommunityExperience
} from "../actions";

import {
  CommunityExperienceFeedback
} from "@/components/community-experience-feedback";

import {
  getCommunityExperienceBySlug
} from "@/lib/community";

import {
  getSupabaseServerClient
} from "@/lib/supabase/server";

import type {
  CommunityRsvp
} from "@/lib/community-types";

import styles from "../community.module.css";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params:
    Promise<{
      slug: string;
    }>;

  searchParams:
    Promise<{
      rsvp?: string;
      error?: string;
    }>;
};

function formatDate(
  value: string,
  options:
    Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Winnipeg",
      ...options
    }
  ).format(
    new Date(value)
  );
}

function timeLabel(
  value: string | null
): string {
  if (!value) {
    return "Flexible";
  }

  return formatDate(
    value,
    {
      hour: "numeric",
      minute: "2-digit"
    }
  );
}

function timeRange(
  startsAt: string | null,
  endsAt: string | null
): string {
  if (!startsAt) {
    return "Timing shared in the plan";
  }

  const start = timeLabel(startsAt);

  return endsAt
    ? `${start}–${timeLabel(endsAt)}`
    : start;
}

function costLabel(
  minimum: number | null,
  maximum: number | null
): string {
  if (
    minimum === null &&
    maximum === null
  ) {
    return "Details coming";
  }

  if (
    minimum !== null &&
    maximum !== null &&
    minimum !== maximum
  ) {
    return `$${minimum}–$${maximum}`;
  }

  return `$${minimum ?? maximum}`;
}

function meetingDirectionsUrl(
  meetingPoint: string | null,
  neighbourhood: string | null
): string | null {
  const destination =
    meetingPoint ??
    neighbourhood;

  if (!destination) {
    return null;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${destination}, Winnipeg, Manitoba`
  )}`;
}

function normalizeCopy(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "");
}

async function currentRsvp(
  experienceId: string
): Promise<CommunityRsvp | null> {
  try {
    const supabase =
      await getSupabaseServerClient();

    const {
      data: claimData
    } =
      await supabase
        .auth
        .getClaims();

    const claims =
      claimData?.claims as
        | Record<
            string,
            unknown
          >
        | undefined;

    const userId =
      typeof claims?.sub ===
        "string"
        ? claims.sub
        : "";

    if (!userId) {
      return null;
    }

    const {
      data,
      error
    } =
      await supabase
        .from(
          "community_rsvps"
        )
        .select(
          "id, experience_id, attendee_count, status, attending_alone, dietary_notes, accessibility_notes, created_at, updated_at"
        )
        .eq(
          "experience_id",
          experienceId
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (
      error ||
      !data
    ) {
      return null;
    }

    return {
      id: data.id,
      experienceId:
        data.experience_id,
      attendeeCount:
        data.attendee_count,
      status:
        data.status,
      attendingAlone:
        data.attending_alone,
      dietaryNotes:
        data.dietary_notes,
      accessibilityNotes:
        data.accessibility_notes,
      createdAt:
        data.created_at,
      updatedAt:
        data.updated_at
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { slug } =
    await params;

  const experience =
    await getCommunityExperienceBySlug(
      slug
    );

  return {
    title:
      experience
        ? `${experience.title} | Venture is Building`
        : "Venture Community",

    description:
      experience?.summary ??
      "A curated Winnipeg community experience by Venture."
  };
}

export default async function CommunityExperiencePage({
  params,
  searchParams
}: PageProps) {
  const [
    { slug },
    query
  ] =
    await Promise.all([
      params,
      searchParams
    ]);

  const experience =
    await getCommunityExperienceBySlug(
      slug
    );

  if (!experience) {
    notFound();
  }

  const rsvp =
    await currentRsvp(
      experience.id
    );

  const eventDate =
    formatDate(
      experience.startsAt,
      {
        weekday: "long",
        month: "long",
        day: "numeric"
      }
    );

  const eventTime =
    formatDate(
      experience.startsAt,
      {
        hour: "numeric",
        minute: "2-digit"
      }
    );

  const experienceHasStarted =
    new Date(
      experience.startsAt
    ).getTime() <=
      Date.now();

  const directionsUrl =
    meetingDirectionsUrl(
      experience.meetingPoint,
      experience.neighbourhood
    );

  const showDescription =
    Boolean(
      experience.description.trim()
    ) &&
    normalizeCopy(
      experience.description
    ) !==
      normalizeCopy(
        experience.summary
      );

  const activeRsvp =
    rsvp &&
    rsvp.status !== "cancelled"
      ? rsvp
      : null;

  const canLeaveFeedback =
    experienceHasStarted &&
    Boolean(
      activeRsvp &&
      (
        activeRsvp.status ===
          "attended" ||
        activeRsvp.status ===
          "confirmed"
      )
    );

  return (
    <main
      className={styles.detailPage}
    >
      <Link
        className={styles.backLink}
        href="/community"
      >
        <span aria-hidden="true">←</span>
        All community plans
      </Link>

      <section
        className={styles.detailHero}
      >
        {experience.heroImageUrl ? (
          <div
            className={styles.heroImage}
            style={{
              backgroundImage:
                `url("${experience.heroImageUrl.replaceAll(
                  '"',
                  "%22"
                )}")`
            }}
            role="img"
            aria-label={`Image for ${experience.title}`}
          />
        ) : (
          <div
            className={styles.heroPattern}
            aria-hidden="true"
          >
            <span>V</span>
            <span>B</span>
          </div>
        )}

        <div
          className={styles.heroContent}
        >
          <div
            className={styles.heroTopline}
          >
            <span>
              {experience.eyebrow}
            </span>

            <b>
              {experienceHasStarted
                ? "BUILT"
                : "MONTHLY"}
            </b>
          </div>

          <h1>{experience.title}</h1>

          <p>{experience.summary}</p>

          {showDescription ? (
            <p
              className={styles.heroDescription}
            >
              {experience.description}
            </p>
          ) : null}

          <div
            className={styles.heroQuickMeta}
          >
            <span>{eventDate}</span>
            <span>{eventTime}</span>
            <span>
              {experience.neighbourhood ??
                "Winnipeg"}
            </span>
          </div>

          {!experienceHasStarted ? (
            <a
              className={styles.heroCta}
              href="#rsvp"
            >
              {activeRsvp
                ? "View my RSVP"
                : experience.remainingSpots > 0
                  ? "Reserve a place"
                  : "Join the waitlist"}
              <b aria-hidden="true">↓</b>
            </a>
          ) : null}
        </div>
      </section>

      <section
        className={styles.stats}
        aria-label="Experience overview"
      >
        <article className={styles.stat}>
          <span>WHEN</span>
          <strong>{eventDate}</strong>
          <small>{eventTime}</small>
        </article>

        <article className={styles.stat}>
          <span>MEET</span>
          <strong>
            {experience.meetingPoint ??
              experience.neighbourhood ??
              "Winnipeg"}
          </strong>
          <small>
            {experience.neighbourhood ??
              "Final details in the plan"}
          </small>
        </article>

        <article className={styles.stat}>
          <span>EXPECTED SPEND</span>
          <strong>
            {costLabel(
              experience.estimatedCostMinCad,
              experience.estimatedCostMaxCad
            )}
          </strong>
          <small>
            Pay venues directly when needed
          </small>
        </article>

        <article className={styles.stat}>
          <span>GROUP</span>
          <strong>
            {experience.remainingSpots > 0
              ? `${experience.remainingSpots} spaces left`
              : "Waitlist open"}
          </strong>
          <small>
            Up to {experience.capacity} people
          </small>
        </article>
      </section>

      <div
        className={styles.experienceLayout}
      >
        <div className={styles.mainColumn}>
          <section
            className={`${styles.panel} ${styles.panelYellow}`}
          >
            <header>
              <span>THE FULL PLAN</span>
              <h2>
                A clear route through the day
              </h2>
              <p>
                Venture has arranged the stops so
                the group can move together without
                turning the day into a logistics exam.
              </p>
            </header>

            {experience.stops.length > 0 ? (
              <div
                className={styles.timeline}
              >
                {experience.stops.map(
                  (stop, index) => (
                    <article
                      className={styles.stop}
                      key={stop.id}
                    >
                      <div
                        className={styles.stopMarker}
                        aria-hidden="true"
                      >
                        {index + 1}
                      </div>

                      <div
                        className={styles.stopBody}
                      >
                        <div
                          className={styles.stopHeading}
                        >
                          <div>
                            <small>
                              {timeRange(
                                stop.startsAt,
                                stop.endsAt
                              )}
                            </small>
                            <strong>
                              {stop.listingName}
                            </strong>
                          </div>

                          {stop.joinableSeparately ? (
                            <span>
                              Join here
                            </span>
                          ) : null}
                        </div>

                        {stop.neighbourhood ? (
                          <p
                            className={styles.stopLocation}
                          >
                            {stop.neighbourhood}
                          </p>
                        ) : null}

                        {stop.notes ? (
                          <p>{stop.notes}</p>
                        ) : null}

                        {stop.listingSlug ? (
                          <Link
                            href={`/listings/${stop.listingSlug}`}
                          >
                            View this stop
                            <span aria-hidden="true">↗</span>
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  )
                )}
              </div>
            ) : (
              <p>
                Venture is still finalizing the
                stops. The complete itinerary will
                appear here before RSVP opens.
              </p>
            )}
          </section>

          <section
            className={`${styles.panel} ${styles.panelPink}`}
          >
            <header>
              <span>WHAT IT FEELS LIKE</span>
              <h2>
                Know what you are walking into
              </h2>
            </header>

            {experience.socialVibe.length > 0 ? (
              <div className={styles.vibes}>
                {experience.socialVibe.map(
                  (vibe) => (
                    <span key={vibe}>
                      {vibe}
                    </span>
                  )
                )}
              </div>
            ) : null}

            <div className={styles.detailList}>
              {experience.hostName ? (
                <article>
                  <span>HOST</span>
                  <strong>
                    {experience.hostName}
                  </strong>
                  {experience.hostDescription ? (
                    <p>
                      {experience.hostDescription}
                    </p>
                  ) : null}
                </article>
              ) : null}

              {experience.whatToBring ? (
                <article>
                  <span>BRING</span>
                  <p>
                    {experience.whatToBring}
                  </p>
                </article>
              ) : null}

              {experience.accessibilityNotes ? (
                <article>
                  <span>ACCESSIBILITY</span>
                  <p>
                    {experience.accessibilityNotes}
                  </p>
                </article>
              ) : null}

              {experience.dietaryNotes ? (
                <article>
                  <span>FOOD NOTES</span>
                  <p>
                    {experience.dietaryNotes}
                  </p>
                </article>
              ) : null}

              {experience.minimumAge !== null ? (
                <article>
                  <span>AGE</span>
                  <strong>
                    {experience.minimumAge}+
                  </strong>
                </article>
              ) : null}
            </div>
          </section>
        </div>

        <aside
          className={styles.rsvpColumn}
        >
          <section
            id="rsvp"
            className={`${styles.panel} ${styles.panelGreen} ${styles.rsvpPanel}`}
          >
            <header>
              <span>JOIN THE EXPERIENCE</span>
              <h2>
                Come alone or bring one person
              </h2>
            </header>

            <p className={styles.noPayment}>
              RSVP is free. Venture is not
              processing payments. Any optional
              venue costs are paid directly to the
              venue.
            </p>

            {query.rsvp ? (
              <div
                className={styles.statusMessage}
                role="status"
              >
                {query.rsvp === "waitlisted"
                  ? "You are on the waitlist. Venture will keep your place in line."
                  : query.rsvp === "cancelled"
                    ? "Your RSVP has been cancelled."
                    : "Your space is confirmed. The plan now lives in your Venture profile."}
              </div>
            ) : null}

            {query.error ? (
              <div
                className={styles.errorMessage}
                role="alert"
              >
                {query.error}
              </div>
            ) : null}

            {experienceHasStarted ? (
              <div
                className={styles.finishedCard}
              >
                <span>THIS BUILD HAS FINISHED</span>
                <strong>
                  The route remains here as a record
                  of the experience.
                </strong>
                <p>
                  Venture will publish the next
                  monthly build when the plan is
                  ready.
                </p>
                <Link href="/community">
                  See community plans
                </Link>
              </div>
            ) : activeRsvp ? (
              <div
                className={styles.rsvpStatusCard}
                data-status={activeRsvp.status}
              >
                <span>YOUR VENTURE PLAN</span>

                <h3>
                  {activeRsvp.status === "waitlisted"
                    ? "You are on the waitlist"
                    : activeRsvp.status === "attended"
                      ? "You checked in"
                      : "Your space is confirmed"}
                </h3>

                <p>
                  This RSVP covers{" "}
                  {activeRsvp.attendeeCount}{" "}
                  {activeRsvp.attendeeCount === 1
                    ? "person"
                    : "people"}.
                  {activeRsvp.status === "waitlisted"
                    ? " Venture will contact you when a space opens."
                    : " Add it to your calendar and the plan is officially harder to forget."}
                </p>

                <div
                  className={styles.rsvpTools}
                >
                  <a
                    href={`/community/${experience.slug}/calendar`}
                  >
                    Add to calendar
                  </a>

                  {directionsUrl ? (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Meeting directions
                    </a>
                  ) : null}
                </div>

                {experience.meetingInstructions ? (
                  <div
                    className={styles.meetingNote}
                  >
                    <span>MEETING NOTE</span>
                    <p>
                      {experience.meetingInstructions}
                    </p>
                  </div>
                ) : null}

                <details
                  className={styles.rsvpManage}
                >
                  <summary>
                    Manage RSVP
                  </summary>

                  <form
                    action={cancelCommunityRsvp}
                  >
                    <input
                      type="hidden"
                      name="experienceId"
                      value={experience.id}
                    />

                    <input
                      type="hidden"
                      name="slug"
                      value={experience.slug}
                    />

                    <button
                      className={styles.cancelButton}
                      type="submit"
                    >
                      Cancel my RSVP
                    </button>
                  </form>
                </details>
              </div>
            ) : (
              <form
                className={styles.rsvpForm}
                action={joinCommunityExperience}
              >
                <input
                  type="hidden"
                  name="experienceId"
                  value={experience.id}
                />

                <input
                  type="hidden"
                  name="slug"
                  value={experience.slug}
                />

                <label>
                  People on this RSVP

                  <select
                    name="attendeeCount"
                    defaultValue="1"
                  >
                    <option value="1">
                      Just me
                    </option>

                    <option value="2">
                      Me and one guest
                    </option>
                  </select>
                </label>

                <label
                  className={styles.checkRow}
                >
                  <input
                    type="checkbox"
                    name="attendingAlone"
                    defaultChecked
                  />

                  I am arriving without an
                  existing group.
                </label>

                <details
                  className={styles.optionalDetails}
                >
                  <summary>
                    Dietary or accessibility notes
                  </summary>

                  <div>
                    <label>
                      Dietary notes
                      <textarea
                        name="dietaryNotes"
                        maxLength={500}
                        placeholder="Optional"
                      />
                    </label>

                    <label>
                      Accessibility notes
                      <textarea
                        name="accessibilityNotes"
                        maxLength={500}
                        placeholder="Optional and private to the Venture team"
                      />
                    </label>
                  </div>
                </details>

                <label
                  className={styles.checkRow}
                >
                  <input
                    type="checkbox"
                    name="guidelinesAgreed"
                    required
                  />

                  <span>
                    I agree to the{" "}
                    <Link
                      className={styles.guidelines}
                      href="/community/guidelines"
                    >
                      Venture community guidelines
                    </Link>
                    .
                  </span>
                </label>

                <button
                  className={styles.rsvpButton}
                  type="submit"
                >
                  {experience.remainingSpots > 0
                    ? "Reserve my space"
                    : "Join the waitlist"}
                </button>
              </form>
            )}
          </section>
        </aside>
      </div>

      {canLeaveFeedback ? (
        <CommunityExperienceFeedback
          experienceTitle={experience.title}
          slug={experience.slug}
        />
      ) : null}
    </main>
  );
}
