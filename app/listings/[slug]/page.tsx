import type {
  Metadata
} from "next";
import Link from "next/link";
import {
  notFound
} from "next/navigation";

import {
  ClaimListingForm
} from "@/components/claim-listing-form";
import {
  ListingCard
} from "@/components/listing-card";
import {
  ListingDetailActionDock
} from "@/components/listing-detail-action-dock";
import {
  ListingDetailMap
} from "@/components/listing-detail-map";
import {
  ReportIssueForm
} from "@/components/report-issue-form";
import {
  VisitButton
} from "@/components/visit-button";
import {
  getPublishedEventListings
} from "@/lib/data/events";
import {
  getPublishedListingDetailBySlug,
  type PublicEventDetail,
  type PublicListingDetail,
  type PublicPlaceDetail
} from "@/lib/data/listing-detail";
import {
  getPublishedPlaceListings
} from "@/lib/data/places";
import {
  formatDurationMinutes,
  getCatalogueKind,
  getSuggestedDurationProfile
} from "@/lib/catalogue";
import type {
  Listing
} from "@/lib/types";

import styles from "./page.module.css";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};



type IconName =
  | "clock"
  | "pin"
  | "price"
  | "spark"
  | "directions"
  | "phone"
  | "globe"
  | "menu"
  | "mail"
  | "reserve"
  | "ticket";

function Icon({
  name
}: {
  name: IconName;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    price: (
      <>
        <path d="M12 3v18" />
        <path d="M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.3 2.5 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1L6.5 8.5l4.1-1.4L12 3Z" />
        <path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
      </>
    ),
    directions: (
      <>
        <path d="m4 12 16-8-7 16-2.2-6.8L4 12Z" />
      </>
    ),
    phone: (
      <>
        <path d="M7 4h3l1.4 4-2 1.4a14 14 0 0 0 5.2 5.2l1.4-2L20 14v3c0 1.7-1.3 3-3 3C9.8 20 4 14.2 4 7c0-1.7 1.3-3 3-3Z" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z" />
      </>
    ),
    menu: (
      <>
        <path d="M5 5h14M5 9h14M5 13h9" />
        <path d="M6 18h12" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    reserve: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 9h16M9 14h6" />
      </>
    ),
    ticket: (
      <>
        <path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V7Z" />
        <path d="M12 8.5v7" />
      </>
    )
  };

  return (
    <svg
      className={styles.iconSvg}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
] as const;

function readable(
  value: string
): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(
  value: string | null,
  options?: Intl.DateTimeFormatOptions,
  timezone = "America/Winnipeg"
): string {
  if (!value) {
    return "Not confirmed";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Not confirmed";
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      year: "numeric",
      ...options
    }
  ).format(date);
}

function formatTime(
  value: string
): string {
  const match = value.match(
    /^(\d{1,2}):(\d{2})$/
  );

  if (!match) {
    return value;
  }

  const hour = Number(match[1]);
  const minute = match[2];
  const displayHour =
    hour % 12 || 12;
  const suffix =
    hour >= 12 ? "PM" : "AM";

  return `${displayHour}:${minute} ${suffix}`;
}

function getDayHours(
  detail: PublicPlaceDetail,
  day: string
): string {
  const raw =
    detail.weeklyHours[day];

  if (!raw) {
    return "Hours not confirmed";
  }

  const first = Array.isArray(raw)
    ? raw[0]
    : raw;

  if (
    !first ||
    typeof first !== "object"
  ) {
    return "Hours not confirmed";
  }

  const record = first as Record<
    string,
    unknown
  >;

  if (record.closed === true) {
    return "Closed";
  }

  const open =
    typeof record.open === "string"
      ? record.open
      : "";
  const close =
    typeof record.close === "string"
      ? record.close
      : "";

  if (!open || !close) {
    return "Hours not confirmed";
  }

  return `${formatTime(open)}–${formatTime(close)}`;
}

function getTodayName(): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Winnipeg",
      weekday: "long"
    }
  )
    .format(new Date())
    .toLowerCase();
}

