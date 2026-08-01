"use client";

import Link from "next/link";
import { useMemo, type CSSProperties } from "react";

import { SaveButton } from "@/components/save-button";
import type { Listing } from "@/lib/types";

import styles from "./today-discovery.module.css";

type TodayDiscoveryProps = {
  events: Listing[];
  places: Listing[];
};

type ListingWithImage = Listing & {
  imageUrl?: string | null;
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

  const dateLabel = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Winnipeg",
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(now);

  if (hour < 12) {
    return {
      greeting: "Good morning",
      dateLabel
    };
  }

  if (hour < 17) {
    return {
      greeting: "Good afternoon",
      dateLabel
    };
  }

  return {
    greeting: "Good evening",
    dateLabel
  };
}

function getListingHref(listing: Listing) {
  return `/listings/${listing.slug}`;
}

function getImageStyle(listing: Listing): CSSProperties | undefined {
  const imageUrl = (listing as ListingWithImage).imageUrl?.trim();

  if (!imageUrl) {
    return undefined;
  }

  const safeUrl = imageUrl.replace(/["\\\n\r]/g, "");

  return {
    backgroundImage: `url("${safeUrl}")`
  };
}

function isPlaceholder(value?: string | null) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();

  return [
    "price unavailable",
    "hours not confirmed",
    "hours unknown",
    "unknown",
    "not confirmed",
    "unavailable"
  ].includes(normalized);
}

function getPlaceLine(listing: Listing) {
  return [
    listing.neighbourhood,
    !isPlaceholder(listing.timeOrHours)
      ? listing.timeOrHours
      : null
  ]
    .filter(Boolean)
    .join(" · ");
}

function getSmallCardLine(listing: Listing) {
  if (!isPlaceholder(listing.timeOrHours)) {
    return listing.timeOrHours;
  }

  return listing.neighbourhood;
}

function isHappeningNow(listing: Listing) {
  if (listing.type === "restaurant") {
    return listing.isOpenNow === true;
  }

  const status = listing.statusLabel.trim().toUpperCase();

  return status === "TODAY" || status === "HAPPENING" || status === "LIVE";
}

function hasPhoto(listing: Listing) {
  return Boolean((listing as ListingWithImage).imageUrl?.trim());
}

function SectionHeading({
  title,
  href
}: {
  title: string;
  href: string;
}) {
  return (
    <header className={styles.sectionHeading}>
      <h2>{title}</h2>
      <i aria-hidden="true" />
      <Link href={href}>See all</Link>
    </header>
  );
}

function FeaturedCard({
  listing
}: {
  listing: Listing;
}) {
  const status = listing.isOpenNow === true
    ? "OPEN NOW"
    : listing.statusLabel;

  return (
    <section className={styles.featuredSection}>
      <header className={styles.pickHeading}>
        <span>VENTURE PICK</span>
        <i aria-hidden="true" />
        <p>One strong place to start</p>
      </header>

      <article className={styles.featuredCard}>
        <Link
          className={styles.cardLink}
          href={getListingHref(listing)}
          aria-label={`View ${listing.name}`}
        />

        <div
          className={`listing-image ${listing.imageClass} ${styles.featuredImage}`}
          style={getImageStyle(listing)}
        >
          <div className={styles.featuredShade} />

          <div className={styles.featuredTopline}>
            <div>
              <span>{status}</span>
              <small>{listing.category}</small>
            </div>

            <SaveButton
              listing={listing}
              className={styles.featuredSave}
            />
          </div>

          <div className={styles.featuredCopy}>
            <h2>{listing.name}</h2>
            <p>{getPlaceLine(listing)}</p>

            {!isPlaceholder(listing.price) ? (
              <span className={styles.priceBadge}>
                {listing.price}
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}

function MiniCard({
  listing
}: {
  listing: Listing;
}) {
  return (
    <article className={styles.miniCard}>
      <Link
        className={styles.cardLink}
        href={getListingHref(listing)}
        aria-label={`View ${listing.name}`}
      />

      <div
        className={`listing-image ${listing.imageClass} ${styles.miniImage}`}
        style={getImageStyle(listing)}
      >
        <div className={styles.miniShade} />

        <SaveButton
          listing={listing}
          className={styles.miniSave}
        />

        <div className={styles.miniCopy}>
          <span>{listing.category}</span>
          <h3>{listing.name}</h3>
          <p>{getSmallCardLine(listing)}</p>
        </div>
      </div>
    </article>
  );
}

function TrendCard({
  listing
}: {
  listing: Listing;
}) {
  return (
    <article className={styles.trendCard}>
      <Link
        className={styles.cardLink}
        href={getListingHref(listing)}
        aria-label={`View ${listing.name}`}
      />

      <div
        className={`listing-image ${listing.imageClass} ${styles.trendImage}`}
        style={getImageStyle(listing)}
      >
        <SaveButton
          listing={listing}
          className={styles.trendSave}
        />
      </div>

      <div className={styles.trendCopy}>
        <span>{listing.category}</span>
        <h3>{listing.name}</h3>
        <p>{listing.neighbourhood}</p>
      </div>
    </article>
  );
}

export function TodayDiscovery({
  events,
  places
}: TodayDiscoveryProps) {
  const daypart = useMemo(getDaypart, []);

  const allListings = useMemo(
    () => [...places, ...events],
    [events, places]
  );

  const featured = useMemo(() => {
    return (
      places.find(
        (listing) =>
          listing.isOpenNow === true && hasPhoto(listing)
      ) ??
      places.find(hasPhoto) ??
      places[0] ??
      events.find(hasPhoto) ??
      events[0]
    );
  }, [events, places]);

  const happeningNow = useMemo(() => {
    const current = allListings.filter(isHappeningNow);
    const remaining = allListings.filter(
      (listing) =>
        !current.some((item) => item.id === listing.id)
    );

    return [...current, ...remaining]
      .filter(
        (listing) =>
          !featured || listing.id !== featured.id
      )
      .slice(0, 6);
  }, [allListings, featured]);

  const trending = useMemo(() => {
    return [...places, ...events]
      .filter(
        (listing) =>
          !featured || listing.id !== featured.id
      )
      .filter(
        (listing) =>
          !happeningNow
            .slice(0, 3)
            .some((item) => item.id === listing.id)
      )
      .sort((a, b) => Number(hasPhoto(b)) - Number(hasPhoto(a)))
      .slice(0, 8);
  }, [events, featured, happeningNow, places]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroShapes} aria-hidden="true">
          <i />
          <span />
          <b />
        </div>

        <p className={styles.dateLine}>
          WINNIPEG · {daypart.dateLabel}
        </p>

        <h1>{daypart.greeting}</h1>

        <form
          action="/explore"
          className={styles.search}
        >
          <span className={styles.searchIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6" />
              <path d="M16 16 21 21" />
            </svg>
          </span>

          <input
            name="q"
            aria-label="Search Winnipeg"
            placeholder="Try “cheap food somewhere new”"
            autoComplete="off"
          />

          <button type="submit">
            Go
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <nav
          className={styles.quickFilters}
          aria-label="Quick discovery filters"
        >
          <Link href="/explore?when=open">
            <span className={styles.greenDot} aria-hidden="true" />
            Open now
          </Link>

          <Link href="/explore?near=me">
            <span aria-hidden="true">●</span>
            Near me
          </Link>

          <Link href="/explore?price=under-40">
            <span aria-hidden="true">$</span>
            Cheap
          </Link>

          <Link href="/explore?q=date+ideas">
            <span aria-hidden="true">♥</span>
            Date ideas
          </Link>

          <Link href="/explore">
            More
            <span aria-hidden="true">⌄</span>
          </Link>
        </nav>
      </section>

      {featured ? (
        <FeaturedCard listing={featured} />
      ) : null}

      <section className={styles.railSection}>
        <SectionHeading
          title="Happening now"
          href="/explore?when=tonight"
        />

        {happeningNow.length > 0 ? (
          <div className={styles.miniRail}>
            {happeningNow.map((listing) => (
              <MiniCard
                key={`${listing.type}-${listing.id}`}
                listing={listing}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Winnipeg is still loading the marquee. Browse the full city for now.
          </div>
        )}
      </section>

      <section className={styles.railSection}>
        <SectionHeading
          title="Trending this week"
          href="/explore"
        />

        {trending.length > 0 ? (
          <div className={styles.trendRail}>
            {trending.map((listing) => (
              <TrendCard
                key={`${listing.type}-${listing.id}`}
                listing={listing}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Fresh listings are on the way.
          </div>
        )}
      </section>

      <Link
        className={styles.builderBanner}
        href="/build-outing"
      >
        <div>
          <span>NOT SURE WHERE TO START?</span>
          <strong>Build me an outing</strong>
        </div>
        <b aria-hidden="true">→</b>
      </Link>
    </main>
  );
}
