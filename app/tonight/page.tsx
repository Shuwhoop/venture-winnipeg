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

export default async function TonightPage() {
  const [
    events,
    places
  ] = await Promise.all([
    getPublishedEventListings(50),
    getPublishedPlaceListings(50)
  ]);

  const tonightEvents =
    events.filter(isTonightEvent);

  const openPlaces =
    places.filter(
      (listing) =>
        listing.isOpenNow === true
    );

  const tonightListings: Listing[] = [
    ...tonightEvents,
    ...openPlaces
  ];

  const upcomingEvents =
    events
      .filter(
        (listing) =>
          !isTonightEvent(listing)
      )
      .slice(0, 3);

  return (
    <>
      <div className="page-heading">
        <span>WINNIPEG RIGHT NOW</span>
        <h1>Tonight</h1>

        <p className="page-description">
          Verified events happening today
          and places that appear to be open
          right now.
        </p>
      </div>

      <div
        className="chips"
        aria-label="Tonight shortcuts"
      >
        <Link
          className="filter-chip active"
          href="/tonight"
        >
          Tonight
        </Link>

        <Link
          className="filter-chip"
          href="/explore?filter=events"
        >
          All events
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
            <span>AVAILABLE TONIGHT</span>

            <h2>
              {tonightListings.length}{" "}
              {tonightListings.length === 1
                ? "option"
                : "options"}
            </h2>
          </div>
        </div>

        {tonightListings.length > 0 ? (
          <div className="vertical-list">
            {tonightListings.map(
              (listing) => (
                <ListingCard
                  key={`${listing.type}-${listing.id}`}
                  listing={listing}
                />
              )
            )}
          </div>
        ) : (
          <section className="empty-results tonight-empty">
            <span className="empty-icon">
              ☾
            </span>

            <h3>
              Nothing verified for tonight
              yet
            </h3>

            <p>
              Venture will only show options
              whose timing or opening hours
              can be supported by the stored
              source information.
            </p>

            <Link
              className="empty-action"
              href="/explore"
            >
              Explore all listings
            </Link>
          </section>
        )}
      </section>

      {upcomingEvents.length > 0 ? (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <span>COMING UP</span>
              <h2>Upcoming events</h2>
            </div>

            <Link href="/explore?filter=events">
              See all
            </Link>
          </div>

          <div className="vertical-list">
            {upcomingEvents.map(
              (listing) => (
                <ListingCard
                  key={`upcoming-${listing.id}`}
                  listing={listing}
                />
              )
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}