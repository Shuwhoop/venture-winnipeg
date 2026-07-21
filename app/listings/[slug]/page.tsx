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
  ReportIssueForm
} from "@/components/report-issue-form";
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

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
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
      </section>

      <section
        className={styles.factGrid}
        aria-label="Listing summary"
      >
        <article className={styles.fact}>
          <strong>
            {detail.entityType === "place"
              ? getCurrentPlaceStatus(detail)
              : eventSchedule(detail)}
          </strong>
          <span>
            {detail.entityType === "place" ? "Current status" : "Schedule"}
          </span>
        </article>

        <article className={styles.fact}>
          <strong>
            {detail.neighbourhood ||
              "Winnipeg"}
          </strong>
          <span>Neighbourhood</span>
        </article>

        <article className={styles.fact}>
          <strong>
            {detail.entityType === "place"
              ? placePrice(detail)
              : eventPrice(detail)}
          </strong>
          <span>Price</span>
        </article>

        <article className={styles.fact}>
          <strong>
            {detail.entityType === "place"
              ? detail.cuisinePrimary ||
                detail.primaryCategory
              : detail.venueName ||
                detail.organizerName}
          </strong>
          <span>
            {detail.entityType === "place" ? "Cuisine" : "Venue"}
          </span>
        </article>
      </section>

      <section className={styles.actionSection}>
        <div className={styles.actions}>
          {address ? (
            <a
              href={directionsUrl(detail)}
              target="_blank"
              rel="noreferrer"
            >
              Address & directions
            </a>
          ) : null}

          {detail.entityType === "place" && detail.officialPhone ? (
            <a href={`tel:${detail.officialPhone}`}>
              Call {detail.officialPhone}
            </a>
          ) : null}

          {officialUrl ? (
            <a
              href={officialUrl}
              target="_blank"
              rel="noreferrer"
            >
              Official website
            </a>
          ) : null}

          {detail.entityType === "place" && detail.officialEmail ? (
            <a href={`mailto:${detail.officialEmail}`}>
              Email business
            </a>
          ) : null}

          {detail.entityType === "place" && detail.menuUrl ? (
            <a
              href={detail.menuUrl}
              target="_blank"
              rel="noreferrer"
            >
              View menu
            </a>
          ) : null}

          {detail.entityType === "place" && detail.reservationUrl ? (
            <a
              href={detail.reservationUrl}
              target="_blank"
              rel="noreferrer"
            >
              Reserve
            </a>
          ) : null}

          {detail.entityType === "event" && detail.ticketUrl ? (
            <a
              href={detail.ticketUrl}
              target="_blank"
              rel="noreferrer"
            >
              Tickets
            </a>
          ) : null}
        </div>

        <p className={styles.compassNote}>
          Directions may open in Google Maps. Venture uses mapping services as a compass, while listing facts come from official or independently verified sources.
        </p>
      </section>

      {detail.fullDescription ? (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>ABOUT</span>
            <h2>Why it is worth knowing</h2>
          </div>
          <p className={styles.description}>
            {detail.fullDescription}
          </p>
        </section>
      ) : null}

      {detail.warningMessage ? (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>BEFORE YOU GO</span>
            <h2>Important visitor note</h2>
          </div>
          <div className={styles.warning}>
            {detail.warningMessage}
          </div>
        </section>
      ) : null}

      {detail.entityType === "place" ? (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>HOURS</span>
            <h2>Weekly schedule</h2>
          </div>

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
        </section>
      ) : (
        <section className={styles.section}>
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

      {address ||
      detail.accessibilityNotes ||
      detail.transitNotes ||
      detail.parkingNotes ? (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>PLAN THE VISIT</span>
            <h2>Getting there and access</h2>
          </div>

          <div className={styles.detailList}>
            {address ? (
              <article className={styles.detailItem}>
                <strong>Address</strong>
                <p>{address}</p>
              </article>
            ) : null}

            {detail.accessibilityNotes ? (
              <article className={styles.detailItem}>
                <strong>Accessibility</strong>
                <p>{detail.accessibilityNotes}</p>
              </article>
            ) : null}

            {detail.transitNotes ? (
              <article className={styles.detailItem}>
                <strong>Transit</strong>
                <p>{detail.transitNotes}</p>
              </article>
            ) : null}

            {detail.parkingNotes ? (
              <article className={styles.detailItem}>
                <strong>Parking</strong>
                <p>{detail.parkingNotes}</p>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      {categories.length > 0 ? (
        <section className={styles.section}>
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

      <section className={styles.trustSection}>
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
    </main>
  );
}
