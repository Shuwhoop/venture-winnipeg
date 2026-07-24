"use client";

import type {
  User
} from "@supabase/supabase-js";

import {
  ACCOUNT_AUTH_EVENT,
  ACCOUNT_SYNC_STATUS_EVENT,
  getStoredAccountSyncMeta,
  getSyncDeletions,
  writeStoredAccountSyncMeta,
  writeSyncDeletions,
  type SyncDeletion
} from "@/lib/account-sync-storage";

import {
  getSavedListingReferences,
  isListingSnapshot,
  savedListingKey,
  writeSavedListingReferences,
  type SavedListingReference
} from "@/lib/saved-listings";

import {
  getSavedOutings,
  isGeneratedOutingPlan,
  writeSavedOutings,
  type GeneratedOutingPlan
} from "@/lib/saved-outings";

import {
  loadPreferences,
  normalizePreferences,
  savePreferences,
  type VenturePreferences
} from "@/lib/profile-preferences";

import {
  getVisitHistory,
  isVisitRecord,
  writeVisitHistory,
  type VisitRecord
} from "@/lib/visit-history";

import {
  getSupabaseBrowserClient
} from "@/lib/supabase/client";

export type AccountSyncPhase =
  | "loading"
  | "guest"
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "error";

export type AccountSyncState = {
  phase: AccountSyncPhase;
  userId: string | null;
  email: string | null;
  lastSyncedAt: string | null;
  error: string | null;
  savedListingCount: number;
  savedOutingCount: number;
  visitedCount: number;
  pendingDeletionCount: number;
};

type CloudSavedListingRow = {
  listing_type: "event" | "restaurant";
  listing_id: string;
  listing_slug: string;
  listing_snapshot: unknown;
  saved_at: string;
  updated_at: string;
};

type CloudSavedOutingRow = {
  plan_id: string;
  plan_snapshot: unknown;
  saved_at: string;
  updated_at: string;
};

type CloudVisitRow = {
  visit_id: string;
  listing_type: "event" | "restaurant";
  listing_id: string;
  listing_slug: string;
  listing_key: string;
  listing_snapshot: unknown;
  event_occurrence_key: string | null;
  visited_at: string;
  source: "manual" | "outing_complete" | "imported";
  outing_id: string | null;
  would_return: boolean | null;
  personal_rating: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

type CloudProfileRow = {
  preferences: unknown;
  updated_at: string;
};

let activeSync:
  Promise<AccountSyncState> | null =
  null;

function dispatchAccountState(
  state: AccountSyncState
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AccountSyncState>(
      ACCOUNT_SYNC_STATUS_EVENT,
      {
        detail: state
      }
    )
  );
}

export function dispatchAuthChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new Event(
      ACCOUNT_AUTH_EVENT
    )
  );
}

function currentCounts() {
  return {
    savedListingCount:
      getSavedListingReferences().length,
    savedOutingCount:
      getSavedOutings().length,
    visitedCount:
      getVisitHistory().length,
    pendingDeletionCount:
      getSyncDeletions().length
  };
}

export function getLocalAccountSyncState():
  AccountSyncState {
  const meta =
    getStoredAccountSyncMeta();

  return {
    phase:
      meta.userId
        ? meta.lastError
          ? "error"
          : meta.lastSyncedAt
            ? "synced"
            : "idle"
        : "guest",
    userId: meta.userId,
    email: meta.email,
    lastSyncedAt: meta.lastSyncedAt,
    error: meta.lastError,
    ...currentCounts()
  };
}

