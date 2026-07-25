"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties
} from "react";

import Link from "next/link";

import {
  SaveButton
} from "@/components/save-button";

import {
  getEventOccurrenceKey,
  getVisitHistory,
  getVisitHistoryStats,
  VISIT_HISTORY_EVENT,
  visitListingKey
} from "@/lib/visit-history";

import type {
  Listing
} from "@/lib/types";

import type {
  CommunityExperience
} from "@/lib/community-types";

import styles from "./today-discovery.module.css";

type TodayDiscoveryProps = {
  events: Listing[];
  places: Listing[];
  community: CommunityExperience | null;
};

function getDaypart() {
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Winnipeg",
      hour: "2-digit",
      hourCycle: "h23"
    }).format(now)
  );

  const dateLabel = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Winnipeg",
      weekday: "long",
      month: "short",
      day: "numeric"
    }
  ).format(now);

  if (hour < 12) {
    return {
      greeting: "Good morning",
      prompt: "Winnipeg is warming up. Pick your first move.",
      dateLabel
    };
  }

  if (hour < 17) {
    return {
      greeting: "Good afternoon",
      prompt: "There is still plenty of city left to spend.",
      dateLabel
    };
  }

  return {
    greeting: "Good evening",
    prompt: "The city is awake. Let’s find your next story.",
    dateLabel
  };
}

function listingIsVisited(
  listing: Listing,
  visits: ReturnType<
    typeof getVisitHistory
  >
) {
  const key = visitListingKey(listing);

  if (listing.type === "restaurant") {
    return visits.some(
      (visit) =>
        visit.listingKey === key
    );
  }

  const occurrence =
    getEventOccurrenceKey(listing);

  return visits.some(
    (visit) =>
      visit.listingKey === key &&
      (
        !occurrence ||
        !visit.eventOccurrenceKey ||
        visit.eventOccurrenceKey ===
          occurrence
      )
  );
}

function isTonightListing(
  listing: Listing
) {
  if (listing.type === "restaurant") {
    return listing.isOpenNow === true;
  }

  return (
    listing.statusLabel === "TODAY" ||
    listing.statusLabel === "HAPPENING"
  );
}

function getListingHref(
  listing: Listing
) {
  return `/listings/${listing.slug}`;
}

function CompactListingCard({
  listing,
  newToUser = false,
  index
}: {
  listing: Listing;
  newToUser?: boolean;
  index: number;
}) {
  return (
    <article
      className={styles.listingCard}
      style={{
        "--card-index": index
      } as CSSProperties}
    >
      <Link
        className={styles.cardLink}
        href={getListingHref(listing)}
        aria-label={`View ${listing.name}`}
      />

      <div
        className={`listing-image ${listing.imageClass} ${styles.cardVisual}`}
      >
        <span
          className={`${styles.status} ${
            listing.statusTone === "green"
              ? styles.statusGreen
              : ""
          }`}
        >
          {newToUser
            ? "NEW TO YOU"
            : listing.statusLabel}
        </span>

        <SaveButton listing={listing} />
      </div>

      <div className={styles.cardBody}>
        <small>{listing.category}</small>
        <h3>{listing.name}</h3>

        <p>
          {listing.neighbourhood}
          {" · "}
          {listing.price}
        </p>

        <div>
          <span>{listing.timeOrHours}</span>
          <b aria-hidden="true">↗</b>
        </div>
      </div>
    </article>
  );
}

