import {
  NextResponse
} from "next/server";

import {
  getPublishedEventListings
} from "@/lib/data/events";

import {
  getPublishedPlaceListings
} from "@/lib/data/places";

import type {
  Listing,
  VerificationStatus
} from "@/lib/types";

const WINNIPEG_TIMEZONE =
  "America/Winnipeg";

const trustedStatuses =
  new Set<VerificationStatus>([
    "official_source",
    "verified_venture",
    "verified_business"
  ]);

type StopKind =
  | "food"
  | "event"
  | "drinks";

function normalize(
  value: string
): string {
  return value
    .trim()
    .toLowerCase();
}

function getListingText(
  listing: Listing
): string {
  return [
    listing.name,
    listing.category,
    listing.subtitle,
    listing.description,
    listing.neighbourhood,
    listing.venueName ?? "",
    listing.address ?? "",
    listing.placeType ?? "",
    ...(listing.searchTerms ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isAlcoholFocused(
  listing: Listing
): boolean {
  const text =
    getListingText(listing);

  return (
    listing.placeType ===
      "bar_pub" ||
    listing.placeType ===
      "brewery" ||
    [
      "nightclub",
      "cocktail",
      "brewery",
      "bar",
      "pub",
      "taproom",
      "nightlife"
    ].some(
      (keyword) =>
        text.includes(keyword)
    )
  );
}

function getListingKind(
  listing: Listing
): StopKind {
  if (
    listing.type ===
    "event"
  ) {
    return "event";
  }

  return isAlcoholFocused(
    listing
  )
    ? "drinks"
    : "food";
}

function getDateKey(
  value: string,
  timezone: string
): string | null {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value;

  return year &&
    month &&
    day
    ? `${year}-${month}-${day}`
    : null;
}

function getListingKey(
  listing: Listing
): string {
  return `${listing.type}-${listing.id}`;
}

export async function GET(
  request: Request
) {
  const url =
    new URL(request.url);

  const date =
    url.searchParams.get(
      "date"
    );

  const query =
    normalize(
      url.searchParams.get(
        "q"
      ) ?? ""
    );

  const kind =
    url.searchParams.get(
      "kind"
    );

  const requestedLimit =
    Number(
      url.searchParams.get(
        "limit"
      ) ?? 100
    );

  const limit =
    Number.isFinite(
      requestedLimit
    )
      ? Math.min(
          200,
          Math.max(
            20,
            Math.round(
              requestedLimit
            )
          )
        )
      : 100;

  const [
    events,
    places
  ] = await Promise.all([
    getPublishedEventListings(
      limit
    ),
    getPublishedPlaceListings(
      limit
    )
  ]);

  const options = [
    ...events,
    ...places
  ]
    .filter(
      (listing) =>
        trustedStatuses.has(
          listing.verification
        )
    )
    .filter(
      (listing) => {
        if (
          !date ||
          listing.type !==
            "event" ||
          !listing.startAt
        ) {
          return true;
        }

        return (
          getDateKey(
            listing.startAt,
            listing.timezone ||
              WINNIPEG_TIMEZONE
          ) === date
        );
      }
    )
    .map(
      (listing) => ({
        listing,
        kind:
          getListingKind(
            listing
          )
      })
    )
    .filter(
      ({
        listing,
        kind:
          listingKind
      }) => {
        if (
          kind &&
          kind !== "all" &&
          listingKind !== kind
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        return getListingText(
          listing
        ).includes(query);
      }
    )
    .sort(
      (first, second) => {
        if (
          first.listing.type ===
            "event" &&
          second.listing.type !==
            "event"
        ) {
          return -1;
        }

        if (
          second.listing.type ===
            "event" &&
          first.listing.type !==
            "event"
        ) {
          return 1;
        }

        if (
          first.listing.startAt &&
          second.listing.startAt
        ) {
          return (
            new Date(
              first.listing.startAt
            ).getTime() -
            new Date(
              second.listing.startAt
            ).getTime()
          );
        }

        return (
          (second.listing.rating ??
            0) -
          (first.listing.rating ??
            0)
        );
      }
    )
    .slice(0, limit)
    .map(
      ({
        listing,
        kind:
          listingKind
      }) => ({
        key:
          getListingKey(
            listing
          ),
        id: listing.id,
        slug: listing.slug,
        type: listing.type,
        kind:
          listingKind,
        name: listing.name,
        category:
          listing.category,
        subtitle:
          listing.subtitle,
        neighbourhood:
          listing.neighbourhood,
        timeOrHours:
          listing.timeOrHours,
        price: listing.price,
        startAt:
          listing.startAt
      })
    );

  const counts = {
    food:
      options.filter(
        (option) =>
          option.kind ===
          "food"
      ).length,
    event:
      options.filter(
        (option) =>
          option.kind ===
          "event"
      ).length,
    drinks:
      options.filter(
        (option) =>
          option.kind ===
          "drinks"
      ).length
  };

  return NextResponse.json({
    options,
    counts,
    date
  });
}