function getCurrentPlaceStatus(
  detail: PublicPlaceDetail
): string {
  if (
    detail.openStatus ===
    "temporarily_closed"
  ) {
    return "Temporarily closed";
  }

  if (
    detail.openStatus ===
    "permanently_closed"
  ) {
    return "Permanently closed";
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "America/Winnipeg",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }
    ).formatToParts(new Date());
  const day =
    parts.find(
      (part) => part.type === "weekday"
    )?.value.toLowerCase() ?? "monday";
  const hour = Number(
    parts.find(
      (part) => part.type === "hour"
    )?.value ?? 0
  );
  const minute = Number(
    parts.find(
      (part) => part.type === "minute"
    )?.value ?? 0
  );
  const now = hour * 60 + minute;
  const raw = detail.weeklyHours[day];
  const first = Array.isArray(raw)
    ? raw[0]
    : raw;

  if (
    !first ||
    typeof first !== "object"
  ) {
    return readable(detail.openStatus);
  }

  const record = first as Record<
    string,
    unknown
  >;

  if (record.closed === true) {
    return "Closed today";
  }

  const toMinutes = (value: unknown) => {
    if (typeof value !== "string") {
      return null;
    }

    const match = value.match(
      /^(\d{1,2}):(\d{2})$/
    );

    if (!match) {
      return null;
    }

    return Number(match[1]) * 60 +
      Number(match[2]);
  };
  const open = toMinutes(record.open);
  const close = toMinutes(record.close);

  if (open === null || close === null) {
    return readable(detail.openStatus);
  }

  const isOpen = close > open
    ? now >= open && now < close
    : now >= open || now < close;

  return isOpen
    ? "Open now"
    : "Closed now";
}

function fullAddress(
  detail: PublicListingDetail
): string {
  return [
    detail.addressLine1,
    detail.addressLine2,
    detail.city,
    detail.province,
    detail.postalCode
  ]
    .filter(Boolean)
    .join(", ");
}

