import "server-only";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";
import type {
  VentureAdmin
} from "@/lib/auth/admin";
import type {
  AdminEventEditorRecord,
  AdminListingEditorData,
  AdminListingEntityType,
  AdminListingSource,
  AdminListingUpdateResult,
  AdminPlaceEditorRecord,
  AdminVenueOption
} from "@/lib/admin/listing-editor-types";

const MANUAL_SOURCE_NAME =
  "Venture admin research";

const LISTING_STATUSES = new Set([
  "draft",
  "published",
  "cancelled",
  "expired",
  "temporarily_closed",
  "permanently_closed",
  "archived"
]);

const VERIFICATION_STATUSES = new Set([
  "official_source",
  "verified_venture",
  "verified_business",
  "community_reported",
  "unverified"
]);

const PLACE_TYPES = new Set([
  "restaurant",
  "cafe",
  "bakery_dessert",
  "bar_pub",
  "brewery",
  "food_truck",
  "fast_casual",
  "fine_dining",
  "late_night_food",
  "market",
  "event_venue",
  "activity",
  "attraction"
]);

const EVENT_PRICE_TYPES = new Set([
  "free",
  "fixed",
  "range",
  "donation",
  "unknown"
]);

function text(
  value: unknown,
  maxLength = 5000
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function nullableText(
  value: unknown,
  maxLength = 5000
): string | null {
  const cleaned = text(
    value,
    maxLength
  );

  return cleaned || null;
}

function requiredText(
  value: unknown,
  label: string,
  maxLength = 5000
): string {
  const cleaned = text(
    value,
    maxLength
  );

  if (!cleaned) {
    throw new Error(
      `${label} is required.`
    );
  }

  return cleaned;
}

function normalizeSlug(
  value: unknown
): string {
  const slug = requiredText(
    value,
    "Slug",
    160
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error(
      "Slug must include letters or numbers."
    );
  }

  return slug;
}

function stringArray(
  value: unknown,
  maxItems = 40
): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return Array.from(
    new Set(
      source
        .filter(
          (item): item is string =>
            typeof item === "string"
        )
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.slice(0, 80))
    )
  ).slice(0, maxItems);
}

function nullableNumber(
  value: unknown,
  label: string
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `${label} must be a valid number.`
    );
  }

  return parsed;
}

function integerOrNull(
  value: unknown,
  label: string
): number | null {
  const parsed = nullableNumber(
    value,
    label
  );

  if (parsed === null) {
    return null;
  }

  if (!Number.isInteger(parsed)) {
    throw new Error(
      `${label} must be a whole number.`
    );
  }

  return parsed;
}

function isoOrNull(
  value: unknown,
  label: string
): string | null {
  const cleaned = text(
    value,
    100
  );

  if (!cleaned) {
    return null;
  }

  const date = new Date(cleaned);

  if (!Number.isFinite(date.getTime())) {
    throw new Error(
      `${label} is not a valid date or time.`
    );
  }

  return date.toISOString();
}

function isoRequired(
  value: unknown,
  label: string
): string {
  const parsed = isoOrNull(
    value,
    label
  );

  if (!parsed) {
    throw new Error(
      `${label} is required.`
    );
  }

  return parsed;
}

function safeWeeklyHours(
  value: unknown
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Weekly hours could not be read."
    );
  }

  const allowedDays = new Set([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ]);

  const result: Record<
    string,
    unknown
  > = {};

  for (const [day, raw] of Object.entries(value)) {
    if (!allowedDays.has(day)) {
      continue;
    }

    if (
      raw &&
      typeof raw === "object" &&
      !Array.isArray(raw)
    ) {
      const entry = raw as Record<
        string,
        unknown
      >;

      if (entry.closed === true) {
        result[day] = {
          closed: true
        };
        continue;
      }

      const open = text(
        entry.open,
        5
      );
      const close = text(
        entry.close,
        5
      );

      if (
        !/^\d{2}:\d{2}$/.test(open) ||
        !/^\d{2}:\d{2}$/.test(close)
      ) {
        throw new Error(
          `${day} hours must include valid open and close times.`
        );
      }

      result[day] = {
        open,
        close
      };
    }
  }

  return result;
}

