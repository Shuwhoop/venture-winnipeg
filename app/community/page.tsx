import type {
  Metadata
} from "next";

import Link from "next/link";

import {
  getPublicCommunityExperiences
} from "@/lib/community";

import styles from "./community.module.css";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "Venture is Building | Winnipeg Community",
  description:
    "Monthly curated Winnipeg experiences designed by Venture for people to explore, participate, and meet in public places."
};

function formatExperienceDate(
  startsAt: string
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
    new Date(startsAt)
  );
}

function shortDate(
  startsAt: string
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Winnipeg",
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  ).format(
    new Date(startsAt)
  );
}

function costLabel(
  minimum: number | null,
  maximum: number | null
): string {
  if (
    minimum === null &&
    maximum === null
  ) {
    return "Cost details coming";
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

export default async function CommunityPage() {
  const experiences =
    await getPublicCommunityExperiences();

  const upcoming =
    experiences
      .filter(
        (experience) =>
          experience.status ===
            "published" &&
          new Date(
            experience.startsAt
          ).getTime() >
            Date.now()
      )
      .sort(
        (left, right) =>
          new Date(
            left.startsAt
          ).getTime() -
          new Date(
            right.startsAt
          ).getTime()
      );

  const past =
    experiences
      .filter(
        (experience) =>
          experience.status ===
            "completed" ||
          new Date(
            experience.startsAt
          ).getTime() <=
            Date.now()
      )
      .sort(
        (left, right) =>
          new Date(
            right.startsAt
          ).getTime() -
          new Date(
            left.startsAt
          ).getTime()
      )
      .slice(0, 8);

  const featured =
    upcoming[0] ?? null;

  return (
    <main className={styles.page}>
      <section
        className={styles.communityIntro}
      >
        <span>VENTURE IS BUILDING</span>
        <h1>
          One intentional Winnipeg plan each
          month.
        </h1>
        <p>
          Venture chooses the places, connects
          the route, and creates an easy reason
          for people to arrive, take part, and
          meet without needing an existing group.
        </p>

        <div className={styles.howItWorks}>
          <article>
            <b>1</b>
            <div>
              <strong>See the build</strong>
              <small>
                Know the route, cost, and vibe.
              </small>
            </div>
          </article>

          <article>
            <b>2</b>
            <div>
              <strong>Reserve a place</strong>
              <small>
                Come alone or bring one person.
              </small>
            </div>
          </article>

          <article>
            <b>3</b>
            <div>
              <strong>Show up together</strong>
              <small>
                Venture handles the shared plan.
              </small>
            </div>
          </article>
        </div>
      </section>

      {featured ? (
        <section
          className={styles.hero}
        >
          {featured.heroImageUrl ? (
            <div
              className={styles.heroPhoto}
              style={{
                backgroundImage:
                  `url("${featured.heroImageUrl.replaceAll(
                    '"',
                    "%22"
                  )}")`
              }}
              role="img"
              aria-label={`Image for ${featured.title}`}
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

          <div className={styles.heroBody}>
            <div className={styles.heroLabel}>
              <p className={styles.eyebrow}>
                {featured.eyebrow}
              </p>
              <b>THIS MONTH</b>
            </div>

            <h2>{featured.title}</h2>

            <p>{featured.summary}</p>

            {featured.stops.length > 0 ? (
              <ol
                className={styles.routePreview}
                aria-label="Experience route preview"
              >
                {featured.stops
                  .slice(0, 3)
                  .map(
                    (stop, index) => (
                      <li key={stop.id}>
                        <b>{index + 1}</b>
                        <span>
                          {stop.listingName}
                        </span>
                      </li>
                    )
                  )}

                {featured.stops.length > 3 ? (
                  <li>
                    <b>+</b>
                    <span>
                      {featured.stops.length - 3}{" "}
                      more
                    </span>
                  </li>
                ) : null}
              </ol>
            ) : null}

            <div
              className={styles.heroMeta}
            >
              <span>
                {formatExperienceDate(
                  featured.startsAt
                )}
              </span>

              <span>
                {featured.neighbourhood ??
                  "Winnipeg"}
              </span>

              <span>
                {featured.remainingSpots > 0
                  ? `${featured.remainingSpots} spaces left`
                  : "Waitlist open"}
              </span>
            </div>

            <Link
              className={styles.heroLink}
              href={`/community/${featured.slug}`}
            >
              Open the full experience
              <b aria-hidden="true">→</b>
            </Link>
          </div>
        </section>
      ) : (
        <section
          className={styles.emptyHero}
        >
          <p className={styles.eyebrow}>
            NEXT BUILD IN PROGRESS
          </p>

          <h2>
            A new Winnipeg experience is taking
            shape.
          </h2>

          <p>
            Venture is choosing the stops and
            shaping the route. The complete plan
            will appear here when it is ready to
            join.
          </p>
        </section>
      )}

      {upcoming.length > 1 ? (
        <section className={styles.section}>
          <header
            className={styles.sectionHeader}
          >
            <span>COMING UP</span>
            <h2>
              More community plans
            </h2>
          </header>

          <div
            className={styles.experienceGrid}
          >
            {upcoming
              .slice(1)
              .map(
                (experience) => (
                  <Link
                    className={styles.experienceCard}
                    href={`/community/${experience.slug}`}
                    key={experience.id}
                  >
                    <div
                      className={styles.cardTopline}
                    >
                      <small>
                        {shortDate(
                          experience.startsAt
                        )}
                      </small>
                      <b>
                        {experience.stops.length}{" "}
                        {experience.stops.length === 1
                          ? "stop"
                          : "stops"}
                      </b>
                    </div>

                    <h3>{experience.title}</h3>
                    <p>{experience.summary}</p>

                    <div
                      className={styles.cardMeta}
                    >
                      <span>
                        {experience.neighbourhood ??
                          "Winnipeg"}
                      </span>
                      <span>
                        {costLabel(
                          experience.estimatedCostMinCad,
                          experience.estimatedCostMaxCad
                        )}
                      </span>
                      <span>
                        {experience.remainingSpots > 0
                          ? `${experience.remainingSpots} spaces`
                          : "Waitlist"}
                      </span>
                    </div>
                  </Link>
                )
              )}
          </div>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className={styles.section}>
          <header
            className={styles.sectionHeader}
          >
            <span>PAST BUILDS</span>
            <h2>
              Experiences Venture has brought
              together
            </h2>
          </header>

          <div
            className={styles.pastGrid}
          >
            {past.map(
              (experience) => (
                <Link
                  className={styles.pastCard}
                  href={`/community/${experience.slug}`}
                  key={experience.id}
                >
                  <div>
                    <small>
                      {shortDate(
                        experience.startsAt
                      )}
                    </small>
                    <strong>
                      {experience.title}
                    </strong>
                    <p>
                      {experience.neighbourhood ??
                        "Winnipeg"}
                    </p>
                  </div>
                  <span aria-hidden="true">↗</span>
                </Link>
              )
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
