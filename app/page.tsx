import Link from "next/link";

import {
  ListingCard
} from "@/components/listing-card";

import {
  getPublishedEventListings
} from "@/lib/data/events";

import {
  getPublishedPlaceListings
} from "@/lib/data/places";

import type {
  Listing
} from "@/lib/types";

export const dynamic =
  "force-dynamic";

function isTonightEvent(
  listing: Listing
): boolean {
  return (
    listing.type === "event" &&
    (
      listing.statusLabel === "TODAY" ||
      listing.statusLabel === "HAPPENING"
    )
  );
}

export default async function HomePage() {
  const [
    databaseEvents,
    databasePlaces
  ] = await Promise.all([
    getPublishedEventListings(10),
    getPublishedPlaceListings(10)
  ]);

  const tonightListings: Listing[] = [
    ...databaseEvents.filter(
      isTonightEvent
    ),

    ...databasePlaces.filter(
      (listing) =>
        listing.isOpenNow === true
    )
  ];

  const fallbackListings: Listing[] = [
    databaseEvents[0],
    databasePlaces[0]
  ].filter(
    (
      listing
    ): listing is Listing =>
      Boolean(listing)
  );

  const featuredListings =
    (
      tonightListings.length > 0
        ? tonightListings
        : fallbackListings
    ).slice(0, 2);

  const featuredEvent =
    databaseEvents[0] ?? null;

  const featuredPlace =
    databasePlaces[0] ?? null;

  const showingTonight =
    tonightListings.length > 0;

  return (
    <>
      <section
        className="mode-switcher"
        aria-label="Discovery mode"
      >
        <Link href="/explore?filter=events">
          Events
        </Link>

        <Link href="/explore?filter=food">
          Food
        </Link>

        <Link
          className="active"
          href="/explore"
        >
          Both
        </Link>
      </section>

      <Link
        className="search-button"
        href="/explore"
      >
        <span aria-hidden="true">
          {"\u2315"}
        </span>

        <span>
          Search events, restaurants,
          venues, or neighbourhoods
          {"\u2026"}
        </span>
      </Link>

      <div
        className="chips"
        aria-label="Quick filters"
      >
        <Link
          className="filter-chip"
          href="/tonight"
        >
          Tonight
        </Link>

        <Link
          className="filter-chip"
          href="/explore?filter=events"
        >
          Events
        </Link>

        <Link
          className="filter-chip"
          href="/explore?filter=food"
        >
          Food
        </Link>

        <Link
          className="filter-chip"
          href="/explore?filter=open"
        >
          Open now
        </Link>

        <Link
          className="filter-chip"
          href="/explore?filter=verified"
        >
          Verified
        </Link>
      </div>

      <section className="outing-builder-hero">
        <div className="outing-builder-glow" />

        <div className="outing-builder-content">
          <span className="outing-builder-eyebrow">
            VENTURE BUILDER
          </span>

          <h1>
            What should we do tonight?
          </h1>

          <p>
            Choose the kind of night you
            want. Venture will combine
            real Winnipeg events,
            restaurants, opening hours,
            timing, budget, and travel
            into one complete outing.
          </p>

          <div className="outing-builder-features">
            <span>
              {"\u2713"} Your interests
            </span>

            <span>
              {"\u2713"} Real listings
            </span>

            <span>
              {"\u2713"} Timed itinerary
            </span>
          </div>

          <div className="outing-builder-actions">
            <Link
              className="outing-builder-primary"
              href="/build-outing"
            >
              Build my outing

              <span aria-hidden="true">
                {"\u2192"}
              </span>
            </Link>

            <Link
              className="outing-builder-secondary"
              href="/explore"
            >
              Browse first
            </Link>
          </div>
        </div>

        <div
          className="outing-builder-preview"
          aria-hidden="true"
        >
          <div className="outing-builder-preview-heading">
            <span>YOUR NIGHT</span>
            <strong>3 connected stops</strong>
          </div>

          <div className="outing-builder-preview-stop">
            <b>1</b>

            <div>
              <small>6:00 PM</small>
              <strong>Food</strong>
            </div>
          </div>

          <div className="outing-builder-preview-line">
            <span />
          </div>

          <div className="outing-builder-preview-stop">
            <b>2</b>

            <div>
              <small>7:30 PM</small>
              <strong>Event</strong>
            </div>
          </div>

          <div className="outing-builder-preview-line">
            <span />
          </div>

          <div className="outing-builder-preview-stop">
            <b>3</b>

            <div>
              <small>10:00 PM</small>
              <strong>Final stop</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span>
              {showingTonight
                ? "AVAILABLE NOW"
                : "FEATURED PICKS"}
            </span>

            <h2>
              {showingTonight
                ? "Tonight in Winnipeg"
                : "Discover Winnipeg"}
            </h2>
          </div>

          <Link href="/explore">
            See all
          </Link>
        </div>

        {featuredListings.length > 0 ? (
          <div className="card-grid">
            {featuredListings.map(
              (listing) => (
                <ListingCard
                  key={`${listing.type}-${listing.id}`}
                  listing={listing}
                />
              )
            )}
          </div>
        ) : (
          <section className="empty-results">
            <h3>
              No published listings yet
            </h3>

            <p>
              Verified Winnipeg places
              and events will appear here
              as they are added.
            </p>
          </section>
        )}
      </section>

      {featuredEvent &&
      featuredPlace ? (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <span>
                OUTING INSPIRATION
              </span>

              <h2>
                Start with two real picks
              </h2>
            </div>

            <Link href="/build-outing">
              Build yours
            </Link>
          </div>

          <Link
            className="pairing-card"
            href="/build-outing"
          >
            <div className="pairing-icon">
              {"\u25C9 + \u2726"}
            </div>

            <div>
              <small>
                A possible Winnipeg pairing
              </small>

              <h3>
                {featuredPlace.name}
                {" + "}
                {featuredEvent.name}
              </h3>

              <p>
                {featuredPlace.neighbourhood}
                {" \u00B7 "}
                {featuredEvent.timeOrHours}
              </p>
            </div>

            <strong aria-hidden="true">
              {"\u203A"}
            </strong>
          </Link>
        </section>
      ) : null}

      <section className="newsletter-panel">
        <span>EVERY THURSDAY</span>

        <h2>
          Venture This Weekend
        </h2>

        <p>
          One clean email with notable
          events, food spots, and outing
          ideas across Winnipeg.
        </p>

        <span className="newsletter-coming-soon">
          Newsletter signup coming soon
        </span>
      </section>
    </>
  );
}