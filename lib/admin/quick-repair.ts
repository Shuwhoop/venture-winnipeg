import "server-only";

import type { VentureAdmin } from "@/lib/auth/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  QuickRepairBatchResult,
  QuickRepairChange,
  QuickRepairItemResult
} from "@/lib/admin/quick-repair-types";

const MAX_BATCH_SIZE = 50;
const MANUAL_SOURCE_NAME = "Venture admin research";
const VERIFICATION_STATUSES = new Set([
  "official_source",
  "verified_venture",
  "verified_business",
  "community_reported",
  "unverified"
]);

function text(value: unknown, maxLength = 5000): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function parseEntityType(value: unknown): "place" | "event" {
  if (value === "place" || value === "event") {
    return value;
  }

  throw new Error("Listing type is invalid.");
}

function parseVerificationStatus(value: unknown): string | null {
  const cleaned = text(value, 80);

  if (!cleaned) {
    return null;
  }

  if (!VERIFICATION_STATUSES.has(cleaned)) {
    throw new Error("Verification status is invalid.");
  }

  return cleaned;
}

function parseCheckedAt(value: unknown): string | null {
  const cleaned = text(value, 100);

  if (!cleaned) {
    return null;
  }

  const parsed = new Date(cleaned);

  if (!Number.isFinite(parsed.getTime())) {
    throw new Error("Source checked date is invalid.");
  }

  return parsed.toISOString();
}

function parseSourceUrl(value: unknown): string | null {
  const cleaned = text(value, 2000);

  if (!cleaned) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(cleaned);
  } catch {
    throw new Error("Source URL must be a valid web address.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Source URL must begin with http:// or https://.");
  }

  return url.toString();
}

async function getManualSourceId(): Promise<string> {
  const supabase = getSupabaseAdminClient();
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
      reviewed_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (created.error || !created.data?.id) {
    throw new Error(
      `Venture could not create the admin source record: ${created.error?.message ?? "No row returned."}`
    );
  }

  return created.data.id;
}

type PrimarySource = {
  id: string;
  source_url: string;
  last_checked_at: string | null;
  is_primary: boolean;
};

async function loadPrimarySource(
  entityType: "place" | "event",
  entityId: string
): Promise<PrimarySource | null> {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("listing_sources")
    .select("id, source_url, last_checked_at, is_primary")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("is_primary", { ascending: false })
    .limit(10);

  if (result.error) {
    throw new Error(
      `Venture could not read the listing source: ${result.error.message}`
    );
  }

  const rows = (result.data ?? []) as PrimarySource[];
  return rows.find((row) => row.is_primary) ?? rows[0] ?? null;
}

async function savePrimarySource({
  entityType,
  entityId,
  current,
  sourceUrl,
  sourceCheckedAt
}: {
  entityType: "place" | "event";
  entityId: string;
  current: PrimarySource | null;
  sourceUrl: string | null;
  sourceCheckedAt: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const effectiveUrl = sourceUrl ?? current?.source_url ?? null;

  if (!effectiveUrl) {
    return;
  }

  if (current) {
    const result = await supabase
      .from("listing_sources")
      .update({
        source_url: effectiveUrl,
        is_primary: true,
        last_checked_at:
          sourceCheckedAt ?? current.last_checked_at,
        legal_notes:
          "Admin-reviewed link. Link only unless separate content rights are recorded."
      })
      .eq("id", current.id);

    if (result.error) {
      throw new Error(
        `Venture could not update the source link: ${result.error.message}`
      );
    }

    return;
  }

  const manualSourceId = await getManualSourceId();
  const result = await supabase
    .from("listing_sources")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      source_id: manualSourceId,
      source_url: effectiveUrl,
      is_primary: true,
      last_checked_at: sourceCheckedAt,
      extracted_at: sourceCheckedAt,
      legal_notes:
        "Admin-reviewed link. Link only unless separate content rights are recorded."
    });

  if (result.error) {
    throw new Error(
      `Venture could not save the source link: ${result.error.message}`
    );
  }
}

