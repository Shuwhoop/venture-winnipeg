"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent
} from "react";

import { SaveButton } from "@/components/save-button";
import { trackBetaEvent } from "@/lib/beta/client";
import {
  NEARBY_LOCATION_STORAGE_KEY
} from "@/lib/explore-map-utils";
import type { Listing } from "@/lib/types";

import styles from "./today-discovery.module.css";

import { HomeSubmitLast } from "@/components/home-submit-last";
type TodayDiscoveryProps = {
  events: Listing[];
  places: Listing[];
};

type ListingWithImage = Listing & {
  imageUrl?: string | null;
};

type HomeListingSource =
  | "venture-pick"
  | "happening-now"
  | "worth-checking-out";

type LocationState =
  | "idle"
  | "locating"
  | "error";

const VERIFICATION_SCORE: Record<
  Listing["verification"],
  number
> = {
  official_source: 6,
  verified_venture: 5,
  verified_business: 5,
  community_reported: 2,
  unverified: 0
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

function getListingKey(listing: Listing) {
  return `${listing.type}-${listing.id}`;
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

  return status === "HAPPENING" || status === "LIVE";
}

function hasPhoto(listing: Listing) {
  return Boolean((listing as ListingWithImage).imageUrl?.trim());
}

function hasCoordinates(listing: Listing) {
  return (
    Number.isFinite(Number(listing.latitude)) &&
    Number.isFinite(Number(listing.longitude))
  );
}

function hasSourceCheck(listing: Listing) {
  const check = listing.lastChecked.trim().toLowerCase();

  return Boolean(check) && !check.includes("pending");
}

function getListingQualityScore(listing: Listing) {
  let score = VERIFICATION_SCORE[listing.verification];

  if (hasPhoto(listing)) {
    score += 5;
  }

  if (hasSourceCheck(listing)) {
    score += 3;
  }

  if (!isPlaceholder(listing.timeOrHours)) {
    score += 2;
  }

  if (!isPlaceholder(listing.price)) {
    score += 1;
  }

  if (hasCoordinates(listing)) {
    score += 1;
  }

  if (listing.description.trim().length >= 80) {
    score += 1;
  }

  if (isHappeningNow(listing)) {
    score += 4;
  }

  return score;
}

function rankListings(listings: Listing[]) {
  return listings
    .map((listing, index) => ({
      listing,
      index,
      score: getListingQualityScore(listing)
    }))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.index - second.index;
    })
    .map((result) => result.listing);
}

function trackListingOpen(
  listing: Listing,
  source: HomeListingSource
) {
  trackBetaEvent({
    eventName: "listing_card_selected",
    pagePath: window.location.pathname,
    properties: {
      listingId: listing.id,
      listingSlug: listing.slug,
      listingType: listing.type,
      listingName: listing.name,
      category: listing.category,
      neighbourhood: listing.neighbourhood,
      source
    }
  });
}

function trackQuickFilter(filter: string) {
  trackBetaEvent({
    eventName: "discovery_filter_selected",
    pagePath: window.location.pathname,
    properties: {
      surface: "home",
      interaction: "quick-filter",
      filter
    }
  });
}

function handleHorizontalRailKeyDown(
  event: KeyboardEvent<HTMLDivElement>
) {
  if (
    event.key !== "ArrowLeft" &&
    event.key !== "ArrowRight"
  ) {
    return;
  }

  event.preventDefault();

  const direction =
    event.key === "ArrowRight"
      ? 1
      : -1;

  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  event.currentTarget.scrollBy({
    left:
      direction *
      Math.max(
        220,
        event.currentTarget.clientWidth * 0.82
      ),
    behavior:
      reducedMotion
        ? "auto"
        : "smooth"
  });
}