function asObject(
  value: unknown
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "The submitted listing data could not be read."
    );
  }

  return value as Record<
    string,
    unknown
  >;
}

function getSource(
  rows: Array<{
    id: string;
    source_url: string;
    last_checked_at: string | null;
    is_primary: boolean;
  }> | null
): AdminListingSource {
  const source =
    rows?.find((row) => row.is_primary) ??
    rows?.[0] ??
    null;

  return {
    id: source?.id ?? null,
    sourceUrl: source?.source_url ?? "",
    lastCheckedAt:
      source?.last_checked_at ?? null
  };
}

function normalizePlaceRow(
  row: Record<string, unknown>,
  source: AdminListingSource
): AdminPlaceEditorRecord {
  return {
    entityType: "place",
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    shortDescription:
      String(row.short_description ?? ""),
    fullDescription:
      String(row.full_description ?? ""),
    placeType:
      String(row.place_type ?? "restaurant"),
    primaryCategory:
      String(row.primary_category ?? ""),
    secondaryCategories:
      Array.isArray(row.secondary_categories)
        ? row.secondary_categories.filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],
    tags:
      Array.isArray(row.tags)
        ? row.tags.filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],
    addressLine1:
      String(row.address_line1 ?? ""),
    addressLine2:
      String(row.address_line2 ?? ""),
    city: String(row.city ?? "Winnipeg"),
    province:
      String(row.province ?? "Manitoba"),
    postalCode:
      String(row.postal_code ?? ""),
    neighbourhood:
      String(row.neighbourhood ?? ""),
    latitude:
      typeof row.latitude === "number"
        ? row.latitude
        : null,
    longitude:
      typeof row.longitude === "number"
        ? row.longitude
        : null,
    officialPhone:
      String(row.official_phone ?? ""),
    officialEmail:
      String(row.official_email ?? ""),
    officialWebsite:
      String(row.official_website ?? ""),
    priceLevel:
      typeof row.price_level === "number"
        ? row.price_level
        : null,
    cuisinePrimary:
      String(row.cuisine_primary ?? ""),
    weeklyHours:
      row.weekly_hours &&
      typeof row.weekly_hours === "object" &&
      !Array.isArray(row.weekly_hours)
        ? row.weekly_hours as Record<
            string,
            unknown
          >
        : {},
    openStatus:
      String(row.open_status ?? "unknown"),
    menuUrl:
      String(row.menu_url ?? ""),
    reservationUrl:
      String(row.reservation_url ?? ""),
    accessibilityNotes:
      String(row.accessibility_notes ?? ""),
    parkingNotes:
      String(row.parking_notes ?? ""),
    transitNotes:
      String(row.transit_notes ?? ""),
    status: String(row.status ?? "draft"),
    verificationStatus:
      String(row.verification_status ?? "unverified"),
    warningMessage:
      String(row.warning_message ?? ""),
    sourceCheckedAt:
      typeof row.source_checked_at === "string"
        ? row.source_checked_at
        : null,
    freshnessExpiresAt:
      typeof row.freshness_expires_at === "string"
        ? row.freshness_expires_at
        : null,
    source
  };
}

