"use client";

import {
  clearSyncDeletion,
  queueSyncDeletion
} from "@/lib/account-sync-storage";

import type {
  Listing
} from "@/lib/types";

export const SAVED_OUTINGS_KEY =
  "venture:saved-outings:v1";

export const SAVED_OUTINGS_EVENT =
  "venture:saved-outings-updated";

export type OutingStopKind =
  | "food"
  | "event"
  | "activity"
  | "drinks";

export type OutingStopMix = {
  food: number;
  events: number;
  activities: number;
  drinks: number;
};

export type OutingPlanStatus =
  | "complete"
  | "partial"
  | "empty";

export type GeneratedOutingStop = {
  order: number;
  kind?: OutingStopKind;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  travelFromPreviousMinutes:
    | number
    | null;
  estimatedCostCad:
    | number
    | null;
  reason: string;
  listing: Listing;
};

export type GeneratedOutingPlan = {
  planId: string;
  generatedAt: string;
  recommendationVersion?: string;
  title: string;
  date: string;
  requestedStartTime: string;
  requestedDuration: string;
  transportation: string;
  alcoholFree: boolean;
  planningMode?: "solo" | "group";
  buildMethod?: "surprise" | "mix" | "anchor";
  discoveryPreference?:
    | "best"
    | "new-only"
    | "mix";
  partySize?: number;
  maxTravelMinutes?: number;
  mustIncludeTerms?: string[];
  avoidTerms?: string[];
  requestedMix?: OutingStopMix;
  actualMix?: OutingStopMix;
  requestedStopCount?: number;
  actualStopCount?: number;
  missingStopCount?: number;
  planStatus?: OutingPlanStatus;
  anchorListingKey?: string | null;
  anchorListingName?: string | null;
  anchorDurationMinutes?: number | null;
  anchorPlacement?:
    | "before"
    | "after"
    | "both";
  soloVibe?:
    | "slow-reset"
    | "curious-explorer"
    | "treat-myself"
    | "social-solo"
    | null;
  soloPace?:
    | "relaxed"
    | "balanced"
    | "packed"
    | null;
  groupVibe?:
    | "friends-night"
    | "date-night"
    | "celebration"
    | "family-plan"
    | "nightlife"
    | null;
  groupPriority?:
    | "everyone-happy"
    | "budget-friendly"
    | "minimal-travel"
    | null;
  estimatedTotalCad: number | null;
  estimatedGroupTotalCad?: number | null;
  stops: GeneratedOutingStop[];
  warnings: string[];
  candidateCount: number;
};

export function isGeneratedOutingPlan(
  value: unknown
): value is GeneratedOutingPlan {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const item = value as Record<
    string,
    unknown
  >;

  return (
    typeof item.planId === "string" &&
    typeof item.generatedAt === "string" &&
    typeof item.title === "string" &&
    typeof item.date === "string" &&
    typeof item.requestedStartTime === "string" &&
    typeof item.requestedDuration === "string" &&
    typeof item.transportation === "string" &&
    typeof item.alcoholFree === "boolean" &&
    Array.isArray(item.stops) &&
    Array.isArray(item.warnings)
  );
}

function notifySavedOutingsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new Event(
      SAVED_OUTINGS_EVENT
    )
  );
}

export function getSavedOutings():
  GeneratedOutingPlan[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored =
      window.localStorage.getItem(
        SAVED_OUTINGS_KEY
      );

    if (!stored) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      isGeneratedOutingPlan
    );
  } catch {
    return [];
  }
}

export function writeSavedOutings(
  outings: GeneratedOutingPlan[]
) {
  if (typeof window === "undefined") {
    return;
  }

  const seen = new Set<string>();

  const normalized = outings
    .filter(isGeneratedOutingPlan)
    .filter((outing) => {
      if (seen.has(outing.planId)) {
        return false;
      }

      seen.add(outing.planId);
      return true;
    })
    .sort((first, second) =>
      second.generatedAt.localeCompare(
        first.generatedAt
      )
    )
    .slice(0, 100);

  const nextValue =
    JSON.stringify(normalized);

  if (
    window.localStorage.getItem(
      SAVED_OUTINGS_KEY
    ) === nextValue
  ) {
    return;
  }

  window.localStorage.setItem(
    SAVED_OUTINGS_KEY,
    nextValue
  );

  notifySavedOutingsChanged();
}

export function isOutingSaved(
  planId: string
): boolean {
  return getSavedOutings().some(
    (outing) =>
      outing.planId === planId
  );
}

export function saveOuting(
  plan: GeneratedOutingPlan
) {
  if (typeof window === "undefined") {
    return;
  }

  clearSyncDeletion(
    "outing",
    plan.planId
  );

  writeSavedOutings([
    plan,
    ...getSavedOutings().filter(
      (outing) =>
        outing.planId !== plan.planId
    )
  ]);
}

export function removeSavedOuting(
  planId: string
) {
  if (typeof window === "undefined") {
    return;
  }

  writeSavedOutings(
    getSavedOutings().filter(
      (outing) =>
        outing.planId !== planId
    )
  );

  queueSyncDeletion(
    "outing",
    planId
  );
}
