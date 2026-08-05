import "server-only";

import { reportDataAccessError } from "@/lib/network-errors";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Listing,
  VerificationStatus
} from "@/lib/types";
import {
  hasPublishablePhotoRights
} from "@/lib/media/photo-rights";

type VenueRow = {
  name: string;
  neighbourhood: string | null;
  address_line1: string;
  latitude: number;
  longitude: number;
};

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  full_description: string | null;
  primary_category: string;
  secondary_categories: string[] | null;
  tags: string[] | null;

  organizer_name: string;
  organizer_website: string | null;

  start_at: string;
  end_at: string | null;
  doors_at: string | null;
  timezone: string;

  price_type:
    | "free"
    | "fixed"
    | "range"
    | "donation"
    | "unknown";

  minimum_price_cad: number | string | null;
  maximum_price_cad: number | string | null;

  ticket_url: string | null;
  ticket_status: string;

  age_label: string;
  indoor_outdoor: string;

  verification_status: VerificationStatus;
  warning_message: string | null;
  source_checked_at: string | null;
  image_url: string | null;
  image_rights_notes: string | null;

  venue: VenueRow | VenueRow[] | null;
};

export const eventFields = `
  id,
  slug,
  title,
  short_description,
  full_description,
  primary_category,
  secondary_categories,
  tags,
  organizer_name,
  organizer_website,
  start_at,
  end_at,
  doors_at,
  timezone,
  price_type,
  minimum_price_cad,
  maximum_price_cad,
  ticket_url,
  ticket_status,
  age_label,
  indoor_outdoor,
  verification_status,
  warning_message,
  source_checked_at,
  image_url,
  image_rights_notes,
  venue:places (
    name,
    neighbourhood,
    address_line1,
    latitude,
    longitude
  )
`;

function getVenue(
  venue: VenueRow | VenueRow[] | null
): VenueRow | null {
  if (Array.isArray(venue)) {
    return venue[0] ?? null;
  }

  return venue;
}

function formatMoney(
  value: number | string | null
): string | null {
  if (value === null) {
    return null;
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return null;
  }

  return Number.isInteger(amount)
    ? `$${amount}`
    : `$${amount.toFixed(2)}`;
}
  function getNumericPrice(
    value: number | string | null
  ): number | null {
    if (value === null) {
      return null;
    }

    const amount = Number(value);

    return Number.isFinite(amount)
      ? amount
      : null;
  }

function formatEventPrice(event: EventRow): string {
  const minimum = formatMoney(
    event.minimum_price_cad
  );

  const maximum = formatMoney(
    event.maximum_price_cad
  );

  switch (event.price_type) {
    case "free":
      return "Free";

    case "donation":
      return "Donation";

    case "fixed":
      return minimum ?? "Paid";

    case "range":
      if (minimum && maximum) {
        return `${minimum}–${maximum}`;
      }

      return minimum ?? maximum ?? "Paid";

    default:
      return "Price unknown";
  }
}

function getDateKey(
  date: Date,
  timezone: string
): string {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

function formatEventSchedule(event: EventRow): string {
  const timezone =
    event.timezone || "America/Winnipeg";

  const start = new Date(event.start_at);

  const dateFormatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric"
    }
  );

  const timeFormatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit"
    }
  );

  const startDate = dateFormatter.format(start);
  const startTime = timeFormatter.format(start);

  if (!event.end_at) {
    return `${startDate} · ${startTime}`;
  }

  const end = new Date(event.end_at);

  const eventStartsAndEndsSameDay =
    getDateKey(start, timezone) ===
    getDateKey(end, timezone);

  if (eventStartsAndEndsSameDay) {
    return `${startDate} · ${startTime}–${timeFormatter.format(
      end
    )}`;
  }

  return `${startDate}–${dateFormatter.format(
    end
  )}`;
}