function normalizeEventRow(
  row: Record<string, unknown>,
  source: AdminListingSource
): AdminEventEditorRecord {
  return {
    entityType: "event",
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    shortDescription:
      String(row.short_description ?? ""),
    fullDescription:
      String(row.full_description ?? ""),
    primaryCategory:
      String(row.primary_category ?? ""),
    secondaryCategories:
      Array.isArray(row.secondary_categories)
        ? row.secondary_categories.filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],
    tags:
      Array.isArray(row.tags)
        ? row.tags.filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],
    venueId: String(row.venue_id ?? ""),
    organizerName:
      String(row.organizer_name ?? ""),
    organizerWebsite:
      String(row.organizer_website ?? ""),
    startAt: String(row.start_at ?? ""),
    endAt:
      typeof row.end_at === "string"
        ? row.end_at
        : null,
    doorsAt:
      typeof row.doors_at === "string"
        ? row.doors_at
        : null,
    timezone:
      String(row.timezone ?? "America/Winnipeg"),
    priceType:
      String(row.price_type ?? "unknown"),
    minimumPriceCad:
      typeof row.minimum_price_cad === "number"
        ? row.minimum_price_cad
        : row.minimum_price_cad === null
          ? null
          : Number(row.minimum_price_cad),
    maximumPriceCad:
      typeof row.maximum_price_cad === "number"
        ? row.maximum_price_cad
        : row.maximum_price_cad === null
          ? null
          : Number(row.maximum_price_cad),
    feesIncluded:
      typeof row.fees_included === "boolean"
        ? row.fees_included
        : null,
    ticketUrl:
      String(row.ticket_url ?? ""),
    ticketStatus:
      String(row.ticket_status ?? "unknown"),
    ageMinimum:
      typeof row.age_minimum === "number"
        ? row.age_minimum
        : null,
    ageLabel:
      String(row.age_label ?? "unknown"),
    indoorOutdoor:
      String(row.indoor_outdoor ?? "unknown"),
    accessibilityNotes:
      String(row.accessibility_notes ?? ""),
    parkingNotes:
      String(row.parking_notes ?? ""),
    transitNotes:
      String(row.transit_notes ?? ""),
    status: String(row.status ?? "draft"),
    verificationStatus:
      String(row.verification_status ?? "unverified"),
    warningMessage:
      String(row.warning_message ?? ""),
    sourceCheckedAt:
      typeof row.source_checked_at === "string"
        ? row.source_checked_at
        : null,
    freshnessExpiresAt:
      typeof row.freshness_expires_at === "string"
        ? row.freshness_expires_at
        : null,
    expiresAt: String(row.expires_at ?? ""),
    source
  };
}

async function loadPrimarySource(
  entityType: AdminListingEntityType,
  id: string
): Promise<AdminListingSource> {
  const supabase =
    getSupabaseAdminClient();

  const {
    data,
    error
  } = await supabase
    .from("listing_sources")
    .select(
      "id, source_url, last_checked_at, is_primary"
    )
    .eq("entity_type", entityType)
    .eq("entity_id", id)
    .order("is_primary", {
      ascending: false
    })
    .limit(10);

  if (error) {
    throw new Error(
      `Venture could not read the listing source: ${error.message}`
    );
  }

  return getSource(data);
}

async function loadVenueOptions():
  Promise<AdminVenueOption[]> {
  const supabase =
    getSupabaseAdminClient();

  const {
    data,
    error
  } = await supabase
    .from("places")
    .select(
      "id, name, neighbourhood, status"
    )
    .order("name", {
      ascending: true
    })
    .limit(500);

  if (error) {
    throw new Error(
      `Venture could not load venue options: ${error.message}`
    );
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    neighbourhood:
      row.neighbourhood ?? null,
    status: row.status
  }));
}