function timestampOf(
  value: string | null | undefined
) {
  const parsed = value
    ? Date.parse(value)
    : Number.NaN;

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function newerListing(
  first: SavedListingReference,
  second: SavedListingReference
) {
  const firstTime = timestampOf(
    first.updatedAt ?? first.savedAt
  );
  const secondTime = timestampOf(
    second.updatedAt ?? second.savedAt
  );

  if (secondTime > firstTime) {
    return second;
  }

  if (
    !first.snapshot &&
    second.snapshot
  ) {
    return second;
  }

  return first;
}

function mergeListings(
  local: SavedListingReference[],
  cloud: CloudSavedListingRow[],
  deletedKeys: Set<string>
) {
  const merged = new Map<
    string,
    SavedListingReference
  >();

  for (const reference of local) {
    const key = savedListingKey(reference);

    if (!deletedKeys.has(key)) {
      merged.set(key, reference);
    }
  }

  for (const row of cloud) {
    const reference: SavedListingReference = {
      id: row.listing_id,
      slug: row.listing_slug,
      type: row.listing_type,
      savedAt: row.saved_at,
      updatedAt: row.updated_at,
      snapshot:
        isListingSnapshot(
          row.listing_snapshot
        )
          ? row.listing_snapshot
          : undefined
    };

    const key = savedListingKey(reference);

    if (deletedKeys.has(key)) {
      continue;
    }

    const current = merged.get(key);

    merged.set(
      key,
      current
        ? newerListing(current, reference)
        : reference
    );
  }

  return [...merged.values()].sort(
    (first, second) =>
      timestampOf(
        second.updatedAt ?? second.savedAt
      ) -
      timestampOf(
        first.updatedAt ?? first.savedAt
      )
  );
}

function mergeOutings(
  local: GeneratedOutingPlan[],
  cloud: CloudSavedOutingRow[],
  deletedKeys: Set<string>
) {
  const merged = new Map<
    string,
    GeneratedOutingPlan
  >();

  for (const outing of local) {
    if (!deletedKeys.has(outing.planId)) {
      merged.set(outing.planId, outing);
    }
  }

  for (const row of cloud) {
    if (
      deletedKeys.has(row.plan_id) ||
      !isGeneratedOutingPlan(
        row.plan_snapshot
      )
    ) {
      continue;
    }

    const cloudPlan =
      row.plan_snapshot;

    const current = merged.get(
      row.plan_id
    );

    if (
      !current ||
      timestampOf(cloudPlan.generatedAt) >
        timestampOf(current.generatedAt)
    ) {
      merged.set(
        row.plan_id,
        cloudPlan
      );
    }
  }

  return [...merged.values()].sort(
    (first, second) =>
      timestampOf(second.generatedAt) -
      timestampOf(first.generatedAt)
  );
}

function mergeVisits(
  local: VisitRecord[],
  cloud: CloudVisitRow[],
  deletedKeys: Set<string>
) {
  const merged = new Map<
    string,
    VisitRecord
  >();

  for (const visit of local) {
    if (!deletedKeys.has(visit.visitId)) {
      merged.set(visit.visitId, visit);
    }
  }

  for (const row of cloud) {
    if (
      deletedKeys.has(row.visit_id) ||
      !isVisitRecord({
        visitId: row.visit_id,
        listingKey: row.listing_key,
        listingId: row.listing_id,
        listingSlug: row.listing_slug,
        listingType: row.listing_type,
        listingSnapshot: row.listing_snapshot,
        eventOccurrenceKey:
          row.event_occurrence_key,
        visitedAt: row.visited_at,
        source: row.source,
        outingId: row.outing_id,
        wouldReturn: row.would_return,
        personalRating:
          row.personal_rating,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })
    ) {
      continue;
    }

    const cloudVisit: VisitRecord = {
      visitId: row.visit_id,
      listingKey: row.listing_key,
      listingId: row.listing_id,
      listingSlug: row.listing_slug,
      listingType: row.listing_type,
      listingSnapshot:
        row.listing_snapshot as VisitRecord["listingSnapshot"],
      eventOccurrenceKey:
        row.event_occurrence_key,
      visitedAt: row.visited_at,
      source: row.source,
      outingId: row.outing_id,
      wouldReturn: row.would_return,
      personalRating:
        row.personal_rating,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    const current = merged.get(
      cloudVisit.visitId
    );

    if (
      !current ||
      timestampOf(cloudVisit.updatedAt) >
        timestampOf(current.updatedAt)
    ) {
      merged.set(
        cloudVisit.visitId,
        cloudVisit
      );
    }
  }

  return [...merged.values()].sort(
    (first, second) =>
      timestampOf(second.visitedAt) -
      timestampOf(first.visitedAt)
  );
}

function choosePreferences(
  local: VenturePreferences,
  cloudRow: CloudProfileRow | null
) {
  if (!cloudRow) {
    return local;
  }

  const cloud = normalizePreferences(
    cloudRow.preferences
  );

  const cloudHasMeaningfulData =
    cloud.displayName !== "Guest" ||
    cloud.interests.length > 0 ||
    cloud.neighbourhoods.length > 0 ||
    cloud.outingStyles.length > 0 ||
    cloud.updatedAt !== null;

  if (!cloudHasMeaningfulData) {
    return local;
  }

  return timestampOf(cloud.updatedAt) >
    timestampOf(local.updatedAt)
    ? cloud
    : local;
}

function stateForUser(
  user: User,
  phase: AccountSyncPhase,
  options?: {
    lastSyncedAt?: string | null;
    error?: string | null;
  }
): AccountSyncState {
  const stored =
    getStoredAccountSyncMeta();

  return {
    phase,
    userId: user.id,
    email: user.email ?? null,
    lastSyncedAt:
      options?.lastSyncedAt ??
      stored.lastSyncedAt,
    error:
      options?.error ?? null,
    ...currentCounts()
  };
}

async function deleteCloudTombstones(
  userId: string,
  deletions: SyncDeletion[]
) {
  const supabase =
    getSupabaseBrowserClient();

  const remaining: SyncDeletion[] = [];

  for (const deletion of deletions) {
    if (deletion.kind === "listing") {
      const separator =
        deletion.key.indexOf(":");

      if (separator < 1) {
        continue;
      }

      const listingType =
        deletion.key.slice(0, separator);
      const listingId =
        deletion.key.slice(separator + 1);

      if (
        listingType !== "event" &&
        listingType !== "restaurant"
      ) {
        continue;
      }

      const { error } = await supabase
        .from("user_saved_listings")
        .delete()
        .eq("user_id", userId)
        .eq("listing_type", listingType)
        .eq("listing_id", listingId);

      if (error) {
        remaining.push(deletion);
      }

      continue;
    }

    if (deletion.kind === "visit") {
      const { error } = await supabase
        .from("user_visits")
        .delete()
        .eq("user_id", userId)
        .eq("visit_id", deletion.key);

      if (error) {
        remaining.push(deletion);
      }

      continue;
    }

    const { error } = await supabase
      .from("user_saved_outings")
      .delete()
      .eq("user_id", userId)
      .eq("plan_id", deletion.key);

    if (error) {
      remaining.push(deletion);
    }
  }

  writeSyncDeletions(remaining);

  if (remaining.length > 0) {
    throw new Error(
      "Some removed items could not be cleared from the cloud yet."
    );
  }
}

async function performAccountSync(
  user: User
): Promise<AccountSyncState> {
  if (!window.navigator.onLine) {
    const state = stateForUser(
      user,
      "offline"
    );

    dispatchAccountState(state);
    return state;
  }

  const syncingState = stateForUser(
    user,
    "syncing"
  );

  dispatchAccountState(syncingState);

  const supabase =
    getSupabaseBrowserClient();

  const deletions =
    getSyncDeletions();

  const deletedListings = new Set(
    deletions
      .filter((item) =>
        item.kind === "listing"
      )
      .map((item) => item.key)
  );

  const deletedOutings = new Set(
    deletions
      .filter((item) =>
        item.kind === "outing"
      )
      .map((item) => item.key)
  );

  const deletedVisits = new Set(
    deletions
      .filter((item) =>
        item.kind === "visit"
      )
      .map((item) => item.key)
  );

  await deleteCloudTombstones(
    user.id,
    deletions
  );

  const [
    cloudListingsResult,
    cloudOutingsResult,
    cloudVisitsResult,
    cloudProfileResult
  ] = await Promise.all([
    supabase
      .from("user_saved_listings")
      .select(
        "listing_type, listing_id, listing_slug, listing_snapshot, saved_at, updated_at"
      )
      .eq("user_id", user.id),
    supabase
      .from("user_saved_outings")
      .select(
        "plan_id, plan_snapshot, saved_at, updated_at"
      )
      .eq("user_id", user.id),
    supabase
      .from("user_visits")
      .select(
        "visit_id, listing_type, listing_id, listing_slug, listing_key, listing_snapshot, event_occurrence_key, visited_at, source, outing_id, would_return, personal_rating, notes, created_at, updated_at"
      )
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("preferences, updated_at")
      .eq("id", user.id)
      .maybeSingle()
  ]);

  if (cloudListingsResult.error) {
    throw cloudListingsResult.error;
  }

  if (cloudOutingsResult.error) {
    throw cloudOutingsResult.error;
  }

  if (cloudVisitsResult.error) {
    throw cloudVisitsResult.error;
  }

  if (cloudProfileResult.error) {
    throw cloudProfileResult.error;
  }

  const mergedListings = mergeListings(
    getSavedListingReferences(),
    (cloudListingsResult.data ?? []) as
      CloudSavedListingRow[],
    deletedListings
  );

  const mergedOutings = mergeOutings(
    getSavedOutings(),
    (cloudOutingsResult.data ?? []) as
      CloudSavedOutingRow[],
    deletedOutings
  );

  const mergedVisits = mergeVisits(
    getVisitHistory(),
    (cloudVisitsResult.data ?? []) as
      CloudVisitRow[],
    deletedVisits
  );

  const selectedPreferences =
    choosePreferences(
      loadPreferences(),
      cloudProfileResult.data as
        CloudProfileRow | null
    );

  const now = new Date().toISOString();

  const listingRows = mergedListings.map(
    (reference) => ({
      user_id: user.id,
      listing_type: reference.type,
      listing_id: reference.id,
      listing_slug: reference.slug,
      listing_snapshot:
        reference.snapshot ?? {},
      saved_at: reference.savedAt,
      updated_at:
        reference.updatedAt ?? now
    })
  );

  const outingRows = mergedOutings.map(
    (outing) => ({
      user_id: user.id,
      plan_id: outing.planId,
      plan_snapshot: outing,
      saved_at: outing.generatedAt,
      updated_at: now
    })
  );

  const visitRows = mergedVisits.map(
    (visit) => ({
      user_id: user.id,
      visit_id: visit.visitId,
      listing_type: visit.listingType,
      listing_id: visit.listingId,
      listing_slug: visit.listingSlug,
      listing_key: visit.listingKey,
      listing_snapshot:
        visit.listingSnapshot,
      event_occurrence_key:
        visit.eventOccurrenceKey,
      visited_at: visit.visitedAt,
      source: visit.source,
      outing_id: visit.outingId,
      would_return: visit.wouldReturn,
      personal_rating:
        visit.personalRating,
      notes: visit.notes,
      created_at: visit.createdAt,
      updated_at: visit.updatedAt
    })
  );

  if (listingRows.length > 0) {
    const { error } = await supabase
      .from("user_saved_listings")
      .upsert(listingRows, {
        onConflict:
          "user_id,listing_type,listing_id"
      });

    if (error) {
      throw error;
    }
  }

  if (outingRows.length > 0) {
    const { error } = await supabase
      .from("user_saved_outings")
      .upsert(outingRows, {
        onConflict:
          "user_id,plan_id"
      });

    if (error) {
      throw error;
    }
  }

  if (visitRows.length > 0) {
    const { error } = await supabase
      .from("user_visits")
      .upsert(visitRows, {
        onConflict:
          "user_id,visit_id"
      });

    if (error) {
      throw error;
    }
  }

  const syncedPreferences: VenturePreferences = {
    ...selectedPreferences,
    updatedAt:
      selectedPreferences.updatedAt ?? now
  };

  const { error: profileError } =
    await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name:
            syncedPreferences.displayName,
          interests:
            syncedPreferences.interests,
          preferences:
            syncedPreferences,
          last_synced_at: now
        },
        {
          onConflict: "id"
        }
      );

  if (profileError) {
    throw profileError;
  }

  writeSavedListingReferences(
    mergedListings
  );
  writeSavedOutings(mergedOutings);
  writeVisitHistory(mergedVisits);
  savePreferences(syncedPreferences);

  writeStoredAccountSyncMeta({
    userId: user.id,
    email: user.email ?? null,
    lastSyncedAt: now,
    lastError: null
  });

  const syncedState = stateForUser(
    user,
    "synced",
    {
      lastSyncedAt: now,
      error: null
    }
  );

  dispatchAccountState(syncedState);
  return syncedState;
}