async function logQuickRepair({
  admin,
  entityType,
  id,
  previousValue,
  newValue
}: {
  admin: VentureAdmin;
  entityType: "place" | "event";
  id: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const result = await supabase.from("audit_log").insert({
    actor_id: admin.id,
    entity_type: entityType,
    entity_id: id,
    action: "admin_quick_repair",
    previous_value: previousValue,
    new_value: newValue,
    source: "admin-quick-repair"
  });

  if (result.error) {
    console.error("Quick repair audit log failed", {
      entityType,
      id,
      message: result.error.message
    });
  }
}

async function updateOneQuickRepair(
  raw: QuickRepairChange,
  admin: VentureAdmin
): Promise<QuickRepairItemResult> {
  const entityType = parseEntityType(raw.entityType);
  const id = text(raw.id, 100);

  if (!id) {
    throw new Error("Listing ID is required.");
  }

  const primaryCategory = text(raw.primaryCategory, 120);
  const neighbourhood = text(raw.neighbourhood, 120);
  const verificationStatus = parseVerificationStatus(
    raw.verificationStatus
  );
  const sourceUrl = parseSourceUrl(raw.sourceUrl);
  const sourceCheckedAt = parseCheckedAt(raw.sourceCheckedAt);
  const applyWinnipegDefaults = raw.applyWinnipegDefaults === true;
  const supabase = getSupabaseAdminClient();
  const source = await loadPrimarySource(entityType, id);

  if (entityType === "place") {
    const beforeResult = await supabase
      .from("places")
      .select(
        "id, name, neighbourhood, primary_category, verification_status, city, province, source_checked_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (beforeResult.error) {
      throw new Error(
        `Venture could not load this place: ${beforeResult.error.message}`
      );
    }

    if (!beforeResult.data) {
      throw new Error("The place no longer exists.");
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (neighbourhood) update.neighbourhood = neighbourhood;
    if (primaryCategory) update.primary_category = primaryCategory;
    if (verificationStatus) {
      update.verification_status = verificationStatus;
    }
    if (sourceCheckedAt) update.source_checked_at = sourceCheckedAt;
    if (applyWinnipegDefaults) {
      update.city = "Winnipeg";
      update.province = "Manitoba";
    }

    const result = await supabase
      .from("places")
      .update(update)
      .eq("id", id)
      .select("id")
      .single();

    if (result.error || !result.data) {
      throw new Error(
        `Venture could not save this place: ${result.error?.message ?? "No row returned."}`
      );
    }

    await savePrimarySource({
      entityType,
      entityId: id,
      current: source,
      sourceUrl,
      sourceCheckedAt
    });

    await logQuickRepair({
      admin,
      entityType,
      id,
      previousValue: {
        ...beforeResult.data,
        sourceUrl: source?.source_url ?? null,
        sourceLastCheckedAt: source?.last_checked_at ?? null
      },
      newValue: {
        ...update,
        sourceUrl: sourceUrl ?? source?.source_url ?? null,
        sourceLastCheckedAt:
          sourceCheckedAt ?? source?.last_checked_at ?? null
      }
    });

    return {
      key: `${entityType}:${id}`,
      ok: true,
      message: `${beforeResult.data.name} saved.`
    };
  }

  const beforeResult = await supabase
    .from("events")
    .select(
      "id, title, primary_category, verification_status, timezone, source_checked_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (beforeResult.error) {
    throw new Error(
      `Venture could not load this event: ${beforeResult.error.message}`
    );
  }

  if (!beforeResult.data) {
    throw new Error("The event no longer exists.");
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (primaryCategory) update.primary_category = primaryCategory;
  if (verificationStatus) {
    update.verification_status = verificationStatus;
  }
  if (sourceCheckedAt) update.source_checked_at = sourceCheckedAt;
  if (applyWinnipegDefaults) {
    update.timezone = "America/Winnipeg";
  }

  const result = await supabase
    .from("events")
    .update(update)
    .eq("id", id)
    .select("id")
    .single();

  if (result.error || !result.data) {
    throw new Error(
      `Venture could not save this event: ${result.error?.message ?? "No row returned."}`
    );
  }

  await savePrimarySource({
    entityType,
    entityId: id,
    current: source,
    sourceUrl,
    sourceCheckedAt
  });

  await logQuickRepair({
    admin,
    entityType,
    id,
    previousValue: {
      ...beforeResult.data,
      sourceUrl: source?.source_url ?? null,
      sourceLastCheckedAt: source?.last_checked_at ?? null
    },
    newValue: {
      ...update,
      sourceUrl: sourceUrl ?? source?.source_url ?? null,
      sourceLastCheckedAt:
        sourceCheckedAt ?? source?.last_checked_at ?? null
    }
  });

  return {
    key: `${entityType}:${id}`,
    ok: true,
    message: `${beforeResult.data.title} saved.`
  };
}

export async function updateQuickRepairs({
  changes,
  admin
}: {
  changes: QuickRepairChange[];
  admin: VentureAdmin;
}): Promise<QuickRepairBatchResult> {
  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error("Choose at least one changed listing to save.");
  }

  if (changes.length > MAX_BATCH_SIZE) {
    throw new Error(`Save no more than ${MAX_BATCH_SIZE} listings at once.`);
  }

  const results: QuickRepairItemResult[] = [];

  for (const change of changes) {
    const key = `${String(change.entityType)}:${String(change.id)}`;

    try {
      results.push(await updateOneQuickRepair(change, admin));
    } catch (error) {
      results.push({
        key,
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Venture could not save this listing."
      });
    }
  }

  const saved = results.filter((result) => result.ok).length;
  const failed = results.length - saved;

  return {
    ok: failed === 0,
    saved,
    failed,
    results
  };
}
