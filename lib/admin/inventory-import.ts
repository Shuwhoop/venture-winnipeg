import "server-only";

import { randomUUID } from "node:crypto";

import type { VentureAdmin } from "@/lib/auth/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  InventoryImportCommitResult,
  InventoryImportEntityType,
  InventoryImportHistoryItem,
  InventoryImportPreview,
  InventoryImportPreviewRow,
  InventoryImportRowStatus
} from "@/lib/admin/inventory-import-types";

const MAX_CSV_BYTES = 750_000;
const MAX_IMPORT_ROWS = 250;
const IMPORT_SOURCE_NAME = "Venture CSV inventory import";

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

type CsvRecord = Record<string, string>;

type ExistingInventory = {
  placeSlugs: Set<string>;
  eventSlugs: Set<string>;
  placeIdentityKeys: Set<string>;
  eventIdentityKeys: Set<string>;
  sourceUrls: Set<string>;
  venueBySlug: Map<string, string>;
  venueByName: Map<string, string>;
};

type AnalyzedRow = {
  rowNumber: number;
  displayName: string;
  slug: string;
  status: InventoryImportRowStatus;
  messages: string[];
  values: Record<string, unknown> | null;
  sourceUrl: string | null;
};

function cleanText(value: unknown, maxLength = 5000): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maxLength)
    : "";
}

function nullableText(value: unknown, maxLength = 5000): string | null {
  const cleaned = cleanText(value, maxLength);
  return cleaned || null;
}

