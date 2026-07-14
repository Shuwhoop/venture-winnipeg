import Link from "next/link";

import { ListingCard } from "@/components/listing-card";
import { getPublishedPlaceListings } from "@/lib/data/places";
import { sampleListings } from "@/lib/sample-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const databasePlaces =
    await getPublishedPlaceListings(1);

  const featuredListings =
    databasePlaces.length > 0
      ? [
          sampleListings[0],
          databasePlaces[0]
        ]
      : sampleListings.slice(0, 2);

  return (
    <>
      <section
        className="mode-switcher"
        aria-label="Discovery mode"
      >
        <button type="button">Events</button>
        <button type="button">Food</button>
        <button
          className="active"
          type="button"
        >
          Both
        </button>
      </section>

      <Link
        className="search-button"
        href="/explore"
      >
        ⌕{" "}
        <span>
          Search events, restaurants, or both…
        </span>
      </Link>

      <div
        className="chips"
        aria-label="Quick filters"
      >
        {[
          "Tonight",
          "This Weekend",
          "Free",
          "Date Night",
          "Student",
          "Open Late"
        ].map((chip, index) => (
          <button
            className={
              index === 0 ? "active" : ""
            }
            key={chip}
            type="button"
          >
            {chip}
          </button>
        ))}
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span>FAST PICKS</span>
            <h1>Tonight in Winnipeg</h1>
          </div>

          <Link href="/explore">
            See all
          </Link>
        </div>

        <div className="card-grid">
          {featuredListings.map(
            (listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
              />
            )
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span>CURATED</span>
            <h2>Perfect Pairings</h2>
          </div>

          <Link href="/tonight">
            Build mine
          </Link>
        </div>

        <Link
          className="pairing-card"
          href="/tonight"
        >
          <div className="pairing-icon">
            🍽️ + 🎭
          </div>

          <div>
            <small>8 minutes apart</small>
            <h3>Dinner + Live Comedy</h3>
            <p>
              $68 for two · 6:00 PM–9:45 PM
            </p>
          </div>

          <strong>›</strong>
        </Link>
      </section>

      <section className="newsletter-panel">
        <span>EVERY THURSDAY</span>
        <h2>Venture This Weekend</h2>

        <p>
          One clean email with the best
          events, restaurants, and pairings
          across Winnipeg.
        </p>

        <a href="mailto:hello@venture.example?subject=Venture%20Newsletter">
          Join newsletter
        </a>
      </section>
    </>
  );
}