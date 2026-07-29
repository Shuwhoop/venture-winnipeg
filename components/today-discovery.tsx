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

import styles from "./today-discovery.module.css";

type TodayDiscoveryProps = {
  events: Listing[];
  places: Listing[];
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
        style={
          listing.imageUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(20, 16, 18, 0.08), rgba(20, 16, 18, 0.34)), url("${listing.imageUrl.replaceAll('"', '%22')}")`
              }
            : undefined
        }
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
          style={
            listing.imageUrl
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(20, 16, 18, 0.08), rgba(20, 16, 18, 0.52)), url("${listing.imageUrl.replaceAll('"', '%22')}")`
                }
              : undefined
          }
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
              {!["hours not confirmed", "hours unknown"].includes(
                listing.timeOrHours.trim().toLowerCase()
              ) ? (
                <>
                  {" · "}
                  {listing.timeOrHours}
                </>
              ) : null}
            </p>

            <div
              className={
                listing.price === "Price unavailable"
                  ? styles.featuredActionsNoPrice
                  : undefined
              }
            >
              {listing.price !== "Price unavailable" ? (
                <span>{listing.price}</span>
              ) : null}
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
  places
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

      {featured ? (
        <FeaturedListing listing={featured} />
      ) : null}

      <section className={styles.builderCard}>
        <div className={styles.builderStamp}>
          BUILT FOR YOU
        </div>

        <div className={styles.builderCopy}>
          <span>VENTURE BUILDER</span>
          <h2>
            One tap from
            <em> “what do we do?” </em>
            to a full plan.
          </h2>
          <p>
            Choose the mood, budget and timing.
            Venture builds the route, then you can
            drag, replace or remove every stop.
          </p>

          <div className={styles.builderActions}>
            <Link href="/build-outing">
              Build my outing
              <b aria-hidden="true">→</b>
            </Link>

            <Link href="/explore">
              Browse first
            </Link>
          </div>
        </div>

        <div
          className={styles.routeIllustration}
          aria-hidden="true"
        >
          <span>1</span>
          <i />
          <span>2</span>
          <i />
          <span>3</span>
          <b>GO!</b>
        </div>
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