function getStatusLabel(event: EventRow): string {
  const timezone =
    event.timezone || "America/Winnipeg";

  const now = new Date();
  const start = new Date(event.start_at);
  const end = event.end_at
    ? new Date(event.end_at)
    : null;

  if (
    now.getTime() >= start.getTime() &&
    (!end || now.getTime() <= end.getTime())
  ) {
    return "HAPPENING";
  }

  if (
    getDateKey(now, timezone) ===
    getDateKey(start, timezone)
  ) {
    return "TODAY";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    month: "short",
    day: "numeric"
  })
    .format(start)
    .toUpperCase();
}

function formatLastChecked(
  sourceCheckedAt: string | null,
  timezone: string
): string {
  if (!sourceCheckedAt) {
    return "Source check pending";
  }

  const checkedDate = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  ).format(new Date(sourceCheckedAt));

  return `Source checked ${checkedDate}`;
}

export function eventToListing(event: EventRow): Listing {
  const venue = getVenue(event.venue);
  const approvedImageUrl =
    event.image_url &&
    hasPublishablePhotoRights(
      event.image_rights_notes
    )
      ? event.image_url
      : null;
  const statusLabel = getStatusLabel(event);

  const setting =
    event.indoor_outdoor === "indoor"
      ? "Indoor"
      : event.indoor_outdoor === "outdoor"
        ? "Outdoor"
        : "Winnipeg event";

  return {
    id: event.id,
    slug: event.slug,
    type: "event",

    name: event.title,
    category: event.primary_category,
    subtitle: `${event.primary_category} · ${setting}`,

    statusLabel,
    statusTone:
      statusLabel === "HAPPENING"
        ? "green"
        : "purple",

    timeOrHours: formatEventSchedule(event),
    price: formatEventPrice(event),

    distance:
      venue?.name ??
      event.organizer_name ??
      "Winnipeg",

    verification: event.verification_status,

    lastChecked: formatLastChecked(
      event.source_checked_at,
      event.timezone
    ),

    imageClass: approvedImageUrl ? "image-uploaded" : "image-concert",

    imageUrl: approvedImageUrl,

    neighbourhood:
      venue?.neighbourhood ?? "Winnipeg",

    description:
      event.full_description ??
      event.short_description,

    venueName: venue?.name,
    address: venue?.address_line1,

    latitude:
      venue?.latitude,

    longitude:
      venue?.longitude,

    officialUrl:
      event.organizer_website ?? undefined,
    ticketUrl:
      event.ticket_url ?? undefined,

    startAt: event.start_at,

    endAt:
      event.end_at ?? undefined,

    doorsAt:
      event.doors_at ?? undefined,

    timezone:
      event.timezone ||
      "America/Winnipeg",

    minimumPriceCad:
      getNumericPrice(
        event.minimum_price_cad
      ),

    maximumPriceCad:
      getNumericPrice(
        event.maximum_price_cad
      ),

    ageLabel:
      event.age_label,

    indoorOutdoor:
      event.indoor_outdoor,

    searchTerms: [
      event.primary_category,
      ...(event.secondary_categories ?? []),
      ...(event.tags ?? []),
      event.age_label,
      event.indoor_outdoor
    ].filter(Boolean)
  };
}

export async function getPublishedEventListings(
  limit = 25
): Promise<Listing[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("events")
    .select(eventFields)
    .eq("status", "published")
    .gt("expires_at", new Date().toISOString())
    .order("start_at", {
      ascending: true
    })
    .limit(limit);

  if (error) {
    reportDataAccessError(
      "Unable to load published events",
      error
    );

    return [];
  }

  return (
    (data ?? []) as unknown as EventRow[]
  ).map(eventToListing);
}

export async function getPublishedEventListingBySlug(
  slug: string
): Promise<Listing | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("events")
    .select(eventFields)
    .eq("slug", slug)
    .eq("status", "published")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    reportDataAccessError(
      `Unable to load event ${slug}`,
      error
    );

    return null;
  }

  if (!data) {
    return null;
  }

  return eventToListing(
    data as unknown as EventRow
  );
}