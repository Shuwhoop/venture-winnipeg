import Link from "next/link";
import type { Listing } from "@/lib/types";

const verificationCopy: Record<Listing["verification"], string> = {
  official_source: "Official source",
  verified_venture: "Verified by Venture",
  verified_business: "Verified business",
  community_reported: "Community reported",
  unverified: "Unverified"
};

export function ListingCard({ listing }: { listing: Listing }) {
  const warning = listing.verification === "community_reported" || listing.verification === "unverified";

  return (
    <Link className="listing-card" href={`/listings/${listing.slug}`}>
      <div className={`listing-image ${listing.imageClass}`}>
        <span className={`status-badge ${listing.statusTone}`}>{listing.statusLabel}</span>
        <span className="save-button" aria-hidden="true">♡</span>
      </div>
      <div className="listing-body">
        <h3>{listing.name}</h3>
        <p>{listing.subtitle}</p>
        <div className="listing-meta"><span>{listing.timeOrHours}</span><span>{listing.distance}</span></div>
        <div className="listing-footer">
          <strong>{listing.rating ? `${listing.rating} ★ Google Maps` : listing.price}</strong>
          <span className={warning ? "trust warning" : "trust"}>
            {warning ? "!" : "✓"} {verificationCopy[listing.verification]}
          </span>
        </div>
      </div>
    </Link>
  );
}
