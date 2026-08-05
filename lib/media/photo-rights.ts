export type PublishablePhotoRightsBasis =
  | "venture_owned"
  | "business_permission"
  | "organizer_permission"
  | "submitter_owned"
  | "licensed"
  | "public_domain";

const APPROVED_BASES = new Set<PublishablePhotoRightsBasis>([
  "venture_owned",
  "business_permission",
  "organizer_permission",
  "submitter_owned",
  "licensed",
  "public_domain"
]);

const DISALLOWED_MARKERS = [
  "unknown",
  "link_only",
  "no permission",
  "permission pending",
  "copyright unclear",
  "google images",
  "google maps",
  "copied from google",
  "instagram screenshot",
  "copied from instagram",
  "facebook screenshot",
  "copied from facebook",
  "website image",
  "copied from website"
];

const APPROVED_MARKERS = [
  "venture_owned",
  "business_permission",
  "organizer_permission",
  "submitter_owned",
  "licensed",
  "public_domain",
  "venture owned",
  "business permission",
  "organizer permission",
  "submitter owns",
  "permission granted",
  "commercial licence",
  "commercial license",
  "public domain"
];

export function isPublishableRightsBasis(
  value: string | null | undefined
): value is PublishablePhotoRightsBasis {
  return Boolean(
    value &&
      APPROVED_BASES.has(
        value as PublishablePhotoRightsBasis
      )
  );
}

/**
 * Compatibility safeguard for older listing rows that predate listing_media.
 * A real image is only surfaced when the stored note clearly records an
 * approved rights basis. Unknown or link-only sources fall back to Venture art.
 */
export function hasPublishablePhotoRights(
  rightsNotes: string | null | undefined
): boolean {
  if (!rightsNotes?.trim()) {
    return false;
  }

  const normalized = rightsNotes
    .trim()
    .toLowerCase();

  if (
    DISALLOWED_MARKERS.some((marker) =>
      normalized.includes(marker)
    )
  ) {
    return false;
  }

  if (
    APPROVED_MARKERS.some((marker) =>
      normalized.includes(marker)
    )
  ) {
    return true;
  }

  // The existing admin editor requires a rights note for every
  // non-Venture photo. A non-empty note is treated as recorded
  // evidence unless it contains one of the unsafe markers above.
  return normalized.length >= 8;
}

export function photoRightsLabel(
  basis: PublishablePhotoRightsBasis
): string {
  switch (basis) {
    case "venture_owned":
      return "Venture-owned photo";
    case "business_permission":
      return "Photo supplied with business permission";
    case "organizer_permission":
      return "Photo supplied with organizer permission";
    case "submitter_owned":
      return "Photo supplied by its owner";
    case "licensed":
      return "Licensed photo";
    case "public_domain":
      return "Public-domain photo";
  }
}
