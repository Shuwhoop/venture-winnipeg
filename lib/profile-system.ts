export const PROFILE_SYSTEM_EVENT =
  "venture:profile-system-changed";

export type VentureProfile = {
  displayName: string;
  username: string;
  bio: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  homeCity: string;
  homeNeighbourhood: string;
  onboardingCompleted: boolean;
  profileVisibility: "private" | "public";
  createdAt: string | null;
  updatedAt: string | null;
};

export type VentureUserPreferences = {
  interests: string[];
  cuisines: string[];
  dietaryNeeds: string[];
  accessibilityNeeds: string[];
  preferredNeighbourhoods: string[];
  outingStyles: string[];
  defaultBudget:
    | "free"
    | "under-40"
    | "under-80"
    | "flexible";
  defaultTransport:
    | "any"
    | "walk"
    | "transit"
    | "bike"
    | "drive"
    | "rideshare";
  defaultGroupSize: number;
  alcoholFree: boolean;
  likesFreeEvents: boolean;
  likesNightlife: boolean;
  likesOutdoors: boolean;
  likesDateIdeas: boolean;
};

export type VentureNotificationPreferences = {
  weekendDigest: boolean;
  savedEventReminders: boolean;
  outingReminders: boolean;
  productUpdates: boolean;
  newsletterActive: boolean;
  newsletterStatus:
    | "active"
    | "pending"
    | "unsubscribed"
    | "bounced"
    | "complained"
    | "not-subscribed";
};

export type VentureProfilePayload = {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
  } | null;
  profile: VentureProfile;
  preferences: VentureUserPreferences;
  notifications: VentureNotificationPreferences;
};

export const DEFAULT_PROFILE: VentureProfile = {
  displayName: "Guest",
  username: "",
  bio: "",
  avatarPath: null,
  avatarUrl: null,
  homeCity: "Winnipeg",
  homeNeighbourhood: "",
  onboardingCompleted: false,
  profileVisibility: "private",
  createdAt: null,
  updatedAt: null
};

export const DEFAULT_USER_PREFERENCES:
  VentureUserPreferences = {
    interests: [],
    cuisines: [],
    dietaryNeeds: [],
    accessibilityNeeds: [],
    preferredNeighbourhoods: [],
    outingStyles: [],
    defaultBudget: "under-80",
    defaultTransport: "any",
    defaultGroupSize: 2,
    alcoholFree: false,
    likesFreeEvents: true,
    likesNightlife: false,
    likesOutdoors: false,
    likesDateIdeas: false
  };

export const DEFAULT_NOTIFICATION_PREFERENCES:
  VentureNotificationPreferences = {
    weekendDigest: false,
    savedEventReminders: false,
    outingReminders: false,
    productUpdates: true,
    newsletterActive: false,
    newsletterStatus: "not-subscribed"
  };

export const INTEREST_OPTIONS = [
  "Food",
  "Live music",
  "Comedy",
  "Sports",
  "Markets",
  "Arts and culture",
  "Gaming",
  "Nightlife",
  "Outdoor activities",
  "Free activities",
  "Date ideas",
  "Family-friendly"
];

export const CUISINE_OPTIONS = [
  "African",
  "Caribbean",
  "Chinese",
  "Filipino",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Mexican",
  "Middle Eastern",
  "Vietnamese",
  "Canadian"
];

export const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Halal",
  "Kosher",
  "Dairy-free",
  "Nut-aware"
];

export const ACCESSIBILITY_OPTIONS = [
  "Step-free entrance",
  "Accessible washroom",
  "Wheelchair-friendly seating",
  "Low-sensory options",
  "ASL or captioning",
  "Nearby accessible parking"
];

export const OUTING_STYLE_OPTIONS = [
  "Date nights",
  "Student-friendly",
  "Solo outings",
  "Friends",
  "Family plans",
  "Last-minute plans"
];

export function cleanUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export function profileInitials(
  displayName: string,
  email = ""
) {
  const source = displayName.trim() || email.split("@")[0] || "V";

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "V";
}

export function dispatchProfileChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new Event(PROFILE_SYSTEM_EVENT)
  );
}
