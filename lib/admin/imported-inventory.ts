import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ImportedInventoryFilters,
  ImportedInventoryRecord,
  ImportedInventoryResult
} from "@/lib/admin/inventory-import-types";

type ImportAudit = {
  entity_type: string;
  entity_id: string;
  new_value: unknown;
  created_at: string;
};

type PlaceRow = {
  id: string;
  slug: string;
  name: string;
  address_line1: string;
  neighbourhood: string | null;
  primary_category: string;
  place_type: string;
  status: string;
  verification_status: string;
  import_source: string | null;
  imported_at: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  primary_category: string;
  status: string;
  verification_status: string;
  venue_id: string | null;
  created_at: string;
};

type VenueRow = {
  id: string;
  name: string;
  address_line1: string;
  neighbourhood: string | null;
};

type ImportMetadata = {
  batchId: string | null;
  targetArea: string | null;
  importSource: string | null;
  importedAt: string | null;
};

const TARGET_AREA_PRESETS = [
  { label: "Downtown", latitude: 49.8951, longitude: -97.1384, radiusM: 1800 },
  { label: "Exchange District", latitude: 49.9006, longitude: -97.1390, radiusM: 950 },
  { label: "The Forks", latitude: 49.8873, longitude: -97.1302, radiusM: 950 },
  { label: "Osborne Village", latitude: 49.8777, longitude: -97.1469, radiusM: 1150 },
  { label: "Corydon", latitude: 49.8720, longitude: -97.1595, radiusM: 1500 },
  { label: "Wellington Crescent", latitude: 49.8744, longitude: -97.1800, radiusM: 1800 },
  { label: "St. Boniface", latitude: 49.8850, longitude: -97.1110, radiusM: 1800 },
  { label: "University of Manitoba / Fort Garry", latitude: 49.8075, longitude: -97.1366, radiusM: 2400 },
  { label: "University of Winnipeg / West Broadway", latitude: 49.8905, longitude: -97.1530, radiusM: 1800 },
  { label: "Bridgwater", latitude: 49.7980, longitude: -97.2000, radiusM: 2700 }
] as const;

function distanceMetres(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {
  const radius = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);
  const firstLatitude = toRadians(latitude1);
  const secondLatitude = toRadians(latitude2);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function inferTargetArea(latitude: number | null, longitude: number | null): string | null {
  if (latitude === null || longitude === null) return null;

  const matches = TARGET_AREA_PRESETS
    .map((area) => ({
      label: area.label,
      distance: distanceMetres(latitude, longitude, area.latitude, area.longitude),
      radiusM: area.radiusM
    }))
    .filter((area) => area.distance <= area.radiusM)
    .sort((left, right) => left.distance - right.distance);

  return matches[0]?.label ?? null;
}

function cleanText(value: unknown, maxLength = 500): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maxLength)
    : "";
}

function normalize(value: unknown): string {
  return cleanText(value, 1000)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metadataFromAudit(row: ImportAudit): ImportMetadata {
  const value = objectValue(row.new_value);

  return {
    batchId: cleanText(value.batchId, 100) || null,
    targetArea: cleanText(value.targetArea, 160) || null,
    importSource: cleanText(value.importSource, 160) || null,
    importedAt: row.created_at || null
  };
}

function chunk<T>(values: T[], size = 150): T[][] {
  const output: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }

  return output;
}

async function loadPlacesByIds(ids: string[]): Promise<PlaceRow[]> {
  if (ids.length === 0) return [];

  const supabase = getSupabaseAdminClient();
  const rows: PlaceRow[] = [];

  for (const group of chunk(Array.from(new Set(ids)))) {
    const result = await supabase
      .from("places")
      .select(
        "id, slug, name, address_line1, neighbourhood, primary_category, place_type, status, verification_status, import_source, imported_at, latitude, longitude, created_at"
      )
      .in("id", group);

    if (result.error) {
      throw new Error(`Venture could not load imported places: ${result.error.message}`);
    }

    rows.push(...((result.data ?? []) as PlaceRow[]));
  }

  return rows;
}

