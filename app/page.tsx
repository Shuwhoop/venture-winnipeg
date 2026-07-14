import Link from "next/link";

import { ListingCard } from "@/components/listing-card";
import {
  getPublishedEventListings
} from "@/lib/data/events";
import {
  getPublishedPlaceListings
} from "@/lib/data/places";
import type { Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

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
    (listing): listing is Listing =>
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
        <span aria-hidden="true">⌕</span>

        <span>
          Search events, restaurants,
          venues, or neighbourhoods…
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

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span>
              {showingTonight
                ? "AVAILABLE NOW"
                : "FEATURED PICKS"}
            </span>

            <h1>
              {showingTonight
                ? "Tonight in Winnipeg"
                : "Discover Winnipeg"}
            </h1>
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
              Verified Winnipeg places and
              events will appear here as they
              are added.
            </p>
          </section>
        )}
      </section>

      {featuredEvent && featuredPlace ? (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <span>PLAN AHEAD</span>
              <h2>Build an outing</h2>
            </div>

            <Link href="/tonight">
              Explore ideas
            </Link>
          </div>

          <Link
            className="pairing-card"
            href="/tonight"
          >
            <div className="pairing-icon">
              ◉ + ✦
            </div>

            <div>
              <small>
                Two verified Winnipeg picks
              </small>

              <h3>
                {featuredPlace.name} +{" "}
                {featuredEvent.name}
              </h3>

              <p>
                {featuredPlace.neighbourhood}
                {" · "}
                {featuredEvent.timeOrHours}
              </p>
            </div>

            <strong>›</strong>
          </Link>
        </section>
      ) : null}

      <section className="newsletter-panel">
        <span>EVERY THURSDAY</span>

        <h2>Venture This Weekend</h2>

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