function normalizeText(value: unknown): string {
  return cleanText(value, 500)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value: unknown): string {
  return normalizeText(value)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseSourceUrl(value: unknown): string | null {
  const cleaned = cleanText(value, 2000);

  if (!cleaned) {
    return null;
  }

  try {
    const url = new URL(cleaned);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function sourceUrlKey(value: unknown): string | null {
  const parsed = parseSourceUrl(value);
  return parsed ? parsed.toLowerCase() : null;
}

function parseStringList(value: unknown): string[] {
  const cleaned = cleanText(value, 4000);

  if (!cleaned) {
    return [];
  }

  return Array.from(
    new Set(
      cleaned
        .split(/[|;]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.slice(0, 100))
    )
  ).slice(0, 40);
}

function parseBoolean(value: unknown): boolean | null {
  const normalized = normalizeText(value);

  if (["true", "yes", "1", "y"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "0", "n"].includes(normalized)) {
    return false;
  }

  return null;
}

function parseNumber(
  value: unknown,
  minimum: number,
  maximum: number
): number | null {
  const cleaned = cleanText(value, 100);

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }

  return parsed;
}

function parseInteger(
  value: unknown,
  minimum: number,
  maximum: number
): number | null {
  const parsed = parseNumber(value, minimum, maximum);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function parseIso(value: unknown): string | null {
  const cleaned = cleanText(value, 100);

  if (!cleaned) {
    return null;
  }

  const parsed = new Date(cleaned);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function parseWeeklyHours(value: unknown): Record<string, unknown> | null {
  const cleaned = cleanText(value, 20_000);

  if (!cleaned) {
    return {};
  }

  try {
    const parsed = JSON.parse(cleaned) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseCsv(csvText: string): CsvRecord[] {
  if (Buffer.byteLength(csvText, "utf8") > MAX_CSV_BYTES) {
    throw new Error("The CSV is too large. Keep each import below 750 KB.");
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const next = csvText[index + 1];

    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("The CSV contains an unclosed quoted field.");
  }

  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((currentRow) =>
    currentRow.some((currentField) => currentField.trim())
  );

  if (nonEmptyRows.length < 2) {
    throw new Error("The CSV needs a header row and at least one data row.");
  }

  const headers = nonEmptyRows[0].map(normalizeHeader);

  if (headers.some((header) => !header)) {
    throw new Error("Every CSV column needs a readable header.");
  }

  if (new Set(headers).size !== headers.length) {
    throw new Error("The CSV contains duplicate column headers.");
  }

  const dataRows = nonEmptyRows.slice(1);

  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Import at most ${MAX_IMPORT_ROWS} rows at a time.`);
  }

  return dataRows.map((currentRow) => {
    const record: CsvRecord = {};

    headers.forEach((header, index) => {
      record[header] = currentRow[index]?.trim() ?? "";
    });

    return record;
  });
}

function placeIdentityKey(name: unknown, address: unknown): string {
  return `${normalizeText(name)}|${normalizeText(address)}`;
}

function eventIdentityKey(title: unknown, startAt: unknown): string {
  const parsed = parseIso(startAt);
  return `${normalizeText(title)}|${parsed ?? normalizeText(startAt)}`;
}

async function loadExistingInventory(): Promise<ExistingInventory> {
  const supabase = getSupabaseAdminClient();

  const [placesResult, eventsResult, sourcesResult] = await Promise.all([
    supabase
      .from("places")
      .select("id, slug, name, address_line1")
      .limit(5000),
    supabase
      .from("events")
      .select("id, slug, title, start_at")
      .limit(5000),
    supabase
      .from("listing_sources")
      .select("source_url")
      .limit(10000)
  ]);

  if (placesResult.error) {
    throw new Error(`Venture could not inspect existing places: ${placesResult.error.message}`);
  }

  if (eventsResult.error) {
    throw new Error(`Venture could not inspect existing events: ${eventsResult.error.message}`);
  }

  if (sourcesResult.error) {
    throw new Error(`Venture could not inspect existing sources: ${sourcesResult.error.message}`);
  }

  const placeSlugs = new Set<string>();
  const eventSlugs = new Set<string>();
  const placeIdentityKeys = new Set<string>();
  const eventIdentityKeys = new Set<string>();
  const venueBySlug = new Map<string, string>();
  const venueByName = new Map<string, string>();

  for (const place of placesResult.data ?? []) {
    placeSlugs.add(place.slug.toLowerCase());
    placeIdentityKeys.add(placeIdentityKey(place.name, place.address_line1));
    venueBySlug.set(place.slug.toLowerCase(), place.id);
    venueByName.set(normalizeText(place.name), place.id);
  }

  for (const event of eventsResult.data ?? []) {
    eventSlugs.add(event.slug.toLowerCase());
    eventIdentityKeys.add(eventIdentityKey(event.title, event.start_at));
  }

  const sourceUrls = new Set(
    (sourcesResult.data ?? [])
      .map((row) => sourceUrlKey(row.source_url))
      .filter((value): value is string => Boolean(value))
  );

  return {
    placeSlugs,
    eventSlugs,
    placeIdentityKeys,
    eventIdentityKeys,
    sourceUrls,
    venueBySlug,
    venueByName
  };
}

function getStatus(messages: string[], duplicate: boolean): InventoryImportRowStatus {
  if (duplicate) {
    return "duplicate";
  }

  if (messages.some((message) => message.startsWith("ERROR:"))) {
    return "error";
  }

  if (messages.length > 0) {
    return "warning";
  }

  return "ready";
}

function analyzePlaceRow(
  record: CsvRecord,
  rowNumber: number,
  existing: ExistingInventory,
  seenSlugs: Set<string>,
  seenIdentity: Set<string>,
  seenSources: Set<string>
): AnalyzedRow {
  const messages: string[] = [];
  const name = cleanText(record.name, 180);
  const slug = slugify(record.slug || name);
  const sourceUrl = parseSourceUrl(record.source_url);
  const latitude = parseNumber(record.latitude, -90, 90);
  const longitude = parseNumber(record.longitude, -180, 180);
  const addressLine1 = cleanText(record.address_line1, 250);
  const identityKey = placeIdentityKey(name, addressLine1);
  const placeType = cleanText(record.place_type || "restaurant", 80);
  const weeklyHours = parseWeeklyHours(record.weekly_hours_json);
  let duplicate = false;

  if (!name) messages.push("ERROR: name is required.");
  if (!slug) messages.push("ERROR: slug could not be generated.");
  if (!cleanText(record.short_description, 500)) messages.push("ERROR: short_description is required.");
  if (!cleanText(record.primary_category, 120)) messages.push("ERROR: primary_category is required.");
  if (!addressLine1) messages.push("ERROR: address_line1 is required.");
  if (latitude === null) messages.push("ERROR: latitude must be between -90 and 90.");
  if (longitude === null) messages.push("ERROR: longitude must be between -180 and 180.");
  if (!sourceUrl) messages.push("ERROR: source_url must be a valid http or https URL.");
  if (!PLACE_TYPES.has(placeType)) messages.push(`ERROR: unsupported place_type \"${placeType}\".`);
  if (weeklyHours === null) messages.push("ERROR: weekly_hours_json must be valid JSON.");

  if (!cleanText(record.neighbourhood, 120)) messages.push("Neighbourhood is missing and should be repaired before publishing.");
  if (!cleanText(record.weekly_hours_json, 20_000)) messages.push("Opening hours are missing.");
  if (!cleanText(record.price_level, 10)) messages.push("Price level is missing.");

  if (slug && (existing.placeSlugs.has(slug) || seenSlugs.has(slug))) {
    duplicate = true;
    messages.push("A place with this slug already exists in Venture or this CSV.");
  }

  if (name && addressLine1 && (existing.placeIdentityKeys.has(identityKey) || seenIdentity.has(identityKey))) {
    duplicate = true;
    messages.push("A place with this name and address already exists.");
  }

  const sourceKey = sourceUrlKey(sourceUrl);

  if (sourceKey && (existing.sourceUrls.has(sourceKey) || seenSources.has(sourceKey))) {
    duplicate = true;
    messages.push("This source URL is already attached to a Venture listing or another CSV row.");
  }

  if (slug) seenSlugs.add(slug);
  if (name && addressLine1) seenIdentity.add(identityKey);
  if (sourceKey) seenSources.add(sourceKey);

  const priceLevel = parseInteger(record.price_level, 1, 4);

  if (cleanText(record.price_level, 10) && priceLevel === null) {
    messages.push("ERROR: price_level must be a whole number from 1 to 4.");
  }

  const status = getStatus(messages, duplicate);

  return {
    rowNumber,
    displayName: name || `Place row ${rowNumber}`,
    slug,
    status,
    messages,
    sourceUrl,
    values:
      status === "error" || status === "duplicate" || latitude === null || longitude === null
        ? null
        : {
            slug,
            place_type: placeType,
            name,
            short_description: cleanText(record.short_description, 500),
            full_description: nullableText(record.full_description, 6000),
            primary_category: cleanText(record.primary_category, 120),
            secondary_categories: parseStringList(record.secondary_categories),
            tags: parseStringList(record.tags),
            address_line1: addressLine1,
            address_line2: nullableText(record.address_line2, 250),
            city: cleanText(record.city || "Winnipeg", 120),
            province: cleanText(record.province || "Manitoba", 120),
            postal_code: nullableText(record.postal_code, 20),
            neighbourhood: nullableText(record.neighbourhood, 120),
            location: `SRID=4326;POINT(${longitude} ${latitude})`,
            official_phone: nullableText(record.official_phone, 80),
            official_email: nullableText(record.official_email, 254),
            official_website: nullableText(record.official_website, 2000) ?? sourceUrl,
            price_level: priceLevel,
            cuisine_primary: nullableText(record.cuisine_primary, 120),
            cuisine_secondary: parseStringList(record.cuisine_secondary),
            weekly_hours: weeklyHours ?? {},
            special_hours: [],
            open_status: cleanText(record.open_status || "unknown", 40),
            menu_url: nullableText(record.menu_url, 2000),
            reservation_url: nullableText(record.reservation_url, 2000),
            dietary_options: parseStringList(record.dietary_options),
            atmosphere_tags: parseStringList(record.atmosphere_tags),
            good_for: parseStringList(record.good_for),
            accessibility_notes: nullableText(record.accessibility_notes, 3000),
            parking_notes: nullableText(record.parking_notes, 3000),
            transit_notes: nullableText(record.transit_notes, 3000),
            status: "draft",
            verification_status: "unverified",
            warning_message: "Imported from CSV as a draft. Verify every field before publishing.",
            source_checked_at: null,
            freshness_expires_at: null,
            published_at: null
          }
  };
}

function analyzeEventRow(
  record: CsvRecord,
  rowNumber: number,
  existing: ExistingInventory,
  seenSlugs: Set<string>,
  seenIdentity: Set<string>,
  seenSources: Set<string>
): AnalyzedRow {
  const messages: string[] = [];
  const title = cleanText(record.title, 200);
  const slug = slugify(record.slug || title);
  const sourceUrl = parseSourceUrl(record.source_url);
  const startAt = parseIso(record.start_at);
  const endAt = parseIso(record.end_at);
  const doorsAt = parseIso(record.doors_at);
  const venueSlug = cleanText(record.venue_slug, 160).toLowerCase();
  const venueName = normalizeText(record.venue_name);
  const venueId =
    (venueSlug ? existing.venueBySlug.get(venueSlug) : undefined) ??
    (venueName ? existing.venueByName.get(venueName) : undefined) ??
    null;
  const identityKey = eventIdentityKey(title, record.start_at);
  const priceType = cleanText(record.price_type || "unknown", 40);
  let duplicate = false;

  if (!title) messages.push("ERROR: title is required.");
  if (!slug) messages.push("ERROR: slug could not be generated.");
  if (!cleanText(record.short_description, 500)) messages.push("ERROR: short_description is required.");
  if (!cleanText(record.primary_category, 120)) messages.push("ERROR: primary_category is required.");
  if (!cleanText(record.organizer_name, 180)) messages.push("ERROR: organizer_name is required.");
  if (!startAt) messages.push("ERROR: start_at must be a valid date and time.");
  if (cleanText(record.end_at, 100) && !endAt) messages.push("ERROR: end_at is not a valid date and time.");
  if (cleanText(record.doors_at, 100) && !doorsAt) messages.push("ERROR: doors_at is not a valid date and time.");
  if (startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime()) {
    messages.push("ERROR: end_at cannot be before start_at.");
  }
  if (!venueId) messages.push("ERROR: venue_slug or venue_name must match an existing Venture place.");
  if (!sourceUrl) messages.push("ERROR: source_url must be a valid http or https URL.");
  if (!EVENT_PRICE_TYPES.has(priceType)) messages.push(`ERROR: unsupported price_type \"${priceType}\".`);

  if (startAt && new Date(startAt).getTime() < Date.now()) {
    messages.push("This event starts in the past. Confirm the year and date before importing.");
  }
  if (!cleanText(record.ticket_url, 2000)) messages.push("Ticket or registration URL is missing.");

  if (slug && (existing.eventSlugs.has(slug) || seenSlugs.has(slug))) {
    duplicate = true;
    messages.push("An event with this slug already exists in Venture or this CSV.");
  }

  if (title && startAt && (existing.eventIdentityKeys.has(identityKey) || seenIdentity.has(identityKey))) {
    duplicate = true;
    messages.push("An event with this title and start time already exists.");
  }

  const sourceKey = sourceUrlKey(sourceUrl);

  if (sourceKey && (existing.sourceUrls.has(sourceKey) || seenSources.has(sourceKey))) {
    duplicate = true;
    messages.push("This source URL is already attached to a Venture listing or another CSV row.");
  }

  if (slug) seenSlugs.add(slug);
  if (title && startAt) seenIdentity.add(identityKey);
  if (sourceKey) seenSources.add(sourceKey);

  const minimumPriceCad = parseNumber(record.minimum_price_cad, 0, 1_000_000);
  const maximumPriceCad = parseNumber(record.maximum_price_cad, 0, 1_000_000);
  const ageMinimum = parseInteger(record.age_minimum, 0, 120);

  if (cleanText(record.minimum_price_cad, 100) && minimumPriceCad === null) {
    messages.push("ERROR: minimum_price_cad must be a non-negative number.");
  }
  if (cleanText(record.maximum_price_cad, 100) && maximumPriceCad === null) {
    messages.push("ERROR: maximum_price_cad must be a non-negative number.");
  }
  if (minimumPriceCad !== null && maximumPriceCad !== null && maximumPriceCad < minimumPriceCad) {
    messages.push("ERROR: maximum_price_cad cannot be below minimum_price_cad.");
  }
  if (cleanText(record.age_minimum, 20) && ageMinimum === null) {
    messages.push("ERROR: age_minimum must be a whole number from 0 to 120.");
  }

  const expiresAt =
    parseIso(record.expires_at) ??
    (endAt
      ? new Date(new Date(endAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
      : startAt
        ? new Date(new Date(startAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
        : null);

  if (!cleanText(record.expires_at, 100) && expiresAt) {
    messages.push("expires_at was generated automatically from the event date.");
  }

  const status = getStatus(messages, duplicate);

  return {
    rowNumber,
    displayName: title || `Event row ${rowNumber}`,
    slug,
    status,
    messages,
    sourceUrl,
    values:
      status === "error" || status === "duplicate" || !startAt || !expiresAt || !venueId
        ? null
        : {
            slug,
            title,
            short_description: cleanText(record.short_description, 500),
            full_description: nullableText(record.full_description, 6000),
            primary_category: cleanText(record.primary_category, 120),
            secondary_categories: parseStringList(record.secondary_categories),
            tags: parseStringList(record.tags),
            venue_id: venueId,
            organizer_name: cleanText(record.organizer_name, 180),
            organizer_website: nullableText(record.organizer_website, 2000),
            start_at: startAt,
            end_at: endAt,
            doors_at: doorsAt,
            timezone: cleanText(record.timezone || "America/Winnipeg", 100),
            price_type: priceType,
            minimum_price_cad: minimumPriceCad,
            maximum_price_cad: maximumPriceCad,
            fees_included: parseBoolean(record.fees_included),
            ticket_url: nullableText(record.ticket_url, 2000),
            ticket_status: cleanText(record.ticket_status || "unknown", 40),
            age_minimum: ageMinimum,
            age_label: cleanText(record.age_label || "unknown", 80),
            indoor_outdoor: cleanText(record.indoor_outdoor || "unknown", 80),
            accessibility_notes: nullableText(record.accessibility_notes, 3000),
            parking_notes: nullableText(record.parking_notes, 3000),
            transit_notes: nullableText(record.transit_notes, 3000),
            status: "draft",
            verification_status: "unverified",
            warning_message: "Imported from CSV as a draft. Verify every field before publishing.",
            source_checked_at: null,
            freshness_expires_at: null,
            expires_at: expiresAt,
            published_at: null
          }
  };
}

async function analyzeRows(
  entityType: InventoryImportEntityType,
  csvText: string
): Promise<AnalyzedRow[]> {
  const records = parseCsv(csvText);
  const existing = await loadExistingInventory();
  const seenSlugs = new Set<string>();
  const seenIdentity = new Set<string>();
  const seenSources = new Set<string>();

  return records.map((record, index) =>
    entityType === "place"
      ? analyzePlaceRow(
          record,
          index + 2,
          existing,
          seenSlugs,
          seenIdentity,
          seenSources
        )
      : analyzeEventRow(
          record,
          index + 2,
          existing,
          seenSlugs,
          seenIdentity,
          seenSources
        )
  );
}

function summarizePreview(
  entityType: InventoryImportEntityType,
  filename: string,
  rows: AnalyzedRow[]
): InventoryImportPreview {
  const previewRows: InventoryImportPreviewRow[] = rows.map((row) => ({
    rowNumber: row.rowNumber,
    displayName: row.displayName,
    slug: row.slug,
    status: row.status,
    messages: row.messages
  }));

  const count = (status: InventoryImportRowStatus) =>
    previewRows.filter((row) => row.status === status).length;

  const readyRows = count("ready");
  const warningRows = count("warning");
  const duplicateRows = count("duplicate");
  const errorRows = count("error");

  return {
    entityType,
    filename,
    generatedAt: new Date().toISOString(),
    totalRows: previewRows.length,
    readyRows,
    warningRows,
    duplicateRows,
    errorRows,
    importableRows: readyRows + warningRows,
    rows: previewRows
  };
}

export async function previewInventoryImport({
  entityType,
  filename,
  csvText
}: {
  entityType: InventoryImportEntityType;
  filename: string;
  csvText: string;
}): Promise<InventoryImportPreview> {
  const rows = await analyzeRows(entityType, csvText);
  return summarizePreview(entityType, filename, rows);
}

async function getImportSourceId(): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const existing = await supabase
    .from("sources")
    .select("id")
    .eq("name", IMPORT_SOURCE_NAME)
    .eq("source_type", "manual_research")
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Venture could not inspect the CSV import source: ${existing.error.message}`);
  }

  if (existing.data?.id) {
    return existing.data.id;
  }

  const created = await supabase
    .from("sources")
    .insert({
      name: IMPORT_SOURCE_NAME,
      source_type: "manual_research",
      rights_basis: "link_only",
      attribution_text: "Source URLs supplied during a private Venture CSV import.",
      caching_limit: "Store factual listing fields only.",
      retention_notes: "Imported records remain drafts until individually verified.",
      deletion_obligations: "Correct or remove records when their source changes.",
      active: true,
      reviewed_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (created.error || !created.data) {
    throw new Error(`Venture could not create the CSV import source: ${created.error?.message ?? "No row returned."}`);
  }

  return created.data.id;
}

async function attachSource({
  entityType,
  entityId,
  sourceId,
  sourceUrl
}: {
  entityType: InventoryImportEntityType;
  entityId: string;
  sourceId: string;
  sourceUrl: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const result = await supabase.from("listing_sources").insert({
    entity_type: entityType,
    entity_id: entityId,
    source_id: sourceId,
    source_url: sourceUrl,
    is_primary: true,
    field_coverage: {
      import: "CSV draft",
      review_required: true
    },
    extracted_at: new Date().toISOString(),
    last_checked_at: null,
    legal_notes: "Imported as link-only draft data. Verify the official source before publishing."
  });

  if (result.error) {
    throw new Error(`Venture could not attach the source URL: ${result.error.message}`);
  }
}

async function logImportedEntity({
  admin,
  batchId,
  entityType,
  entityId,
  filename,
  rowNumber
}: {
  admin: VentureAdmin;
  batchId: string;
  entityType: InventoryImportEntityType;
  entityId: string;
  filename: string;
  rowNumber: number;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const result = await supabase.from("audit_log").insert({
    actor_id: admin.id,
    entity_type: entityType,
    entity_id: entityId,
    action: "inventory_import_created",
    previous_value: null,
    new_value: {
      batchId,
      filename,
      rowNumber,
      status: "draft",
      verificationStatus: "unverified",
      adminEmail: admin.email
    },
    source: "admin_csv_import"
  });

  if (result.error) {
    console.error("Inventory entity audit failed", result.error);
  }
}

async function logImportBatch({
  admin,
  batchId,
  entityType,
  filename,
  totalRows,
  importedRows,
  skippedRows,
  failedRows
}: {
  admin: VentureAdmin;
  batchId: string;
  entityType: InventoryImportEntityType;
  filename: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  failedRows: number;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const result = await supabase.from("audit_log").insert({
    actor_id: admin.id,
    entity_type: "import_batch",
    entity_id: batchId,
    action: "inventory_import_batch",
    previous_value: null,
    new_value: {
      batchId,
      entityType,
      filename,
      totalRows,
      importedRows,
      skippedRows,
      failedRows,
      adminEmail: admin.email
    },
    source: "admin_csv_import"
  });

  if (result.error) {
    throw new Error(`Venture imported the rows but could not save batch history: ${result.error.message}`);
  }
}

export async function commitInventoryImport({
  admin,
  entityType,
  filename,
  csvText
}: {
  admin: VentureAdmin;
  entityType: InventoryImportEntityType;
  filename: string;
  csvText: string;
}): Promise<InventoryImportCommitResult> {
  const analyzedRows = await analyzeRows(entityType, csvText);
  const sourceId = await getImportSourceId();
  const supabase = getSupabaseAdminClient();
  const batchId = randomUUID();
  const results: InventoryImportCommitResult["rows"] = [];

  for (const row of analyzedRows) {
    if (row.status === "duplicate" || row.status === "error" || !row.values || !row.sourceUrl) {
      results.push({
        rowNumber: row.rowNumber,
        displayName: row.displayName,
        status: "skipped",
        entityType,
        entityId: null,
        message:
          row.status === "duplicate"
            ? "Skipped because Venture detected a duplicate."
            : "Skipped because the row contains validation errors."
      });
      continue;
    }

    const table = entityType === "place" ? "places" : "events";
    let insertedId: string | null = null;

    try {
      const inserted = await supabase
        .from(table)
        .insert(row.values)
        .select("id")
        .single();

      if (inserted.error || !inserted.data) {
        throw new Error(inserted.error?.message ?? "No listing row was returned.");
      }

      const entityId = String(inserted.data.id);
      insertedId = entityId;

      await attachSource({
        entityType,
        entityId,
        sourceId,
        sourceUrl: row.sourceUrl
      });

      await logImportedEntity({
        admin,
        batchId,
        entityType,
        entityId,
        filename,
        rowNumber: row.rowNumber
      });

      results.push({
        rowNumber: row.rowNumber,
        displayName: row.displayName,
        status: "imported",
        entityType,
        entityId,
        message: "Imported as a draft and queued for verification."
      });
    } catch (error) {
      if (insertedId) {
        await supabase.from(table).delete().eq("id", insertedId);
      }

      results.push({
        rowNumber: row.rowNumber,
        displayName: row.displayName,
        status: "failed",
        entityType,
        entityId: null,
        message: error instanceof Error ? error.message : "The row could not be imported."
      });
    }
  }

  const importedRows = results.filter((row) => row.status === "imported").length;
  const skippedRows = results.filter((row) => row.status === "skipped").length;
  const failedRows = results.filter((row) => row.status === "failed").length;

  await logImportBatch({
    admin,
    batchId,
    entityType,
    filename,
    totalRows: analyzedRows.length,
    importedRows,
    skippedRows,
    failedRows
  });

  return {
    ok: true,
    batchId,
    entityType,
    filename,
    totalRows: analyzedRows.length,
    importedRows,
    skippedRows,
    failedRows,
    rows: results,
    message:
      importedRows > 0
        ? `${importedRows} ${entityType === "place" ? "place" : "event"}${importedRows === 1 ? "" : "s"} imported as drafts.`
        : "No rows were imported. Review the preview errors and duplicates."
  };
}

export async function getInventoryImportHistory(
  limit = 50
): Promise<InventoryImportHistoryItem[]> {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("audit_log")
    .select("entity_id, new_value, created_at")
    .eq("action", "inventory_import_batch")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 200)));

  if (result.error) {
    throw new Error(`Venture could not load import history: ${result.error.message}`);
  }

  return (result.data ?? []).map((row) => {
    const value =
      row.new_value && typeof row.new_value === "object" && !Array.isArray(row.new_value)
        ? (row.new_value as Record<string, unknown>)
        : {};

    return {
      batchId: cleanText(value.batchId || row.entity_id, 100),
      entityType: value.entityType === "event" ? "event" : "place",
      filename: cleanText(value.filename || "Unknown CSV", 250),
      createdAt: row.created_at,
      adminEmail: cleanText(value.adminEmail || "Unknown admin", 254),
      totalRows: Number(value.totalRows ?? 0),
      importedRows: Number(value.importedRows ?? 0),
      skippedRows: Number(value.skippedRows ?? 0),
      failedRows: Number(value.failedRows ?? 0)
    };
  });
}