async function loadEventsByIds(ids: string[]): Promise<EventRow[]> {
  if (ids.length === 0) return [];

  const supabase = getSupabaseAdminClient();
  const rows: EventRow[] = [];

  for (const group of chunk(Array.from(new Set(ids)))) {
    const result = await supabase
      .from("events")
      .select(
        "id, slug, title, primary_category, status, verification_status, venue_id, created_at"
      )
      .in("id", group);

    if (result.error) {
      throw new Error(`Venture could not load imported events: ${result.error.message}`);
    }

    rows.push(...((result.data ?? []) as EventRow[]));
  }

  return rows;
}

async function loadVenues(ids: string[]): Promise<Map<string, VenueRow>> {
  if (ids.length === 0) return new Map();

  const supabase = getSupabaseAdminClient();
  const rows: VenueRow[] = [];

  for (const group of chunk(Array.from(new Set(ids)))) {
    const result = await supabase
      .from("places")
      .select("id, name, address_line1, neighbourhood")
      .in("id", group);

    if (result.error) {
      throw new Error(`Venture could not load event venues: ${result.error.message}`);
    }

    rows.push(...((result.data ?? []) as VenueRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

export async function getImportedInventory(
  filters: ImportedInventoryFilters = {}
): Promise<ImportedInventoryResult> {
  const supabase = getSupabaseAdminClient();
  const [auditResult, overtureResult] = await Promise.all([
    supabase
      .from("audit_log")
      .select("entity_type, entity_id, new_value, created_at")
      .eq("action", "inventory_import_created")
      .order("created_at", { ascending: false })
      .limit(3000),
    supabase
      .from("places")
      .select(
        "id, slug, name, address_line1, neighbourhood, primary_category, place_type, status, verification_status, import_source, imported_at, latitude, longitude, created_at"
      )
      .not("import_source", "is", null)
      .order("imported_at", { ascending: false })
      .limit(3000)
  ]);

  if (auditResult.error) {
    throw new Error(`Venture could not load inventory import history: ${auditResult.error.message}`);
  }

  if (overtureResult.error) {
    throw new Error(`Venture could not load Overture imports: ${overtureResult.error.message}`);
  }

  const audits = (auditResult.data ?? []) as ImportAudit[];
  const auditMetadata = new Map<string, ImportMetadata>();
  const placeIds: string[] = [];
  const eventIds: string[] = [];

  for (const audit of audits) {
    if (audit.entity_type !== "place" && audit.entity_type !== "event") continue;

    const key = `${audit.entity_type}:${audit.entity_id}`;
    if (!auditMetadata.has(key)) {
      auditMetadata.set(key, metadataFromAudit(audit));
    }

    if (audit.entity_type === "place") placeIds.push(audit.entity_id);
    if (audit.entity_type === "event") eventIds.push(audit.entity_id);
  }

  const overturePlaces = (overtureResult.data ?? []) as PlaceRow[];
  const overtureIds = new Set(overturePlaces.map((row) => row.id));
  const auditPlaces = await loadPlacesByIds(placeIds.filter((id) => !overtureIds.has(id)));
  const events = await loadEventsByIds(eventIds);
  const venueMap = await loadVenues(
    events.map((event) => event.venue_id).filter((id): id is string => Boolean(id))
  );

  const records: ImportedInventoryRecord[] = [];

  for (const place of [...overturePlaces, ...auditPlaces]) {
    const metadata = auditMetadata.get(`place:${place.id}`);
    const importedAt = metadata?.importedAt ?? place.imported_at ?? place.created_at;
    const targetArea =
      metadata?.targetArea ??
      place.neighbourhood ??
      inferTargetArea(place.latitude, place.longitude);
    const importSource =
      metadata?.importSource ?? place.import_source ?? "csv_inventory_import";

    records.push({
      key: `place:${place.id}`,
      entityType: "place",
      id: place.id,
      name: place.name,
      address: place.address_line1,
      neighbourhood: place.neighbourhood,
      category: place.primary_category,
      placeType: place.place_type,
      status: place.status,
      verificationStatus: place.verification_status,
      importSource,
      targetArea,
      importedAt,
      batchId: metadata?.batchId ?? null,
      editPath: `/admin/listings/place/${place.id}`,
      publicPath: `/listings/${place.slug}`
    });
  }

  for (const event of events) {
    const metadata = auditMetadata.get(`event:${event.id}`);
    const venue = event.venue_id ? venueMap.get(event.venue_id) : undefined;

    records.push({
      key: `event:${event.id}`,
      entityType: "event",
      id: event.id,
      name: event.title,
      address: venue?.address_line1 ?? venue?.name ?? "Venue not linked",
      neighbourhood: venue?.neighbourhood ?? null,
      category: event.primary_category,
      placeType: null,
      status: event.status,
      verificationStatus: event.verification_status,
      importSource: metadata?.importSource ?? "csv_inventory_import",
      targetArea: metadata?.targetArea ?? venue?.neighbourhood ?? null,
      importedAt: metadata?.importedAt ?? event.created_at,
      batchId: metadata?.batchId ?? null,
      editPath: `/admin/listings/event/${event.id}`,
      publicPath: `/listings/${event.slug}`
    });
  }

  const appliedFilters = {
    search: cleanText(filters.search, 200),
    entityType:
      filters.entityType === "place" || filters.entityType === "event"
        ? filters.entityType
        : "all",
    targetArea: cleanText(filters.targetArea, 160),
    status:
      filters.status === "draft" || filters.status === "published"
        ? filters.status
        : "all",
    placeType: cleanText(filters.placeType, 100),
    importSource: cleanText(filters.importSource, 160)
  } as const;

  const searchNeedle = normalize(appliedFilters.search);
  const filtered = records
    .filter((record) =>
      appliedFilters.entityType === "all"
        ? true
        : record.entityType === appliedFilters.entityType
    )
    .filter((record) =>
      appliedFilters.status === "all" ? true : record.status === appliedFilters.status
    )
    .filter((record) =>
      !appliedFilters.targetArea
        ? true
        : normalize(record.targetArea) === normalize(appliedFilters.targetArea) ||
          normalize(record.neighbourhood) === normalize(appliedFilters.targetArea)
    )
    .filter((record) =>
      !appliedFilters.placeType ? true : record.placeType === appliedFilters.placeType
    )
    .filter((record) =>
      !appliedFilters.importSource
        ? true
        : normalize(record.importSource) === normalize(appliedFilters.importSource)
    )
    .filter((record) => {
      if (!searchNeedle) return true;

      return normalize(
        [
          record.name,
          record.address,
          record.neighbourhood,
          record.targetArea,
          record.category,
          record.placeType,
          record.importSource
        ].join(" ")
      ).includes(searchNeedle);
    })
    .sort((left, right) => {
      const leftTime = left.importedAt ? new Date(left.importedAt).getTime() : 0;
      const rightTime = right.importedAt ? new Date(right.importedAt).getTime() : 0;
      return rightTime - leftTime || left.name.localeCompare(right.name);
    });

  const limit = Math.max(1, Math.min(filters.limit ?? 250, 500));

  return {
    records: filtered.slice(0, limit),
    total: filtered.length,
    targetAreas: Array.from(
      new Set(records.map((record) => record.targetArea || record.neighbourhood).filter(Boolean))
    ).sort((left, right) => String(left).localeCompare(String(right))) as string[],
    placeTypes: Array.from(
      new Set(records.map((record) => record.placeType).filter(Boolean))
    ).sort((left, right) => String(left).localeCompare(String(right))) as string[],
    importSources: Array.from(new Set(records.map((record) => record.importSource))).sort(
      (left, right) => left.localeCompare(right)
    ),
    appliedFilters
  };
}
