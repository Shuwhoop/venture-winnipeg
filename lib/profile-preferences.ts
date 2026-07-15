export const PROFILE_PREFERENCES_KEY =
  "venture:profile-preferences:v1";

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
    displayName: "Prince",
    interests: [
      "Food",
      "Live music",
      "Date nights"
    ],
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

    const parsed = JSON.parse(stored) as
      Partial<VenturePreferences>;

    return {
      displayName:
        typeof parsed.displayName ===
        "string"
          ? parsed.displayName
          : defaultPreferences.displayName,

      interests: isStringArray(
        parsed.interests
      )
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
        parsed.newsletterInterested ===
        true,

      updatedAt:
        typeof parsed.updatedAt ===
        "string"
          ? parsed.updatedAt
          : null
    };
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

  window.localStorage.setItem(
    PROFILE_PREFERENCES_KEY,
    JSON.stringify(preferences)
  );
}

export function clearPreferences() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    PROFILE_PREFERENCES_KEY
  );
}