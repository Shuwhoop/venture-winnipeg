import { CityMap } from "@/components/city-map";
import { ListingCard } from "@/components/listing-card";
import { getPublishedPlaceListings } from "@/lib/data/places";
import { sampleListings } from "@/lib/sample-data";
import type { Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

type ExplorePageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function ExplorePage({
  searchParams
}: ExplorePageProps) {
  const { q = "" } = await searchParams;

  const databasePlaces =
    await getPublishedPlaceListings(25);

  // Keep sample events temporarily until the
  // real events table is connected.
  const sampleEvents = sampleListings.filter(
    (listing) => listing.type === "event"
  );

  const combinedListings: Listing[] =
    databasePlaces.length > 0
      ? [...sampleEvents, ...databasePlaces]
      : sampleListings;

  const normalizedSearch =
    q.trim().toLowerCase();

  const filteredListings =
    normalizedSearch.length === 0
      ? combinedListings
      : combinedListings.filter((listing) => {
          const searchableText = [
            listing.name,
            listing.category,
            listing.subtitle,
            listing.neighbourhood,
            listing.description
          ]
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            normalizedSearch
          );
        });

  return (
    <>
      <div className="page-heading">
        <span>CITYWIDE</span>
        <h1>Explore Winnipeg</h1>
      </div>

      <form className="search-field">
        <label htmlFor="search">
          Search
        </label>

        <input
          id="search"
          name="q"
          defaultValue={q}
          placeholder="Try “cheap date downtown Friday”"
        />
      </form>

      <div className="chips">
        {[
          "All",
          "Events",
          "Food",
          "Open now",
          "Verified only"
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

      <CityMap />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span>RESULTS</span>
            <h2>
              {filteredListings.length}{" "}
              {filteredListings.length === 1
                ? "listing"
                : "listings"}
            </h2>
          </div>
        </div>

        {filteredListings.length > 0 ? (
          <div className="vertical-list">
            {filteredListings.map(
              (listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                />
              )
            )}
          </div>
        ) : (
          <section className="empty-results">
            <h3>No matching listings</h3>

            <p>
              Try another name, category,
              cuisine, or neighbourhood.
            </p>
          </section>
        )}
      </section>
    </>
  );
}