function SectionHeading({
  title,
  href,
  source
}: {
  title: string;
  href: string;
  source: string;
}) {
  return (
    <header className={styles.sectionHeading}>
      <h2>{title}</h2>
      <i aria-hidden="true" />
      <Link
        href={href}
        onClick={() => trackQuickFilter(source)}
      >
        See all
      </Link>
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
    : listing.statusLabel || "FEATURED";

  return (
    <section className={styles.featuredSection}>
      <header className={styles.pickHeading}>
        <span>VENTURE PICK</span>
        <i aria-hidden="true" />
        <p>Chosen for trust and strong details</p>
      </header>

      <article className={styles.featuredCard}>
        <Link
          className={styles.cardLink}
          href={getListingHref(listing)}
          aria-label={`View ${listing.name}`}
          onClick={() =>
            trackListingOpen(listing, "venture-pick")
          }
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
        onClick={() =>
          trackListingOpen(listing, "happening-now")
        }
      />

      <div
        className={`listing-image ${listing.imageClass} ${styles.miniImage}`}
        style={getImageStyle(listing)}
      >
        <div className={styles.miniShade} />

        <SaveButton
          listing={listing}
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

function WorthCard({
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
        onClick={() =>
          trackListingOpen(listing, "worth-checking-out")
        }
      />

      <div
        className={`listing-image ${listing.imageClass} ${styles.trendImage}`}
        style={getImageStyle(listing)}
      >
        <SaveButton
          listing={listing}
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

function FilterIcon({
  type
}: {
  type: "open" | "location" | "price" | "heart";
}) {
  if (type === "open") {
    return (
      <svg
        className={styles.quickFilterIcon}
        data-kind="open"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="6.4" />
        <path d="M10 6.6v3.7l2.5 1.5" />
      </svg>
    );
  }

  if (type === "location") {
    return (
      <svg
        className={styles.quickFilterIcon}
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="4.2" />
        <circle cx="10" cy="10" r="1.15" />
        <path d="M10 2.7v2M10 15.3v2M2.7 10h2M15.3 10h2" />
      </svg>
    );
  }

  if (type === "price") {
    return (
      <svg
        className={styles.quickFilterIcon}
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M3.4 4.3h5.1l8.1 8.1-4.2 4.2-8.1-8.1V4.3Z" />
        <circle cx="6.9" cy="7" r="1" />
      </svg>
    );
  }

  return (
    <svg
      className={styles.quickFilterIcon}
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M10 16.2 4.2 10.8A3.7 3.7 0 0 1 9.5 5.6l.5.6.5-.6a3.7 3.7 0 0 1 5.3 5.2L10 16.2Z" />
    </svg>
  );
}

export function TodayDiscovery({
  events,
  places
}: TodayDiscoveryProps) {
  const daypart = useMemo(getDaypart, []);
  const [locationState, setLocationState] =
    useState<LocationState>("idle");
  const [locationMessage, setLocationMessage] =
    useState("");

  const allListings = useMemo(
    () => [...places, ...events],
    [events, places]
  );

  const featured = useMemo(() => {
    const ranked = rankListings(allListings);

    return (
      ranked.find(hasPhoto) ??
      ranked[0]
    );
  }, [allListings]);

  const happeningNow = useMemo(() => {
    return rankListings(
      allListings.filter(
        (listing) =>
          isHappeningNow(listing) &&
          (!featured ||
            getListingKey(listing) !==
              getListingKey(featured))
      )
    ).slice(0, 6);
  }, [allListings, featured]);

  const worthCheckingOut = useMemo(() => {
    const usedKeys = new Set([
      ...(featured
        ? [getListingKey(featured)]
        : []),
      ...happeningNow.map(getListingKey)
    ]);

    const remainingListings =
      allListings.filter(
        (listing) =>
          !usedKeys.has(
            getListingKey(listing)
          )
      );

    const trustedListings =
      remainingListings.filter(
        (listing) =>
          listing.verification ===
            "official_source" ||
          listing.verification ===
            "verified_venture" ||
          listing.verification ===
            "verified_business"
      );

    return rankListings(
      trustedListings.length >= 3
        ? trustedListings
        : remainingListings
    ).slice(0, 8);
  }, [allListings, featured, happeningNow]);

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();

    trackBetaEvent({
      eventName: "discovery_search_submitted",
      pagePath: window.location.pathname,
      properties: {
        surface: "home",
        interaction: "search-submitted",
        query,
        queryLength: query.length
      }
    });
  }

  function findNearby() {
    trackQuickFilter("near-me");

    if (!navigator.geolocation) {
      setLocationState("error");
      setLocationMessage(
        "Location is not available here. Choose a neighbourhood instead."
      );
      return;
    }

    setLocationState("locating");
    setLocationMessage("Finding what is close to you...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          window.sessionStorage.setItem(
            NEARBY_LOCATION_STORAGE_KEY,
            JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          );
        } catch {
          setLocationState("error");
          setLocationMessage(
            "Venture could not keep your location for this search. Browse by neighbourhood instead."
          );
          return;
        }

        trackBetaEvent({
          eventName: "discovery_filter_selected",
          pagePath: window.location.pathname,
          properties: {
            surface: "home",
            interaction: "location-resolved",
            filter: "near-me",
            result: "granted"
          }
        });

        window.location.assign("/explore?near=me");
      },
      (error) => {
        setLocationState("error");

        const denied =
          error.code === error.PERMISSION_DENIED;

        setLocationMessage(
          denied
            ? "Location is off. Browse by neighbourhood instead."
            : "Venture could not find your location. Browse the city normally instead."
        );

        trackBetaEvent({
          eventName: "discovery_filter_selected",
          pagePath: window.location.pathname,
          properties: {
            surface: "home",
            interaction: "location-resolved",
            filter: "near-me",
            result: denied ? "denied" : "unavailable"
          }
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  return (
    <main className={styles.page}>
      <HomeSubmitLast />
      <section className={styles.hero}>

        <p className={styles.dateLine}>
          WINNIPEG · {daypart.dateLabel}
        </p>

        <div className="home-greeting">
          <h1>{daypart.greeting}</h1>
          <span className="home-sun" aria-hidden="true">
            <svg viewBox="0 0 72 72" fill="none">
              <path d="M36 3v7M36 62v7M3 36h7M62 36h7M13 13l5 5M54 54l5 5M13 59l5-5M54 18l5-5" />
              <circle className="sun-face" cx="36" cy="36" r="19" />
              <circle className="sun-eye" cx="30" cy="34" r="1.8" />
              <circle className="sun-eye" cx="42" cy="34" r="1.8" />
              <path className="sun-smile" d="M29 41q7 8 14 0" />
            </svg>
          </span>
        </div>
        <p className="home-invitation">Good food. New places. Your kind of plans.</p>

        <form
          action="/explore"
          className={styles.search}
          onSubmit={handleSearchSubmit}
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
          <Link
            href="/explore?when=open"
            onClick={() => trackQuickFilter("open-now")}
          >
            <FilterIcon type="open" />
            Open now
          </Link>

          <button
            type="button"
            onClick={findNearby}
            disabled={locationState === "locating"}
            aria-busy={locationState === "locating"}
          >
            <FilterIcon type="location" />
            {locationState === "locating" ? "Finding…" : "Near me"}
          </button>

          <Link
            href="/explore?price=under-40"
            onClick={() => trackQuickFilter("under-40")}
          >
            <FilterIcon type="price" />
            Cheap
          </Link>

          <Link
            href="/explore?occasion=date"
            onClick={() => trackQuickFilter("date-ideas")}
          >
            <FilterIcon type="heart" />
            Date ideas
          </Link>

        </nav>

        {locationMessage ? (
          <div
            className={`${styles.locationMessage} ${
              locationState === "error"
                ? styles.locationMessageError
                : ""
            }`}
            role="status"
            aria-live="polite"
          >
            <span>{locationMessage}</span>
            {locationState === "error" ? (
              <Link href="/explore">Choose an area</Link>
            ) : null}
          </div>
        ) : null}
      </section>

      {featured ? (
        <FeaturedCard listing={featured} />
      ) : null}

      <section className={styles.railSection}>
        <SectionHeading
          title="Happening now"
          href="/explore?when=tonight"
          source="happening-now-see-all"
        />

        {happeningNow.length > 0 ? (
          <div
            className={styles.miniRail}
            role="region"
            aria-label="Happening now listings. Use left and right arrow keys to scroll."
            tabIndex={0}
            onKeyDown={handleHorizontalRailKeyDown}
          >
            {happeningNow.map((listing) => (
              <MiniCard
                key={`${listing.type}-${listing.id}`}
                listing={listing}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Nothing verified is live right now. Explore the full city for the next good move.
          </div>
        )}
      </section>

      <section className={styles.railSection}>
        <SectionHeading
          title="Worth checking out"
          href="/explore?filter=verified"
          source="worth-checking-out-see-all"
        />

        {worthCheckingOut.length > 0 ? (
          <div
            className={styles.trendRail}
            role="region"
            aria-label="Worth checking out listings. Use left and right arrow keys to scroll."
            tabIndex={0}
            onKeyDown={handleHorizontalRailKeyDown}
          >
            {worthCheckingOut.map((listing) => (
              <WorthCard
                key={`${listing.type}-${listing.id}`}
                listing={listing}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Fresh, dependable picks are on the way.
          </div>
        )}
      </section>

      <Link
        className={styles.builderBanner}
        href="/build-outing"
        onClick={() => {
          trackBetaEvent({
            eventName: "outing_builder_opened",
            pagePath: window.location.pathname,
            properties: {
              source: "home-builder-banner"
            }
          });
        }}
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
