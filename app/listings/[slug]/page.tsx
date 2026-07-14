import { notFound } from "next/navigation";

import {
  getPublishedEventListingBySlug
} from "@/lib/data/events";

import {
  getPublishedPlaceListingBySlug
} from "@/lib/data/places";

export const dynamic = "force-dynamic";

type ListingDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ListingDetailPage({
  params
}: ListingDetailPageProps) {
  const { slug } = await params;

  const [
    databaseEvent,
    databasePlace
  ] = await Promise.all([
    getPublishedEventListingBySlug(slug),
    getPublishedPlaceListingBySlug(slug)
  ]);

  const listing =
    databaseEvent ??
    databasePlace;

  if (!listing) {
    notFound();
  }

  const warning =
    listing.verification ===
      "community_reported" ||
    listing.verification === "unverified";

  const actionUrl =
    listing.ticketUrl ??
    listing.officialUrl;

  const actionLabel =
    listing.type === "event"
      ? listing.ticketUrl
        ? "View tickets ↗"
        : "Open official event page ↗"
      : "Open official source ↗";

  const verificationLabel =
    listing.verification === "official_source"
      ? "Verified using an official source"
      : warning
        ? "Details need confirmation"
        : "Verified by Venture";

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
          ({listing.ratingCount?.toLocaleString()} ratings)
        </p>
      ) : null}

      <p className="lead">
        {listing.description}
      </p>

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
            {listing.type === "event"
              ? listing.venueName ??
                listing.distance
              : listing.distance}
          </strong>

          <span>
            {listing.type === "event"
              ? "Venue"
              : "Distance"}
          </span>
        </div>
      </div>

      {actionUrl ? (
        <a
          className="primary-action"
          href={actionUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {actionLabel}
        </a>
      ) : null}

      <section className="trust-panel">
        <h2>Safe & transparent</h2>

        <div>
          <b>{warning ? "!" : "✓"}</b>

          <p>
            <strong>
              {verificationLabel}
            </strong>

            <span>
              {listing.lastChecked}
            </span>
          </p>
        </div>

        <div>
          <b>↗</b>

          <p>
            <strong>Official source</strong>

            <span>
              Source information is stored
              with this listing
            </span>
          </p>
        </div>

        <div>
          <b>!</b>

          <p>
            <strong>Report an issue</strong>

            <span>
              Corrections enter Venture’s
              moderation queue
            </span>
          </p>
        </div>
      </section>

      {listing.rating ? (
        <p className="google-note">
          Google Maps content must remain
          visually separated, correctly
          attributed, and governed by the
          enabled Google product’s current
          terms.
        </p>
      ) : null}
    </article>
  );
}