import type {
  Metadata
} from "next";
import {
  notFound
} from "next/navigation";

import {
  ClaimListingForm
} from "@/components/claim-listing-form";
import {
  ListingDetailAnalytics
} from "@/components/analytics/listing-detail-analytics";
import {
  ListingDetailActionDock
} from "@/components/listing-detail-action-dock";
import {
  ListingPhotoFrame
} from "@/components/listing-photo-frame";
import {
  ReportIssueForm
} from "@/components/report-issue-form";
import {
  VisitButton
} from "@/components/visit-button";
import {
  getPublishedListingDetailBySlug,
  type PublicEventDetail,
  type PublicListingDetail,
  type PublicPlaceDetail
} from "@/lib/data/listing-detail";

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
      detail.shortDescription,
    openGraph: detail.photo
      ? {
          images: [
            {
              url: detail.photo.url,
              alt: detail.photo.altText || detail.name
            }
          ]
        }
      : undefined
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
  const listingDirectionsUrl = address
    ? directionsUrl(detail)
    : null;

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
    imageClass: detail.photo
      ? "image-uploaded"
      : "listing-detail",
    imageUrl: detail.photo?.url ?? null,
    neighbourhood:
      detail.neighbourhood ?? "Winnipeg",
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
      <ListingDetailAnalytics
        listing={listingSnapshot}
      />

      <ListingPhotoFrame
        name={detail.name}
        entityType={detail.entityType}
        category={detail.primaryCategory}
        photo={detail.photo}
      />

      <section className={styles.hero}>
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
      </section>

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

        <article className={`${styles.fact} ${styles.factNeighbourhood}`}>
          <span className={styles.factIcon}><Icon name="pin" /></span>
          <div>
            <strong title={detail.neighbourhood || "Winnipeg"}>
              {detail.neighbourhood || "Winnipeg"}
            </strong>
            <span>Neighbourhood</span>
          </div>
        </article>

        <article className={`${styles.fact} ${styles.factPrice}`}>
          <span className={styles.factIcon}><Icon name="price" /></span>
          <div>
            <strong>{currentPrice}</strong>
            <span>Price</span>
          </div>
        </article>

        <article className={`${styles.fact} ${styles.factCuisine}`}>
          <span className={styles.factIcon}><Icon name="spark" /></span>
          <div>
            <strong title={cuisineOrVenue || undefined}>
              {cuisineOrVenue}
            </strong>
            <span>
              {detail.entityType === "place" ? "Cuisine" : "Venue"}
            </span>
          </div>
        </article>
      </section>

      <section className={styles.actionSection}>
        <div className={styles.sectionHeadingCompact}>
          <span>QUICK ACTIONS</span>
          <h2>Make the next move</h2>
        </div>

        <div className={styles.primaryActions}>
          {address ? (
            <a
              className={styles.actionPrimary}
              href={listingDirectionsUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              <span className={styles.actionIcon}><Icon name="directions" /></span>
              <div>
                <strong>Directions</strong>
                <small>{detail.neighbourhood || detail.city}</small>
              </div>
            </a>
          ) : null}

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
          Directions may open in Google Maps. Venture uses maps as a compass, while listing facts come from official or independently verified sources.
        </p>
      </section>

      {detail.fullDescription ? (
        <section className={`${styles.section} ${styles.revealSection}`}>
          <div className={styles.sectionHeading}>
            <span>ABOUT</span>
            <h2>Why it is worth knowing</h2>
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

      <section className={`${styles.section} ${styles.revealSection}`}>
          <div className={styles.sectionHeading}>
            <span>PLAN THE VISIT</span>
            <h2>Getting there and access</h2>
          </div>

          {address ? (
            <a
              className={styles.addressCard}
              href={listingDirectionsUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              <span aria-hidden="true">⌖</span>
              <div>
                <strong>{address}</strong>
                <small>Open directions</small>
              </div>
              <b aria-hidden="true">↗</b>
            </a>
          ) : null}

          <div className={styles.visitDisclosures}>
            <details className={styles.disclosureCard}>
              <summary>
                <span aria-hidden="true">♿</span>
                <strong>Accessibility</strong>
                <b aria-hidden="true">＋</b>
              </summary>
              <p>
                {detail.accessibilityNotes ||
                  "Accessibility details have not been confirmed yet."}
              </p>
            </details>

            <details className={styles.disclosureCard}>
              <summary>
                <span aria-hidden="true">↔</span>
                <strong>Transit</strong>
                <b aria-hidden="true">＋</b>
              </summary>
              <p>
                {detail.transitNotes ||
                  "Transit notes have not been confirmed yet."}
              </p>
            </details>

            <details className={styles.disclosureCard}>
              <summary>
                <span aria-hidden="true">P</span>
                <strong>Parking</strong>
                <b aria-hidden="true">＋</b>
              </summary>
              <p>
                {detail.parkingNotes ||
                  "Parking information has not been confirmed yet."}
              </p>
            </details>
          </div>
        </section>

      {categories.length > 0 ? (
        <section className={`${styles.section} ${styles.revealSection}`}>
          <div className={styles.sectionHeading}>
            <span>GOOD TO KNOW</span>
            <h2>Categories and atmosphere</h2>
          </div>
          <div className={styles.chips}>
            {categories.map((category) => (
              <span key={category}>
                {readable(category)}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`${styles.trustSection} ${styles.revealSection}`}>
        <div className={styles.sectionHeading}>
          <span>SAFE & TRANSPARENT</span>
          <h2>How Venture handles this listing</h2>
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
                Venture stores source information separately from organic ranking and paid promotion.
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

      <ListingDetailActionDock
        listing={listingSnapshot}
        directionsUrl={listingDirectionsUrl}
      />
    </main>
  );
}