function ListingRail({
  title,
  eyebrow,
  listings,
  href,
  newToUser = false,
  emptyCopy,
  tone = "yellow"
}: {
  title: string;
  eyebrow: string;
  listings: Listing[];
  href: string;
  newToUser?: boolean;
  emptyCopy: string;
  tone?: "yellow" | "red" | "pink";
}) {
  return (
    <section
      className={`${styles.railSection} ${styles[`rail${tone[0].toUpperCase()}${tone.slice(1)}`]}`}
    >
      <header className={styles.sectionHeader}>
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>

        <Link href={href}>
          See all
          <b aria-hidden="true">→</b>
        </Link>
      </header>

      {listings.length > 0 ? (
        <div className={styles.cardRail}>
          {listings.map((listing, index) => (
            <CompactListingCard
              key={`${listing.type}-${listing.id}`}
              listing={listing}
              newToUser={newToUser}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyRail}>
          <span aria-hidden="true">✦</span>
          <p>{emptyCopy}</p>
          <Link href={href}>Explore more</Link>
        </div>
      )}
    </section>
  );
}

function FeaturedListing({
  listing
}: {
  listing: Listing;
}) {
  return (
    <section className={styles.featuredWrap}>
      <header className={styles.featuredLabel}>
        <span>VENTURE PICK</span>
        <i aria-hidden="true" />
        <p>One strong place to start</p>
      </header>

      <article className={styles.featuredCard}>
        <Link
          className={styles.featuredLink}
          href={getListingHref(listing)}
          aria-label={`View Venture pick: ${listing.name}`}
        />

        <div
          className={`listing-image ${listing.imageClass} ${styles.featuredVisual}`}
        >
          <div className={styles.featuredTopline}>
            <span>{listing.statusLabel}</span>
            <SaveButton listing={listing} />
          </div>

          <div className={styles.featuredCopy}>
            <small>{listing.category}</small>
            <h2>{listing.name}</h2>
            <p>
              {listing.neighbourhood}
              {" · "}
              {listing.timeOrHours}
            </p>

            <div>
              <span>{listing.price}</span>
              <b>
                Take a look
                <i aria-hidden="true">↗</i>
              </b>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

export function TodayDiscovery({
  events,
  places,
  community
}: TodayDiscoveryProps) {
  const [visitVersion, setVisitVersion] =
    useState(0);
  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    function refresh() {
      setVisitVersion(
        (current) => current + 1
      );
    }

    setReady(true);
    refresh();

    window.addEventListener(
      VISIT_HISTORY_EVENT,
      refresh
    );
    window.addEventListener(
      "storage",
      refresh
    );

    return () => {
      window.removeEventListener(
        VISIT_HISTORY_EVENT,
        refresh
      );
      window.removeEventListener(
        "storage",
        refresh
      );
    };
  }, []);

  const allListings = useMemo(
    () => [...events, ...places],
    [events, places]
  );

  const visitData = useMemo(() => {
    if (!ready) {
      return {
        visits: [],
        stats: {
          totalVisits: 0,
          uniquePlaces: 0,
          uniqueEvents: 0,
          neighbourhoodsExplored: 0,
          newThisMonth: 0
        }
      };
    }

    const visits = getVisitHistory();

    return {
      visits,
      stats: getVisitHistoryStats(visits)
    };
  }, [ready, visitVersion]);

  const tonight = useMemo(
    () =>
      allListings
        .filter(isTonightListing)
        .slice(0, 5),
    [allListings]
  );

  const newToUser = useMemo(
    () =>
      allListings
        .filter(
          (listing) =>
            !listingIsVisited(
              listing,
              visitData.visits
            )
        )
        .slice(0, 5),
    [allListings, visitData.visits]
  );

  const openNow = useMemo(
    () =>
      places
        .filter(
          (listing) =>
            listing.isOpenNow === true
        )
        .slice(0, 5),
    [places]
  );

  const featured =
    tonight[0] ??
    newToUser[0] ??
    allListings[0];

  const daypart = useMemo(
    getDaypart,
    []
  );

  return (
    <main className={styles.page}>
      <div
        className={styles.cityTicker}
        aria-hidden="true"
      >
        <div>
          <span>WINNIPEG IS MOVING</span>
          <i>✦</i>
          <span>FOOD</span>
          <i>✦</i>
          <span>EVENTS</span>
          <i>✦</i>
          <span>ACTIVITIES</span>
          <i>✦</i>
          <span>OUTINGS</span>
          <i>✦</i>
          <span>NEW TO YOU</span>
          <i>✦</i>
          <span>WINNIPEG IS MOVING</span>
        </div>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroShapes} aria-hidden="true">
          <i />
          <b />
          <span />
        </div>

        <div className={styles.heroMeta}>
          <span>WINNIPEG · {daypart.dateLabel}</span>
          <i>
            <b />
            LIVE
          </i>
        </div>

        <div className={styles.heroCopy}>
          <h1>{daypart.greeting}</h1>
          <p>{daypart.prompt}</p>
        </div>

        <form
          action="/explore"
          className={styles.search}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6" />
            <path d="M16 16 21 21" />
          </svg>

          <input
            name="q"
            aria-label="Search Winnipeg"
            placeholder="Try “cheap food somewhere new”"
            autoComplete="off"
          />

          <button type="submit">
            Go
            <span aria-hidden="true">↗</span>
          </button>
        </form>
      </section>

      <section className={styles.catalogueSection}>
        <header>
          <div>
            <span>THE CITY CATALOGUE</span>
            <h2>What are you looking for?</h2>
          </div>

          <Link href="/explore">
            Browse all
            <b aria-hidden="true">→</b>
          </Link>
        </header>

        <nav
          className={styles.catalogueRail}
          aria-label="Browse Venture categories"
        >
          <Link
            className={`${styles.catalogueCard} ${styles.catalogueEvents}`}
            href="/explore?filter=events"
          >
            <div className={styles.catalogueCardTop}>
              <span className={styles.catalogueIcon}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect
                    x="4"
                    y="5"
                    width="16"
                    height="15"
                    rx="3"
                  />
                  <path d="M8 3v4M16 3v4M4 10h16" />
                  <path d="M8 14h3M13 14h3M8 17h3" />
                </svg>
              </span>

              <span
                className={styles.catalogueArrow}
                aria-hidden="true"
              >
                ↗
              </span>
            </div>

            <div className={styles.catalogueCopy}>
              <small>HAPPENING NOW</small>
              <strong>Events</strong>
              <p>
                Concerts, markets, festivals and
                things worth showing up for.
              </p>
            </div>
          </Link>

          <Link
            className={`${styles.catalogueCard} ${styles.catalogueFood}`}
            href="/explore?filter=food"
          >
            <div className={styles.catalogueCardTop}>
              <span className={styles.catalogueIcon}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M7 3v7M4 3v4c0 2 1 3 3 3s3-1 3-3V3" />
                  <path d="M7 10v11" />
                  <path d="M16 3v18" />
                  <path d="M16 3c3 2 4 5 4 8h-4" />
                </svg>
              </span>

              <span
                className={styles.catalogueArrow}
                aria-hidden="true"
              >
                ↗
              </span>
            </div>

            <div className={styles.catalogueCopy}>
              <small>GOOD EATS</small>
              <strong>Food &amp; Drink</strong>
              <p>
                Restaurants, cafés, bars and local
                places worth trying.
              </p>
            </div>
          </Link>

          <Link
            className={`${styles.catalogueCard} ${styles.catalogueActivities}`}
            href="/explore?filter=activities"
          >
            <div className={styles.catalogueCardTop}>
              <span className={styles.catalogueIcon}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 8h8a5 5 0 0 1 5 5v2a3 3 0 0 1-5 2l-2-2h-4l-2 2a3 3 0 0 1-5-2v-2a5 5 0 0 1 5-5Z" />
                  <path d="M7 12h4M9 10v4" />
                  <circle cx="16.5" cy="11.5" r="1" />
                  <circle cx="18.5" cy="13.5" r="1" />
                </svg>
              </span>

              <span
                className={styles.catalogueArrow}
                aria-hidden="true"
              >
                ↗
              </span>
            </div>

            <div className={styles.catalogueCopy}>
              <small>GO DO SOMETHING</small>
              <strong>Activities</strong>
              <p>
                Escape rooms, games, axe throwing
                and hands-on experiences.
              </p>
            </div>
          </Link>

          <Link
            className={`${styles.catalogueCard} ${styles.catalogueNightlife}`}
            href="/explore?filter=nightlife"
          >
            <div className={styles.catalogueCardTop}>
              <span className={styles.catalogueIcon}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />
                  <path d="m17 4 .5 1.5L19 6l-1.5.5L17 8l-.5-1.5L15 6l1.5-.5Z" />
                </svg>
              </span>

              <span
                className={styles.catalogueArrow}
                aria-hidden="true"
              >
                ↗
              </span>
            </div>

            <div className={styles.catalogueCopy}>
              <small>AFTER DARK</small>
              <strong>Nightlife</strong>
              <p>
                Bars, lounges, dance floors and
                Winnipeg after hours.
              </p>
            </div>
          </Link>
        </nav>
      </section>

      



      {community ? (
        <section className={styles.communityFeature}>
          <div className={styles.communityFeatureTop}>
            <div>
              <span>VENTURE IS BUILDING</span>
              <small>ONE COMMUNITY PLAN THIS MONTH</small>
            </div>

            <b aria-hidden="true">MONTHLY</b>
          </div>

          <h2>{community.title}</h2>

          <p>{community.summary}</p>

          {community.stops.length > 0 ? (
            <ol
              className={styles.communityFeatureRoute}
              aria-label="Community experience route preview"
            >
              {community.stops
                .slice(0, 3)
                .map((stop, index) => (
                  <li key={stop.id}>
                    <b>{index + 1}</b>
                    <span>{stop.listingName}</span>
                  </li>
                ))}
            </ol>
          ) : null}

          <div className={styles.communityFeatureMeta}>
            <span>
              {new Intl.DateTimeFormat(
                "en-CA",
                {
                  timeZone: "America/Winnipeg",
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit"
                }
              ).format(
                new Date(
                  community.startsAt
                )
              )}
            </span>

            <span>
              {community.neighbourhood ??
                "Winnipeg"}
            </span>

            <span>
              {community.remainingSpots > 0
                ? `${community.remainingSpots} spaces left`
                : "Waitlist open"}
            </span>
          </div>

          <Link
            className={styles.communityFeatureLink}
            href={`/community/${community.slug}`}
          >
            Open this month’s experience
            <b aria-hidden="true">→</b>
          </Link>
        </section>
      ) : null}

      {featured ? (
        <FeaturedListing listing={featured} />
      ) : null}

      <section className={styles.planningNudge}>
        <div>
          <span>NEED A FULL PLAN?</span>
          <strong>Choose any listing, then build around it.</strong>
          <p>
            Fixed-time events stay anchored while Venture adds food,
            activities, or another stop before and after.
          </p>
        </div>

        <Link href="/build-outing">
          Build an outing
          <b aria-hidden="true">＋</b>
        </Link>
      </section>

      {visitData.stats.totalVisits > 0 ? (
        <Link
          className={styles.progressCard}
          href="/profile#my-venture"
        >
          <div className={styles.progressIcon}>
            <span>✓</span>
          </div>

          <div>
            <span>YOUR CITY SO FAR</span>
            <strong>
              {visitData.stats.totalVisits}
              {" "}
              {visitData.stats.totalVisits === 1
                ? "visit logged"
                : "visits logged"}
            </strong>
            <p>
              {visitData.stats.neighbourhoodsExplored}
              {" "}
              {visitData.stats.neighbourhoodsExplored === 1
                ? "neighbourhood"
                : "neighbourhoods"}
              {" explored"}
            </p>
          </div>

          <b aria-hidden="true">→</b>
        </Link>
      ) : null}

      <ListingRail
        eyebrow="THE SHORTLIST"
        title="Tonight in Winnipeg"
        listings={tonight}
        href="/explore?when=tonight"
        emptyCopy="No live matches are ready yet. Browse the full city instead."
        tone="red"
      />

      <ListingRail
        eyebrow="YOUR UNEXPLORED CITY"
        title="Fresh territory"
        listings={newToUser}
        href="/explore?new=1"
        newToUser
        emptyCopy="You have reached the edge of the current catalogue. Fresh listings are on the way."
        tone="yellow"
      />

      <ListingRail
        eyebrow="WALK IN NOW"
        title="Open right now"
        listings={openNow}
        href="/explore?when=open"
        emptyCopy="Opening-hour data is still being confirmed for current listings."
        tone="pink"
      />
    </main>
  );
}
