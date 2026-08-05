import "server-only";

import type {
  SupabaseClient,
  User
} from "@supabase/supabase-js";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PROFILE,
  DEFAULT_USER_PREFERENCES,
  type VentureNotificationPreferences,
  type VentureProfile,
  type VentureProfilePayload,
  type VentureUserPreferences
} from "@/lib/profile-system";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  getSupabaseServerClient
} from "@/lib/supabase/server";

type ProfileRow = {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_path: string | null;
  home_city: string | null;
  home_neighbourhood: string | null;
  onboarding_completed: boolean | null;
  profile_visibility: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PreferencesRow = {
  interests: string[] | null;
  cuisines: string[] | null;
  dietary_needs: string[] | null;
  accessibility_needs: string[] | null;
  preferred_neighbourhoods: string[] | null;
  outing_styles: string[] | null;
  default_budget: string | null;
  default_transport: string | null;
  default_group_size: number | null;
  alcohol_free: boolean | null;
  likes_free_events: boolean | null;
  likes_nightlife: boolean | null;
  likes_outdoors: boolean | null;
  likes_date_ideas: boolean | null;
};

type NotificationRow = {
  weekend_digest: boolean | null;
  saved_event_reminders: boolean | null;
  outing_reminders: boolean | null;
  product_updates: boolean | null;
};

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string =>
        typeof item === "string"
      )
    : [];
}

function mapProfileRow(
  row: ProfileRow | null,
  avatarUrl: string | null
): VentureProfile {
  return {
    ...DEFAULT_PROFILE,
    displayName:
      row?.display_name?.trim() || "Guest",
    username: row?.username ?? "",
    bio: row?.bio ?? "",
    avatarPath: row?.avatar_path ?? null,
    avatarUrl,
    homeCity:
      row?.home_city?.trim() || "Winnipeg",
    homeNeighbourhood:
      row?.home_neighbourhood ?? "",
    onboardingCompleted:
      row?.onboarding_completed === true,
    profileVisibility:
      row?.profile_visibility === "public"
        ? "public"
        : "private",
    createdAt: row?.created_at ?? null,
    updatedAt: row?.updated_at ?? null
  };
}

function mapPreferencesRow(
  row: PreferencesRow | null
): VentureUserPreferences {
  const budget = row?.default_budget;
  const transport = row?.default_transport;

  return {
    ...DEFAULT_USER_PREFERENCES,
    interests: safeStringArray(row?.interests),
    cuisines: safeStringArray(row?.cuisines),
    dietaryNeeds: safeStringArray(row?.dietary_needs),
    accessibilityNeeds: safeStringArray(
      row?.accessibility_needs
    ),
    preferredNeighbourhoods: safeStringArray(
      row?.preferred_neighbourhoods
    ),
    outingStyles: safeStringArray(row?.outing_styles),
    defaultBudget:
      budget === "free" ||
      budget === "under-40" ||
      budget === "under-80" ||
      budget === "flexible"
        ? budget
        : "under-80",
    defaultTransport:
      transport === "walk" ||
      transport === "transit" ||
      transport === "bike" ||
      transport === "drive" ||
      transport === "rideshare"
        ? transport
        : "any",
    defaultGroupSize:
      typeof row?.default_group_size === "number"
        ? row.default_group_size
        : 2,
    alcoholFree: row?.alcohol_free === true,
    likesFreeEvents:
      row?.likes_free_events !== false,
    likesNightlife: row?.likes_nightlife === true,
    likesOutdoors: row?.likes_outdoors === true,
    likesDateIdeas: row?.likes_date_ideas === true
  };
}

function mapNotificationRow(
  row: NotificationRow | null,
  newsletterStatus: VentureNotificationPreferences["newsletterStatus"]
): VentureNotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    weekendDigest: row?.weekend_digest === true,
    savedEventReminders:
      row?.saved_event_reminders === true,
    outingReminders:
      row?.outing_reminders === true,
    productUpdates:
      row?.product_updates !== false,
    newsletterActive: newsletterStatus === "active",
    newsletterStatus
  };
}

async function getNewsletterStatus(email: string) {
  try {
    const admin = getSupabaseAdminClient();
    const result = await admin
      .from("newsletter_subscribers")
      .select("status")
      .eq("email_normalized", email.toLowerCase())
      .maybeSingle();

    const status = result.data?.status;

    if (
      status === "active" ||
      status === "pending" ||
      status === "unsubscribed" ||
      status === "bounced" ||
      status === "complained"
    ) {
      return status;
    }
  } catch {
    /* Newsletter can be configured after profiles. */
  }

  return "not-subscribed" as const;
}

async function createAvatarUrl(
  supabase: SupabaseClient,
  avatarPath: string | null
) {
  if (!avatarPath) {
    return null;
  }

  const result = await supabase.storage
    .from("avatars")
    .createSignedUrl(avatarPath, 60 * 60);

  return result.data?.signedUrl ?? null;
}

export async function requireProfileUser(): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const supabase = await getSupabaseServerClient();
  const result = await supabase.auth.getUser();

  if (result.error || !result.data.user) {
    throw new Error("UNAUTHENTICATED");
  }

  return {
    supabase,
    user: result.data.user
  };
}

export async function loadProfilePayload(): Promise<VentureProfilePayload> {
  const {
    supabase,
    user
  } = await requireProfileUser();

  const [profileResult, preferencesResult, notificationsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "display_name, username, bio, avatar_path, home_city, home_neighbourhood, onboarding_completed, profile_visibility, created_at, updated_at"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_preferences")
        .select(
          "interests, cuisines, dietary_needs, accessibility_needs, preferred_neighbourhoods, outing_styles, default_budget, default_transport, default_group_size, alcohol_free, likes_free_events, likes_nightlife, likes_outdoors, likes_date_ideas"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("notification_preferences")
        .select(
          "weekend_digest, saved_event_reminders, outing_reminders, product_updates"
        )
        .eq("user_id", user.id)
        .maybeSingle()
    ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (preferencesResult.error) {
    throw preferencesResult.error;
  }

  if (notificationsResult.error) {
    throw notificationsResult.error;
  }

  const profileRow = profileResult.data as ProfileRow | null;
  const avatarUrl = await createAvatarUrl(
    supabase,
    profileRow?.avatar_path ?? null
  );
  const email = user.email?.toLowerCase() ?? "";
  const newsletterStatus = email
    ? await getNewsletterStatus(email)
    : "not-subscribed";

  return {
    authenticated: true,
    user: {
      id: user.id,
      email
    },
    profile: mapProfileRow(profileRow, avatarUrl),
    preferences: mapPreferencesRow(
      preferencesResult.data as PreferencesRow | null
    ),
    notifications: mapNotificationRow(
      notificationsResult.data as NotificationRow | null,
      newsletterStatus
    )
  };
}
