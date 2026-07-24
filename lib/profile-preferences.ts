"use client";

export const PROFILE_PREFERENCES_KEY =
  "venture:profile-preferences:v1";

export const PROFILE_PREFERENCES_EVENT =
  "venture:profile-preferences-changed";

export type BudgetPreference =
  | "free"
  | "under-40"
  | "under-80"
  | "flexible";

export type VenturePreferences = {
  displayName: string;
  interests: string[];
  neighbourhoods: string[];
  outingStyles: string[];
  budget: BudgetPreference;
  alcoholFree: boolean;
  newsletterInterested: boolean;
  updatedAt: string | null;
};

export const defaultPreferences:
  VenturePreferences = {
    displayName: "Guest",
    interests: [],
    neighbourhoods: [],
    outingStyles: [],
    budget: "under-80",
    alcoholFree: false,
    newsletterInterested: false,
    updatedAt: null
  };

function isStringArray(
  value: unknown
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "string"
    )
  );
}

export function isVenturePreferences(
  value: unknown
): value is VenturePreferences {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const record = value as Record<
    string,
    unknown
  >;

  return (
    typeof record.displayName === "string" &&
    isStringArray(record.interests) &&
    isStringArray(record.neighbourhoods) &&
    isStringArray(record.outingStyles) &&
    (
      record.budget === "free" ||
      record.budget === "under-40" ||
      record.budget === "under-80" ||
      record.budget === "flexible"
    ) &&
    typeof record.alcoholFree === "boolean" &&
    typeof record.newsletterInterested === "boolean" &&
    (
      record.updatedAt === null ||
      typeof record.updatedAt === "string"
    )
  );
}

export function normalizePreferences(
  value: unknown
): VenturePreferences {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return defaultPreferences;
  }

  const parsed = value as Partial<
    VenturePreferences
  >;

  return {
    displayName:
      typeof parsed.displayName === "string"
        ? parsed.displayName
        : defaultPreferences.displayName,
    interests: isStringArray(parsed.interests)
      ? parsed.interests
      : defaultPreferences.interests,
    neighbourhoods: isStringArray(
      parsed.neighbourhoods
    )
      ? parsed.neighbourhoods
      : [],
    outingStyles: isStringArray(
      parsed.outingStyles
    )
      ? parsed.outingStyles
      : [],
    budget:
      parsed.budget === "free" ||
      parsed.budget === "under-40" ||
      parsed.budget === "under-80" ||
      parsed.budget === "flexible"
        ? parsed.budget
        : defaultPreferences.budget,
    alcoholFree:
      parsed.alcoholFree === true,
    newsletterInterested:
      parsed.newsletterInterested === true,
    updatedAt:
      typeof parsed.updatedAt === "string"
        ? parsed.updatedAt
        : null
  };
}

export function loadPreferences():
  VenturePreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const stored =
      window.localStorage.getItem(
        PROFILE_PREFERENCES_KEY
      );

    if (!stored) {
      return defaultPreferences;
    }

    return normalizePreferences(
      JSON.parse(stored)
    );
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(
  preferences: VenturePreferences
) {
  if (typeof window === "undefined") {
    return;
  }

  const nextValue =
    JSON.stringify(preferences);

  if (
    window.localStorage.getItem(
      PROFILE_PREFERENCES_KEY
    ) === nextValue
  ) {
    return;
  }

  window.localStorage.setItem(
    PROFILE_PREFERENCES_KEY,
    nextValue
  );

  window.dispatchEvent(
    new Event(
      PROFILE_PREFERENCES_EVENT
    )
  );
}

export function clearPreferences() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    PROFILE_PREFERENCES_KEY
  );

  window.dispatchEvent(
    new Event(
      PROFILE_PREFERENCES_EVENT
    )
  );
}
