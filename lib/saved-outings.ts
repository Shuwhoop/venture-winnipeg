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
  | "drinks";

export type OutingStopMix = {
  food: number;
  events: number;
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

  planningMode?:
    | "solo"
    | "group";

  buildMethod?:
    | "surprise"
    | "mix"
    | "anchor";

  partySize?: number;
  maxTravelMinutes?: number;
  mustIncludeTerms?: string[];
  avoidTerms?: string[];

  requestedMix?:
    OutingStopMix;

  actualMix?:
    OutingStopMix;

  requestedStopCount?: number;
  actualStopCount?: number;
  missingStopCount?: number;
  planStatus?: OutingPlanStatus;

  anchorListingKey?:
    | string
    | null;

  anchorListingName?:
    | string
    | null;

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

  estimatedTotalCad:
    | number
    | null;

  estimatedGroupTotalCad?:
    | number
    | null;

  stops: GeneratedOutingStop[];
  warnings: string[];
  candidateCount: number;
};

function notifySavedOutingsChanged() {
  if (
    typeof window ===
    "undefined"
  ) {
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
  if (
    typeof window ===
    "undefined"
  ) {
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

    const parsed =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (
        item
      ): item is GeneratedOutingPlan =>
        Boolean(
          item &&
          typeof item === "object" &&
          typeof item.planId === "string" &&
          typeof item.title === "string" &&
          Array.isArray(item.stops)
        )
    );
  } catch {
    return [];
  }
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
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const currentOutings =
    getSavedOutings();

  const withoutExisting =
    currentOutings.filter(
      (outing) =>
        outing.planId !==
        plan.planId
    );

  window.localStorage.setItem(
    SAVED_OUTINGS_KEY,
    JSON.stringify([
      plan,
      ...withoutExisting
    ])
  );

  notifySavedOutingsChanged();
}

export function removeSavedOuting(
  planId: string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const updatedOutings =
    getSavedOutings().filter(
      (outing) =>
        outing.planId !==
        planId
    );

  window.localStorage.setItem(
    SAVED_OUTINGS_KEY,
    JSON.stringify(
      updatedOutings
    )
  );

  notifySavedOutingsChanged();
}