function directionsUrl(
  detail: PublicListingDetail
): string {
  const destination =
    detail.latitude !== null &&
    detail.longitude !== null
      ? `${detail.latitude},${detail.longitude}`
      : fullAddress(detail);

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function placePrice(
  detail: PublicPlaceDetail
): string {
  return detail.priceLevel
    ? "$".repeat(detail.priceLevel)
    : "Price not listed";
}

function eventPrice(
  detail: PublicEventDetail
): string {
  if (detail.priceType === "free") {
    return "Free";
  }

  if (detail.priceType === "donation") {
    return "Donation";
  }

  const minimum =
    detail.minimumPriceCad;
  const maximum =
    detail.maximumPriceCad;

  if (
    minimum !== null &&
    maximum !== null &&
    minimum !== maximum
  ) {
    return `$${minimum}–$${maximum}`;
  }

  if (minimum !== null) {
    return `$${minimum}`;
  }

  if (maximum !== null) {
    return `$${maximum}`;
  }

  return "Price not listed";
}

function eventSchedule(
  detail: PublicEventDetail
): string {
  const start = formatDate(
    detail.startAt,
    {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit"
    },
    detail.timezone
  );

  if (!detail.endAt) {
    return start;
  }

  return `${start} to ${formatDate(
    detail.endAt,
    {
      hour: "numeric",
      minute: "2-digit"
    },
    detail.timezone
  )}`;
}

function verificationLabel(
  detail: PublicListingDetail
): string {
  if (
    detail.verificationStatus ===
    "official_source"
  ) {
    return "Official source";
  }

  if (
    detail.verificationStatus ===
    "verified_business"
  ) {
    return "Verified business";
  }

  if (
    detail.verificationStatus ===
    "verified_venture"
  ) {
    return "Verified by Venture";
  }

  return readable(
    detail.verificationStatus
  );
}


function isFreshnessExpired(
  detail: PublicListingDetail
): boolean {
  if (!detail.freshnessExpiresAt) {
    return false;
  }

  const expiry = new Date(
    detail.freshnessExpiresAt
  ).getTime();

  return Number.isFinite(expiry) &&
    expiry < Date.now();
}

async function getRelatedListings(
  detail: PublicListingDetail
): Promise<Listing[]> {
  const [places, events] =
    await Promise.all([
      getPublishedPlaceListings(35),
      getPublishedEventListings(35)
    ]);

  const currentType =
    detail.entityType === "place"
      ? "restaurant"
      : "event";

  const detailTerms = new Set(
    [
      detail.primaryCategory,
      ...detail.secondaryCategories,
      ...detail.tags
    ].map((value) =>
      value.toLowerCase()
    )
  );

  return [...places, ...events]
    .filter(
      (listing) =>
        listing.slug !== detail.slug
    )
    .map((listing) => {
      let score = 0;

      if (
        listing.neighbourhood &&
        detail.neighbourhood &&
        listing.neighbourhood.toLowerCase() ===
          detail.neighbourhood.toLowerCase()
      ) {
        score += 6;
      }

      if (
        listing.category.toLowerCase() ===
        detail.primaryCategory.toLowerCase()
      ) {
        score += 5;
      }

      if (listing.type === currentType) {
        score += 2;
      }

      for (const term of
        listing.searchTerms ?? []) {
        if (
          detailTerms.has(
            term.toLowerCase()
          )
        ) {
          score += 1;
        }
      }

      return {
        listing,
        score
      };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) =>
      right.score - left.score
    )
    .slice(0, 6)
    .map(({ listing }) => listing);
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail =
    await getPublishedListingDetailBySlug(
      slug
    );

  if (!detail) {
    return {
      title: "Listing not found | Venture"
    };
  }

  return {
    title: `${detail.name} | Venture Winnipeg`,
    description:
      detail.shortDescription
  };
}

export default async function ListingPage({
  params
}: PageProps) {
  const { slug } = await params;
  const detail =
    await getPublishedListingDetailBySlug(
      slug
    );

  if (!detail) {
    notFound();
  }

  const relatedListings =
    await getRelatedListings(detail);
  const address =
    fullAddress(detail);
  const categories = [
    detail.primaryCategory,
    ...detail.secondaryCategories,
    ...detail.tags
  ].filter(
    (value, index, values) =>
      Boolean(value) &&
      values.indexOf(value) === index
  );
  const officialUrl =
    detail.officialWebsite ||
    detail.primarySourceUrl;
  const today = getTodayName();
  const currentStatus =
    detail.entityType === "place"
      ? getCurrentPlaceStatus(detail)
      : eventSchedule(detail);
  const currentPrice =
    detail.entityType === "place"
      ? placePrice(detail)
      : eventPrice(detail);
  const cuisineOrVenue =
    detail.entityType === "place"
      ? detail.cuisinePrimary ||
        detail.primaryCategory
      : detail.venueName ||
        detail.organizerName;
  const reservationOrTicketUrl =
    detail.entityType === "place"
      ? detail.reservationUrl
      : detail.ticketUrl;
  const detailDirectionsUrl =
    address ||
    (detail.latitude !== null &&
      detail.longitude !== null)
      ? directionsUrl(detail)
      : null;
  const freshnessExpired =
    isFreshnessExpired(detail);
  const experienceTags =
    detail.entityType === "place"
      ? [
          ...detail.dietaryOptions,
          ...detail.atmosphereTags,
          ...detail.goodFor
        ]
      : [
          detail.ageLabel,
          detail.indoorOutdoor,
          detail.organizerName
        ];
  const mergedExperienceTags = [
    ...experienceTags,
    ...categories
  ]
    .filter(Boolean)
    .filter(
      (value, index, values) =>
        values.indexOf(value) === index
    );
  const normalizedShortDescription =
    detail.shortDescription
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  const normalizedFullDescription =
    detail.fullDescription
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, " ") ?? "";
  const shouldShowFullDescription =
    Boolean(detail.fullDescription) &&
    normalizedFullDescription !==
      normalizedShortDescription &&
    !normalizedFullDescription.startsWith(
      normalizedShortDescription
    );
  const isBrandIcon =
    detail.imageUrl?.startsWith(
      "/listing-icons/"
    ) ?? false;
  const heroMediaStyle = detail.imageUrl
    ? {
        backgroundImage: `url("${detail.imageUrl.replaceAll(
          '"',
          "%22"
        )}")`
      }
    : undefined;

  const durationInput = {
    type:
      detail.entityType === "place"
        ? "restaurant" as const
        : "event" as const,
    name: detail.name,
    category: detail.primaryCategory,
    subtitle: detail.shortDescription,
    description:
      detail.fullDescription ??
      detail.shortDescription,
    placeType:
      detail.entityType === "place"
        ? detail.placeType
        : undefined,
    searchTerms: categories,
    startAt:
      detail.entityType === "event"
        ? detail.startAt
        : undefined,
    endAt:
      detail.entityType === "event"
        ? detail.endAt ?? undefined
        : undefined
  };

  const catalogueKind =
    getCatalogueKind(durationInput);

  const durationProfile =
    getSuggestedDurationProfile({
      ...durationInput,
      catalogueKind
    });

  const suggestedTimeLabel =
    formatDurationMinutes(
      durationProfile.suggestedMinutes
    );

  const listingSnapshot = {
    id: detail.id,
    slug: detail.slug,
    type:
      detail.entityType === "place"
        ? "restaurant" as const
        : "event" as const,
    name: detail.name,
    category: detail.primaryCategory,
    subtitle: detail.shortDescription,
    description:
      detail.fullDescription ??
      detail.shortDescription,
    statusLabel: currentStatus,
    statusTone:
      detail.entityType === "place" &&
      currentStatus.toLowerCase().includes("open")
        ? "green" as const
        : "purple" as const,
    timeOrHours: currentStatus,
    price: currentPrice,
    distance:
      detail.neighbourhood ?? "Winnipeg",
    verification:
      detail.verificationStatus,
    lastChecked:
      detail.sourceCheckedAt ?? "",
    imageClass: "listing-detail",
    imageUrl: detail.imageUrl,
    neighbourhood:
      detail.neighbourhood ?? "Winnipeg",
    catalogueKind,
    suggestedDurationMinutes:
      durationProfile.suggestedMinutes,
    minimumDurationMinutes:
      durationProfile.minimumMinutes,
    maximumDurationMinutes:
      durationProfile.maximumMinutes,
    durationSource:
      durationProfile.source,
    isFixedTime:
      durationProfile.isFixedTime,
    venueName:
      detail.entityType === "event"
        ? detail.venueName ?? undefined
        : undefined,
    address:
      address || undefined,
    officialUrl:
      officialUrl ?? undefined,
    ticketUrl:
      detail.entityType === "event"
        ? detail.ticketUrl ?? undefined
        : undefined,
    latitude:
      detail.latitude ?? undefined,
    longitude:
      detail.longitude ?? undefined,
    startAt:
      detail.entityType === "event"
        ? detail.startAt
        : undefined,
    endAt:
      detail.entityType === "event"
        ? detail.endAt ?? undefined
        : undefined,
    doorsAt:
      detail.entityType === "event"
        ? detail.doorsAt ?? undefined
        : undefined,
    timezone:
      detail.entityType === "event"
        ? detail.timezone
        : undefined,
    weeklyHours:
      detail.entityType === "place"
        ? detail.weeklyHours
        : undefined,
    placeType:
      detail.entityType === "place"
        ? detail.placeType
        : undefined,
    minimumPriceCad:
      detail.entityType === "event"
        ? detail.minimumPriceCad
        : undefined,
    maximumPriceCad:
      detail.entityType === "event"
        ? detail.maximumPriceCad
        : undefined,
    priceLevel:
      detail.entityType === "place"
        ? detail.priceLevel
        : undefined,
    ageLabel:
      detail.entityType === "event"
        ? detail.ageLabel
        : undefined,
    indoorOutdoor:
      detail.entityType === "event"
        ? detail.indoorOutdoor
        : undefined,
    searchTerms: categories
  };

  return (
    <main className={styles.page}>
      <section
        className={`${styles.hero} ${
          detail.imageUrl
            ? styles.heroWithMedia
            : ""
        }`}
      >
        {detail.imageUrl ? (
          <div
            className={`${styles.heroMedia} ${
              isBrandIcon
                ? styles.heroMediaLogo
                : ""
            }`}
            style={heroMediaStyle}
            role="img"
            aria-label={`Photo of ${detail.name}`}
          >
            <span className={styles.heroMediaBadge}>
              {detail.entityType === "event"
                ? "EVENT"
                : detail.primaryCategory}
            </span>
          </div>
        ) : null}

        <div className={styles.heroBody}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroTop}>
          <div>
            <p className={styles.eyebrow}>
              {detail.primaryCategory}
            </p>
            <h1>{detail.name}</h1>
          </div>

          <div className={styles.verified}>
            <span>✓</span>
            {verificationLabel(detail)}
          </div>
        </div>

        <p className={styles.shortDescription}>
          {detail.shortDescription}
        </p>

        {detail.neighbourhood || address ? (
          <div className={styles.heroLocation}>
            <span aria-hidden="true"><Icon name="pin" /></span>
            <div>
              <strong>
                {detail.neighbourhood || detail.city}
              </strong>
              {address ? <small>{address}</small> : null}
            </div>
          </div>
        ) : null}
        </div>
      </section>

      {freshnessExpired ? (
        <section
          className={styles.freshnessAlert}
          role="status"
        >
          <span aria-hidden="true">!</span>
          <div>
            <strong>Details need a fresh check</strong>
            <p>
              Venture has kept this listing visible, but some hours, prices or event details may have changed. Confirm before heading out.
            </p>
          </div>
        </section>
      ) : null}

      <section
        className={styles.factGrid}
        aria-label="Listing summary"
      >
        <article className={`${styles.fact} ${styles.factStatus}`}>
          <span className={styles.factIcon}><Icon name="clock" /></span>
          <div>
            <strong title={currentStatus}>{currentStatus}</strong>
            <span>
              {detail.entityType === "place" ? "Current status" : "Schedule"}
            </span>
          </div>
        </article>


        <article className={`${styles.fact} ${styles.factPrice}`}>
          <span className={styles.factIcon}><Icon name="price" /></span>
          <div>
            <strong>{currentPrice}</strong>
            <span>Price</span>
          </div>
        </article>

        <article className={`${styles.fact} ${styles.factDuration}`}>
          <span className={styles.factIcon}><Icon name="clock" /></span>
          <div>
            <strong>{suggestedTimeLabel}</strong>
            <span>
              {durationProfile.source === "official"
                ? "Official duration"
                : "Suggested time"}
            </span>
          </div>
        </article>

        <article className={`${styles.fact} ${styles.factCuisine}`}>
          <span className={styles.factIcon}><Icon name="spark" /></span>
          <div>
            <strong title={cuisineOrVenue || undefined}>
              {cuisineOrVenue}
            </strong>
            <span>
              {detail.entityType !== "place"
                ? "Venue"
                : catalogueKind === "food"
                  ? "Cuisine"
                  : catalogueKind === "activity"
                    ? "Experience"
                    : catalogueKind === "nightlife"
                      ? "Nightlife type"
                      : "Category"}
            </span>
          </div>
        </article>
      </section>


      <ListingDetailActionDock
        listing={listingSnapshot}
      />

      <section className={styles.actionSection}>
        <div className={styles.sectionHeadingCompact}>
          <span>USEFUL LINKS</span>
          <h2>Book, contact or mark it visited</h2>
        </div>

        <div className={styles.primaryActions}>
          {reservationOrTicketUrl ? (
            <a
              className={styles.actionAccent}
              href={reservationOrTicketUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className={styles.actionIcon}>
                <Icon
                  name={detail.entityType === "place" ? "reserve" : "ticket"}
                />
              </span>
              <div>
                <strong>
                  {detail.entityType === "place" ? "Reserve" : "Tickets"}
                </strong>
                <small>Open official booking</small>
              </div>
            </a>
          ) : null}

          <VisitButton
            listing={listingSnapshot}
          />
        </div>

        <div className={styles.secondaryActions}>
          {detail.entityType === "place" && detail.officialPhone ? (
            <a
              className={`${styles.secondaryAction} ${styles.secondaryCall}`}
              href={`tel:${detail.officialPhone}`}
              aria-label={`Call ${detail.officialPhone}`}
            >
              <span className={styles.secondaryActionIcon}><Icon name="phone" /></span>
              <strong>Call</strong>
            </a>
          ) : null}

          {officialUrl ? (
            <a
              className={`${styles.secondaryAction} ${styles.secondaryWebsite}`}
              href={officialUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className={styles.secondaryActionIcon}><Icon name="globe" /></span>
              <strong>Website</strong>
            </a>
          ) : null}

          {detail.entityType === "place" && detail.menuUrl ? (
            <a
              className={`${styles.secondaryAction} ${styles.secondaryMenu}`}
              href={detail.menuUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className={styles.secondaryActionIcon}><Icon name="menu" /></span>
              <strong>Menu</strong>
            </a>
          ) : null}

          {detail.entityType === "place" && detail.officialEmail ? (
            <a
              className={`${styles.secondaryAction} ${styles.secondaryEmail}`}
              href={`mailto:${detail.officialEmail}`}
              aria-label={`Email ${detail.name}`}
            >
              <span className={styles.secondaryActionIcon}><Icon name="mail" /></span>
              <strong>Email</strong>
            </a>
          ) : null}
        </div>

        <p className={styles.compassNote}>
          Booking and contact options open through the listing’s official channels whenever available.
        </p>
      </section>

      {shouldShowFullDescription ? (
        <section className={`${styles.section} ${styles.revealSection}`}>
          <div className={styles.sectionHeading}>
            <span>ABOUT THIS PLACE</span>
            <h2>The fuller picture</h2>
          </div>
          <details className={styles.storyDisclosure}>
            <summary>
              <span>Read the full story</span>
              <b aria-hidden="true">＋</b>
            </summary>
            <p className={styles.description}>
              {detail.fullDescription}
            </p>
          </details>
        </section>
      ) : null}

      {detail.warningMessage ? (
        <section className={`${styles.section} ${styles.revealSection}`}>
          <div className={styles.sectionHeading}>
            <span>BEFORE YOU GO</span>
            <h2>Important visitor note</h2>
          </div>
          <div className={styles.warning}>
            <span aria-hidden="true">!</span>
            <p>{detail.warningMessage}</p>
          </div>
        </section>
      ) : null}

      {detail.entityType === "place" ? (
        <section className={`${styles.section} ${styles.revealSection}`}>
          <div className={styles.sectionHeading}>
            <span>HOURS</span>
            <h2>When to go</h2>
          </div>

          <div className={styles.todayHours}>
            <span>Today</span>
            <strong>{getDayHours(detail, today)}</strong>
          </div>

          <details className={styles.disclosure}>
            <summary>
              <span>View the full weekly schedule</span>
              <b aria-hidden="true">⌄</b>
            </summary>
            <div className={styles.hours}>
              {DAY_ORDER.map((day) => (
                <div
                  className={`${styles.hourRow} ${
                    day === today
                      ? styles.today
                      : ""
                  }`}
                  key={day}
                >
                  <strong>{readable(day)}</strong>
                  <span>{getDayHours(detail, day)}</span>
                </div>
              ))}
            </div>
          </details>
        </section>
      ) : (
        <section className={`${styles.section} ${styles.revealSection}`}>
          <div className={styles.sectionHeading}>
            <span>EVENT DETAILS</span>
            <h2>Timing and entry</h2>
          </div>
          <div className={styles.detailList}>
            <article className={styles.detailItem}>
              <strong>Event schedule</strong>
              <p>{eventSchedule(detail)}</p>
            </article>
            {detail.doorsAt ? (
              <article className={styles.detailItem}>
                <strong>Doors</strong>
                <p>
                  {formatDate(
                    detail.doorsAt,
                    {
                      weekday: "long",
                      hour: "numeric",
                      minute: "2-digit"
                    },
                    detail.timezone
                  )}
                </p>
              </article>
            ) : null}
            <article className={styles.detailItem}>
              <strong>Entry</strong>
              <p>
                {eventPrice(detail)} · {readable(detail.ticketStatus)} · {detail.ageLabel}
              </p>
            </article>
          </div>
        </section>
      )}

      {detail.accessibilityNotes ||
      detail.transitNotes ||
      detail.parkingNotes ||
      (detailDirectionsUrl &&
        detail.latitude !== null &&
        detail.longitude !== null) ? (
        <section className={`${styles.section} ${styles.revealSection} ${styles.arrivalSection}`}>
          <div className={styles.sectionHeading}>
            <span>GETTING THERE</span>
            <h2>Map, transit and access</h2>
          </div>

          {detailDirectionsUrl &&
          detail.latitude !== null &&
          detail.longitude !== null ? (
            <ListingDetailMap
              latitude={detail.latitude}
              longitude={detail.longitude}
              name={detail.name}
              neighbourhood={
                detail.neighbourhood ||
                detail.city
              }
              directionsUrl={detailDirectionsUrl}
            />
          ) : null}

          <div className={styles.visitDisclosures}>
            {detail.accessibilityNotes ? (
              <details className={styles.disclosureCard}>
                <summary>
                  <span aria-hidden="true">♿</span>
                  <strong>Accessibility</strong>
                  <b aria-hidden="true">＋</b>
                </summary>
                <p>{detail.accessibilityNotes}</p>
              </details>
            ) : null}

            {detail.transitNotes ? (
              <details className={styles.disclosureCard}>
                <summary>
                  <span aria-hidden="true">↔</span>
                  <strong>Transit</strong>
                  <b aria-hidden="true">＋</b>
                </summary>
                <p>{detail.transitNotes}</p>
              </details>
            ) : null}

            {detail.parkingNotes ? (
              <details className={styles.disclosureCard}>
                <summary>
                  <span aria-hidden="true">P</span>
                  <strong>Parking</strong>
                  <b aria-hidden="true">＋</b>
                </summary>
                <p>{detail.parkingNotes}</p>
              </details>
            ) : null}
          </div>
        </section>
      ) : null}

      {mergedExperienceTags.length > 0 ? (
        <section className={`${styles.section} ${styles.revealSection} ${styles.experienceSection}`}>
          <div className={styles.sectionHeading}>
            <span>WHAT TO EXPECT</span>
            <h2>Experience, atmosphere and fit</h2>
          </div>
          <div className={styles.experienceChips}>
            {mergedExperienceTags
              .slice(0, 12)
              .map((value, index) => (
                <span
                  className={
                    index % 4 === 0
                      ? styles.experienceYellow
                      : index % 4 === 1
                        ? styles.experiencePink
                        : index % 4 === 2
                          ? styles.experienceGreen
                          : styles.experienceCream
                  }
                  key={value}
                >
                  {readable(value)}
                </span>
              ))}
          </div>
        </section>
      ) : null}

      {relatedListings.length > 0 ? (
        <section className={`${styles.section} ${styles.relatedSection}`}>
          <div className={styles.relatedHeading}>
            <div className={styles.sectionHeading}>
              <span>KEEP EXPLORING</span>
              <h2>Nearby and similar picks</h2>
            </div>

            <Link href="/explore">
              Explore all
              <b aria-hidden="true">→</b>
            </Link>
          </div>

          <div className={styles.relatedRail}>
            {relatedListings.map((listing) => (
              <div
                className={styles.relatedCard}
                key={`${listing.type}-${listing.id}`}
              >
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`${styles.trustSection} ${styles.revealSection}`}>
        <div className={styles.sectionHeading}>
          <span>SOURCE & UPDATES</span>
          <h2>Where the information comes from</h2>
        </div>

        <div className={styles.trustRows}>
          <div className={styles.trustRow}>
            <b>✓</b>
            <div>
              <strong>{verificationLabel(detail)}</strong>
              <small>
                Checked {formatDate(detail.sourceCheckedAt)}
              </small>
            </div>
          </div>

          <div className={styles.trustRow}>
            <b>↗</b>
            <div>
              <strong>Official or traceable source</strong>
              <small>
                Listing facts are kept separate from paid promotion and can be reported when something changes.
              </small>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.communityActions}>
        {detail.entityType === "place" ? (
          <ClaimListingForm
            placeId={detail.id}
            listingName={detail.name}
          />
        ) : null}

        <ReportIssueForm
          entityId={detail.id}
          entityType={detail.entityType}
          listingName={detail.name}
        />
      </section>
    </main>
  );
}