export async function getAdminListingEditorData(
  entityType: AdminListingEntityType,
  id: string
): Promise<AdminListingEditorData | null> {
  const supabase =
    getSupabaseAdminClient();

  const source =
    await loadPrimarySource(
      entityType,
      id
    );

  if (entityType === "place") {
    const {
      data,
      error
    } = await supabase
      .from("places")
      .select(`
        id,
        slug,
        name,
        short_description,
        full_description,
        place_type,
        primary_category,
        secondary_categories,
        tags,
        address_line1,
        address_line2,
        city,
        province,
        postal_code,
        neighbourhood,
        latitude,
        longitude,
        official_phone,
        official_email,
        official_website,
        price_level,
        cuisine_primary,
        weekly_hours,
        open_status,
        menu_url,
        reservation_url,
        accessibility_notes,
        parking_notes,
        transit_notes,
        status,
        verification_status,
        warning_message,
        source_checked_at,
        freshness_expires_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Venture could not load this place: ${error.message}`
      );
    }

    if (!data) {
      return null;
    }

    return {
      record: normalizePlaceRow(
        data as Record<string, unknown>,
        source
      ),
      venues: []
    };
  }

  const [
    eventResult,
    venues
  ] = await Promise.all([
    supabase
      .from("events")
      .select(`
        id,
        slug,
        title,
        short_description,
        full_description,
        primary_category,
        secondary_categories,
        tags,
        venue_id,
        organizer_name,
        organizer_website,
        start_at,
        end_at,
        doors_at,
        timezone,
        price_type,
        minimum_price_cad,
        maximum_price_cad,
        fees_included,
        ticket_url,
        ticket_status,
        age_minimum,
        age_label,
        indoor_outdoor,
        accessibility_notes,
        parking_notes,
        transit_notes,
        status,
        verification_status,
        warning_message,
        source_checked_at,
        freshness_expires_at,
        expires_at
      `)
      .eq("id", id)
      .maybeSingle(),
    loadVenueOptions()
  ]);

  if (eventResult.error) {
    throw new Error(
      `Venture could not load this event: ${eventResult.error.message}`
    );
  }

  if (!eventResult.data) {
    return null;
  }

  return {
    record: normalizeEventRow(
      eventResult.data as Record<
        string,
        unknown
      >,
      source
    ),
    venues
  };
}

async function getManualSourceId():
  Promise<string> {
  const supabase =
    getSupabaseAdminClient();

  const existing = await supabase
    .from("sources")
    .select("id")
    .eq("name", MANUAL_SOURCE_NAME)
    .eq("source_type", "manual_research")
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    throw new Error(
      `Venture could not check the admin source record: ${existing.error.message}`
    );
  }

  if (existing.data?.id) {
    return existing.data.id;
  }

  const created = await supabase
    .from("sources")
    .insert({
      name: MANUAL_SOURCE_NAME,
      source_type: "manual_research",
      rights_basis: "link_only",
      attribution_text:
        "Official source link reviewed by a Venture administrator.",
      active: true,
      reviewed_at:
        new Date().toISOString()
    })
    .select("id")
    .single();

  if (
    created.error ||
    !created.data
  ) {
    throw new Error(
      `Venture could not create the admin source record: ${created.error?.message ?? "No row returned."}`
    );
  }

  return created.data.id;
}

async function savePrimarySource({
  entityType,
  entityId,
  sourceId,
  sourceUrl,
  checkedAt
}: {
  entityType: AdminListingEntityType;
  entityId: string;
  sourceId: string | null;
  sourceUrl: string;
  checkedAt: string | null;
}): Promise<void> {
  const supabase =
    getSupabaseAdminClient();

  if (!sourceUrl) {
    if (sourceId) {
      const result = await supabase
        .from("listing_sources")
        .delete()
        .eq("id", sourceId);

      if (result.error) {
        throw new Error(
          `Venture could not remove the old source link: ${result.error.message}`
        );
      }
    }

    return;
  }

  if (sourceId) {
    const result = await supabase
      .from("listing_sources")
      .update({
        source_url: sourceUrl,
        is_primary: true,
        last_checked_at: checkedAt,
        legal_notes:
          "Admin-reviewed link. Link only unless separate content rights are recorded."
      })
      .eq("id", sourceId);

    if (result.error) {
      throw new Error(
        `Venture could not update the primary source: ${result.error.message}`
      );
    }

    return;
  }

  const manualSourceId =
    await getManualSourceId();

  const result = await supabase
    .from("listing_sources")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      source_id: manualSourceId,
      source_url: sourceUrl,
      is_primary: true,
      last_checked_at: checkedAt,
      extracted_at: checkedAt,
      legal_notes:
        "Admin-reviewed link. Link only unless separate content rights are recorded."
    });

  if (result.error) {
    throw new Error(
      `Venture could not save the primary source: ${result.error.message}`
    );
  }
}