export async function getCurrentVentureUser() {
  try {
    const supabase =
      getSupabaseBrowserClient();

    const {
      data: sessionData
    } = await supabase.auth.getSession();

    if (sessionData.session?.user) {
      return sessionData.session.user;
    }

    const {
      data,
      error
    } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}

export async function runAccountSync():
  Promise<AccountSyncState> {
  if (activeSync) {
    return activeSync;
  }

  activeSync = (async () => {
    const user =
      await getCurrentVentureUser();

    if (!user) {
      const guestState: AccountSyncState = {
        phase: "guest",
        userId: null,
        email: null,
        lastSyncedAt: null,
        error: null,
        ...currentCounts()
      };

      dispatchAccountState(guestState);
      return guestState;
    }

    try {
      return await performAccountSync(user);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Venture could not finish syncing.";

      const stored =
        getStoredAccountSyncMeta();

      writeStoredAccountSyncMeta({
        userId: user.id,
        email: user.email ?? null,
        lastSyncedAt:
          stored.lastSyncedAt,
        lastError: message
      });

      const errorState = stateForUser(
        user,
        window.navigator.onLine
          ? "error"
          : "offline",
        {
          lastSyncedAt:
            stored.lastSyncedAt,
          error: message
        }
      );

      dispatchAccountState(errorState);
      return errorState;
    }
  })();

  try {
    return await activeSync;
  } finally {
    activeSync = null;
  }
}
