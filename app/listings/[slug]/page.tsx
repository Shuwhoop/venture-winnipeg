import { notFound } from "next/navigation";

import { getPublishedPlaceListingBySlug } from "@/lib/data/places";
import { getListingBySlug } from "@/lib/sample-data";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const databaseListing =
    await getPublishedPlaceListingBySlug(slug);

  const listing =
    databaseListing ??
    getListingBySlug(slug);

  if (!listing) {
    notFound();
  }

  const warning =
    listing.verification ===
      "community_reported" ||
    listing.verification ===
      "unverified";

  return (
    <article className="detail-page">
      <div
        className={`detail-hero ${listing.imageClass}`}
      >
        <span>{listing.statusLabel}</span>
      </div>

      <div className="detail-title">
        <div>
          <small>
            {listing.category.toUpperCase()}
          </small>

          <h1>{listing.name}</h1>
        </div>

        <b>
          {warning
            ? "! Unverified"
            : "✓ Verified"}
        </b>
      </div>

      {listing.rating ? (
        <p className="rating">
          <strong>
            {listing.rating} ★ Google Maps
          </strong>{" "}
          (
          {listing.ratingCount?.toLocaleString()}{" "}
          ratings)
        </p>
      ) : null}

      <p className="lead">
        {listing.description}
      </p>

      {warning ? (
        <section className="listing-warning">
          <strong>
            Information not fully verified
          </strong>

          <p>
            Confirm important details with the
            official source before travelling.
          </p>
        </section>
      ) : null}

      <div className="fact-grid">
        <div>
          <strong>
            {listing.timeOrHours}
          </strong>
          <span>Schedule</span>
        </div>

        <div>
          <strong>
            {listing.neighbourhood}
          </strong>
          <span>Neighbourhood</span>
        </div>

        <div>
          <strong>{listing.price}</strong>
          <span>Price</span>
        </div>

        <div>
          <strong>
            {listing.distance}
          </strong>
          <span>Location</span>
        </div>
      </div>

      <button
        className="primary-action"
        type="button"
      >
        Open official source ↗
      </button>

      <section className="trust-panel">
        <h2>Safe & transparent</h2>

        <div>
          <b>{warning ? "!" : "✓"}</b>

          <p>
            <strong>
              {warning
                ? "Details need confirmation"
                : "Verified by Venture"}
            </strong>

            <span>
              {listing.lastChecked}
            </span>
          </p>
        </div>

        <div>
          <b>↗</b>

          <p>
            <strong>
              Official source
            </strong>

            <span>
              Source information is stored
              with this record
            </span>
          </p>
        </div>

        <div>
          <b>!</b>

          <p>
            <strong>
              Report an issue
            </strong>

            <span>
              Corrections enter the
              moderation queue
            </span>
          </p>
        </div>
      </section>

      {listing.rating ? (
        <p className="google-note">
          Google Maps information must remain
          separately attributed and governed
          by the enabled Google product’s
          current terms.
        </p>
      ) : null}
    </article>
  );
}