async function logAdminUpdate({
  admin,
  entityType,
  id,
  previousValue,
  newValue
}: {
  admin: VentureAdmin;
  entityType: AdminListingEntityType;
  id: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
}): Promise<void> {
  const supabase =
    getSupabaseAdminClient();

  const result = await supabase
    .from("audit_log")
    .insert({
      actor_id: admin.id,
      entity_type: entityType,
      entity_id: id,
      action: "admin_listing_update",
      previous_value: previousValue,
      new_value: newValue,
      source: "admin-listing-editor"
    });

  if (result.error) {
    console.error(
      "Admin listing audit log failed",
      {
        entityType,
        id,
        message: result.error.message
      }
    );
  }
}

function validateEnum(
  value: unknown,
  allowed: Set<string>,
  label: string
): string {
  const cleaned = text(
    value,
    80
  );

  if (!allowed.has(cleaned)) {
    throw new Error(
      `${label} contains an unsupported value.`
    );
  }

  return cleaned;
}

export async function updateAdminListing({
  entityType,
  id,
  body,
  admin
}: {
  entityType: AdminListingEntityType;
  id: string;
  body: unknown;
  admin: VentureAdmin;
}): Promise<AdminListingUpdateResult> {
  const submitted =
    asObject(body);

  const supabase =
    getSupabaseAdminClient();

  const before =
    await getAdminListingEditorData(
      entityType,
      id
    );

  if (!before) {
    throw new Error(
      "The listing no longer exists."
    );
  }

  const sourceUrl = nullableText(
    submitted.sourceUrl,
    2000
  ) ?? "";
  const sourceCheckedAt = isoOrNull(
    submitted.sourceCheckedAt,
    "Source checked time"
  );
  const freshnessExpiresAt = isoOrNull(
    submitted.freshnessExpiresAt,
    "Freshness expiry"
  );

  if (entityType === "place") {
    const latitude = nullableNumber(
      submitted.latitude,
      "Latitude"
    );
    const longitude = nullableNumber(
      submitted.longitude,
      "Longitude"
    );

    if (
      (latitude === null) !==
      (longitude === null)
    ) {
      throw new Error(
        "Latitude and longitude must be provided together."
      );
    }

    if (
      latitude !== null &&
      (latitude < -90 || latitude > 90)
    ) {
      throw new Error(
        "Latitude must be between -90 and 90."
      );
    }

    if (
      longitude !== null &&
      (longitude < -180 || longitude > 180)
    ) {
      throw new Error(
        "Longitude must be between -180 and 180."
      );
    }

    const priceLevel = integerOrNull(
      submitted.priceLevel,
      "Price level"
    );

    if (
      priceLevel !== null &&
      (priceLevel < 1 || priceLevel > 4)
    ) {
      throw new Error(
        "Price level must be between 1 and 4."
      );
    }

    const update: Record<
      string,
      unknown
    > = {
      slug: normalizeSlug(
        submitted.slug
      ),
      name: requiredText(
        submitted.name,
        "Name",
        180
      ),
      short_description: requiredText(
        submitted.shortDescription,
        "Short description",
        500
      ),
      full_description: nullableText(
        submitted.fullDescription,
        12000
      ),
      place_type: validateEnum(
        submitted.placeType,
        PLACE_TYPES,
        "Place type"
      ),
      primary_category: requiredText(
        submitted.primaryCategory,
        "Primary category",
        120
      ),
      secondary_categories: stringArray(
        submitted.secondaryCategories
      ),
      tags: stringArray(
        submitted.tags
      ),
      address_line1: requiredText(
        submitted.addressLine1,
        "Street address",
        240
      ),
      address_line2: nullableText(
        submitted.addressLine2,
        240
      ),
      city: requiredText(
        submitted.city,
        "City",
        100
      ),
      province: requiredText(
        submitted.province,
        "Province",
        100
      ),
      postal_code: nullableText(
        submitted.postalCode,
        20
      ),
      neighbourhood: nullableText(
        submitted.neighbourhood,
        120
      ),
      official_phone: nullableText(
        submitted.officialPhone,
        80
      ),
      official_email: nullableText(
        submitted.officialEmail,
        254
      ),
      official_website: nullableText(
        submitted.officialWebsite,
        2000
      ),
      price_level: priceLevel,
      cuisine_primary: nullableText(
        submitted.cuisinePrimary,
        120
      ),
      weekly_hours: safeWeeklyHours(
        submitted.weeklyHours
      ),
      open_status: requiredText(
        submitted.openStatus,
        "Open status",
        60
      ),
      menu_url: nullableText(
        submitted.menuUrl,
        2000
      ),
      reservation_url: nullableText(
        submitted.reservationUrl,
        2000
      ),
      accessibility_notes: nullableText(
        submitted.accessibilityNotes,
        4000
      ),
      parking_notes: nullableText(
        submitted.parkingNotes,
        4000
      ),
      transit_notes: nullableText(
        submitted.transitNotes,
        4000
      ),
      status: validateEnum(
        submitted.status,
        LISTING_STATUSES,
        "Listing status"
      ),
      verification_status: validateEnum(
        submitted.verificationStatus,
        VERIFICATION_STATUSES,
        "Verification status"
      ),
      warning_message: nullableText(
        submitted.warningMessage,
        1000
      ),
      source_checked_at:
        sourceCheckedAt,
      freshness_expires_at:
        freshnessExpiresAt,
      updated_at:
        new Date().toISOString()
    };

    if (
      latitude !== null &&
      longitude !== null
    ) {
      update.location =
        `SRID=4326;POINT(${longitude} ${latitude})`;
    }

    if (
      update.status === "published" &&
      !(before.record.status === "published")
    ) {
      update.published_at =
        new Date().toISOString();
    }

    const result = await supabase
      .from("places")
      .update(update)
      .eq("id", id)
      .select("id, slug")
      .single();

    if (
      result.error ||
      !result.data
    ) {
      throw new Error(
        `Venture could not update this place: ${result.error?.message ?? "No row returned."}`
      );
    }

    await savePrimarySource({
      entityType,
      entityId: id,
      sourceId:
        before.record.source.id,
      sourceUrl,
      checkedAt: sourceCheckedAt
    });

    await logAdminUpdate({
      admin,
      entityType,
      id,
      previousValue:
        before.record as unknown as Record<
          string,
          unknown
        >,
      newValue: {
        ...update,
        sourceUrl
      }
    });

    return {
      ok: true,
      publicPath:
        `/listings/${result.data.slug}`,
      message:
        "Place changes saved."
    };
  }

  const minimumPriceCad = nullableNumber(
    submitted.minimumPriceCad,
    "Minimum price"
  );
  const maximumPriceCad = nullableNumber(
    submitted.maximumPriceCad,
    "Maximum price"
  );

  if (
    minimumPriceCad !== null &&
    minimumPriceCad < 0
  ) {
    throw new Error(
      "Minimum price cannot be negative."
    );
  }

  if (
    maximumPriceCad !== null &&
    maximumPriceCad < 0
  ) {
    throw new Error(
      "Maximum price cannot be negative."
    );
  }

  if (
    minimumPriceCad !== null &&
    maximumPriceCad !== null &&
    maximumPriceCad < minimumPriceCad
  ) {
    throw new Error(
      "Maximum price cannot be below the minimum price."
    );
  }

  const startAt = isoRequired(
    submitted.startAt,
    "Event start"
  );
  const endAt = isoOrNull(
    submitted.endAt,
    "Event end"
  );
  const doorsAt = isoOrNull(
    submitted.doorsAt,
    "Doors time"
  );
  const expiresAt = isoRequired(
    submitted.expiresAt,
    "Event expiry"
  );

  if (
    endAt &&
    new Date(endAt).getTime() <
      new Date(startAt).getTime()
  ) {
    throw new Error(
      "Event end cannot be before the start."
    );
  }

  const ageMinimum = integerOrNull(
    submitted.ageMinimum,
    "Minimum age"
  );

  if (
    ageMinimum !== null &&
    ageMinimum < 0
  ) {
    throw new Error(
      "Minimum age cannot be negative."
    );
  }

  const update: Record<
    string,
    unknown
  > = {
    slug: normalizeSlug(
      submitted.slug
    ),
    title: requiredText(
      submitted.title,
      "Title",
      220
    ),
    short_description: requiredText(
      submitted.shortDescription,
      "Short description",
      500
    ),
    full_description: nullableText(
      submitted.fullDescription,
      12000
    ),
    primary_category: requiredText(
      submitted.primaryCategory,
      "Primary category",
      120
    ),
    secondary_categories: stringArray(
      submitted.secondaryCategories
    ),
    tags: stringArray(
      submitted.tags
    ),
    venue_id: nullableText(
      submitted.venueId,
      100
    ),
    organizer_name: requiredText(
      submitted.organizerName,
      "Organizer name",
      220
    ),
    organizer_website: nullableText(
      submitted.organizerWebsite,
      2000
    ),
    start_at: startAt,
    end_at: endAt,
    doors_at: doorsAt,
    timezone: requiredText(
      submitted.timezone,
      "Timezone",
      100
    ),
    price_type: validateEnum(
      submitted.priceType,
      EVENT_PRICE_TYPES,
      "Price type"
    ),
    minimum_price_cad:
      minimumPriceCad,
    maximum_price_cad:
      maximumPriceCad,
    fees_included:
      typeof submitted.feesIncluded === "boolean"
        ? submitted.feesIncluded
        : null,
    ticket_url: nullableText(
      submitted.ticketUrl,
      2000
    ),
    ticket_status: requiredText(
      submitted.ticketStatus,
      "Ticket status",
      80
    ),
    age_minimum: ageMinimum,
    age_label: requiredText(
      submitted.ageLabel,
      "Age label",
      80
    ),
    indoor_outdoor: requiredText(
      submitted.indoorOutdoor,
      "Indoor or outdoor status",
      80
    ),
    accessibility_notes: nullableText(
      submitted.accessibilityNotes,
      4000
    ),
    parking_notes: nullableText(
      submitted.parkingNotes,
      4000
    ),
    transit_notes: nullableText(
      submitted.transitNotes,
      4000
    ),
    status: validateEnum(
      submitted.status,
      LISTING_STATUSES,
      "Listing status"
    ),
    verification_status: validateEnum(
      submitted.verificationStatus,
      VERIFICATION_STATUSES,
      "Verification status"
    ),
    warning_message: nullableText(
      submitted.warningMessage,
      1000
    ),
    source_checked_at:
      sourceCheckedAt,
    freshness_expires_at:
      freshnessExpiresAt,
    expires_at: expiresAt,
    updated_at:
      new Date().toISOString()
  };

  if (
    update.status === "published" &&
    before.record.status !== "published"
  ) {
    update.published_at =
      new Date().toISOString();
  }

  const result = await supabase
    .from("events")
    .update(update)
    .eq("id", id)
    .select("id, slug")
    .single();

  if (
    result.error ||
    !result.data
  ) {
    throw new Error(
      `Venture could not update this event: ${result.error?.message ?? "No row returned."}`
    );
  }

  await savePrimarySource({
    entityType,
    entityId: id,
    sourceId:
      before.record.source.id,
    sourceUrl,
    checkedAt: sourceCheckedAt
  });

  await logAdminUpdate({
    admin,
    entityType,
    id,
    previousValue:
      before.record as unknown as Record<
        string,
        unknown
      >,
    newValue: {
      ...update,
      sourceUrl
    }
  });

  return {
    ok: true,
    publicPath:
      `/listings/${result.data.slug}`,
    message:
      "Event changes saved."
  };
}
