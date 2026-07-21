import "server-only";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

export type AdminClaimRequest = {
  id: string;
  placeId: string;
  placeName: string;
  placeSlug: string;
  claimantName: string;
  claimantRole: string;
  businessEmail: string;
  businessPhone: string | null;
  officialWebsite: string;
  evidence: string;
  status: string;
  resolutionNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type AdminReportItem = {
  id: string;
  entityType: "place" | "event";
  entityId: string;
  listingName: string;
  listingSlug: string | null;
  reason: string;
  details: string | null;
  sourceUrl: string | null;
  status: string;
  resolutionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export async function getClaimRequests(
  status = "pending",
  limit = 200
): Promise<{
  items: AdminClaimRequest[];
  migrationRequired: boolean;
}> {
  const supabase =
    getSupabaseAdminClient();

  let query = supabase
    .from("business_claim_requests")
    .select(`
      id,
      place_id,
      claimant_name,
      claimant_role,
      business_email,
      business_phone,
      official_website,
      evidence,
      status,
      resolution_notes,
      created_at,
      reviewed_at,
      place:places (
        name,
        slug
      )
    `)
    .order("created_at", {
      ascending: false
    })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } =
    await query;

  if (error) {
    if (error.code === "42P01") {
      return {
        items: [],
        migrationRequired: true
      };
    }

    throw error;
  }

  const items = (data ?? []).map(
    (row) => {
      const placeValue =
        row.place as
          | {
              name?: string;
              slug?: string;
            }
          | {
              name?: string;
              slug?: string;
            }[]
          | null;
      const place = Array.isArray(placeValue)
        ? placeValue[0]
        : placeValue;

      return {
        id: String(row.id),
        placeId: String(row.place_id),
        placeName:
          place?.name ?? "Unknown place",
        placeSlug:
          place?.slug ?? "",
        claimantName:
          String(row.claimant_name),
        claimantRole:
          String(row.claimant_role),
        businessEmail:
          String(row.business_email),
        businessPhone:
          row.business_phone
            ? String(row.business_phone)
            : null,
        officialWebsite:
          String(row.official_website),
        evidence:
          String(row.evidence),
        status: String(row.status),
        resolutionNotes:
          row.resolution_notes
            ? String(row.resolution_notes)
            : null,
        createdAt:
          String(row.created_at),
        reviewedAt:
          row.reviewed_at
            ? String(row.reviewed_at)
            : null
      } satisfies AdminClaimRequest;
    }
  );

  return {
    items,
    migrationRequired: false
  };
}

export async function getReportItems(
  status = "open",
  limit = 250
): Promise<AdminReportItem[]> {
  const supabase =
    getSupabaseAdminClient();

  let query = supabase
    .from("reports")
    .select(`
      id,
      entity_type,
      entity_id,
      reason,
      details,
      source_url,
      status,
      resolution_notes,
      created_at,
      resolved_at
    `)
    .order("created_at", {
      ascending: false
    })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } =
    await query;

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const placeIds = rows
    .filter(
      (row) => row.entity_type === "place"
    )
    .map((row) => String(row.entity_id));
  const eventIds = rows
    .filter(
      (row) => row.entity_type === "event"
    )
    .map((row) => String(row.entity_id));

  const [placesResult, eventsResult] =
    await Promise.all([
      placeIds.length > 0
        ? supabase
            .from("places")
            .select("id,name,slug")
            .in("id", placeIds)
        : Promise.resolve({
            data: [],
            error: null
          }),
      eventIds.length > 0
        ? supabase
            .from("events")
            .select("id,title,slug")
            .in("id", eventIds)
        : Promise.resolve({
            data: [],
            error: null
          })
    ]);

  if (placesResult.error) {
    throw placesResult.error;
  }

  if (eventsResult.error) {
    throw eventsResult.error;
  }

  const names = new Map<
    string,
    {
      name: string;
      slug: string;
    }
  >();

  for (const place of placesResult.data ?? []) {
    names.set(
      `place:${place.id}`,
      {
        name: String(place.name),
        slug: String(place.slug)
      }
    );
  }

  for (const event of eventsResult.data ?? []) {
    names.set(
      `event:${event.id}`,
      {
        name: String(event.title),
        slug: String(event.slug)
      }
    );
  }

  return rows.map((row) => {
    const entityType =
      row.entity_type === "event"
        ? "event"
        : "place";
    const match = names.get(
      `${entityType}:${row.entity_id}`
    );

    return {
      id: String(row.id),
      entityType,
      entityId: String(row.entity_id),
      listingName:
        match?.name ?? "Unknown listing",
      listingSlug:
        match?.slug ?? null,
      reason: String(row.reason),
      details:
        row.details
          ? String(row.details)
          : null,
      sourceUrl:
        row.source_url
          ? String(row.source_url)
          : null,
      status: String(row.status),
      resolutionNotes:
        row.resolution_notes
          ? String(row.resolution_notes)
          : null,
      createdAt: String(row.created_at),
      resolvedAt:
        row.resolved_at
          ? String(row.resolved_at)
          : null
    } satisfies AdminReportItem;
  });
}
