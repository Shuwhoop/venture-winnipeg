import {
  NextResponse
} from "next/server";

import {
  cleanUsername,
  DEFAULT_USER_PREFERENCES,
  type VentureNotificationPreferences,
  type VentureUserPreferences
} from "@/lib/profile-system";

import {
  loadProfilePayload,
  requireProfileUser
} from "@/lib/profile-server";

import {
  consumeRateLimit,
  getRequestAddress,
  isSameOriginRequest,
  rateLimitHeaders
} from "@/lib/server-rate-limit";

export const runtime = "nodejs";

function strings(
  value: unknown,
  maxItems = 30,
  maxLength = 80
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter((item): item is string =>
          typeof item === "string"
        )
        .map((item) => item.trim().slice(0, maxLength))
        .filter(Boolean)
    )
  ].slice(0, maxItems);
}

function normalizePreferences(
  value: unknown
): VentureUserPreferences {
  const record =
    value && typeof value === "object"
      ? value as Record<string, unknown>
      : {};

  const budget = record.defaultBudget;
  const transport = record.defaultTransport;
  const groupSize = Number(record.defaultGroupSize);

  return {
    ...DEFAULT_USER_PREFERENCES,
    interests: strings(record.interests),
    cuisines: strings(record.cuisines),
    dietaryNeeds: strings(record.dietaryNeeds),
    accessibilityNeeds: strings(record.accessibilityNeeds),
    preferredNeighbourhoods: strings(
      record.preferredNeighbourhoods
    ),
    outingStyles: strings(record.outingStyles),
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
      Number.isInteger(groupSize) &&
      groupSize >= 1 &&
      groupSize <= 20
        ? groupSize
        : 2,
    alcoholFree: record.alcoholFree === true,
    likesFreeEvents: record.likesFreeEvents !== false,
    likesNightlife: record.likesNightlife === true,
    likesOutdoors: record.likesOutdoors === true,
    likesDateIdeas: record.likesDateIdeas === true
  };
}

function normalizeNotifications(
  value: unknown
): Omit<
  VentureNotificationPreferences,
  "newsletterActive" | "newsletterStatus"
> {
  const record =
    value && typeof value === "object"
      ? value as Record<string, unknown>
      : {};

  return {
    weekendDigest: record.weekendDigest === true,
    savedEventReminders:
      record.savedEventReminders === true,
    outingReminders: record.outingReminders === true,
    productUpdates: record.productUpdates !== false
  };
}

export async function GET() {
  try {
    return NextResponse.json(
      await loadProfilePayload(),
      {
        headers: {
          "Cache-Control": "private, no-store"
        }
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          authenticated: false
        },
        { status: 401 }
      );
    }

    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";

    if (["42P01", "42703", "PGRST205"].includes(code)) {
      return NextResponse.json(
        {
          error:
            "Venture Profiles needs its Supabase migration before profiles can load."
        },
        { status: 503 }
      );
    }

    console.error("Unable to load Venture profile:", error);

    return NextResponse.json(
      {
        error: "Venture could not load this profile right now."
      },
      { status: 500 }
    );
  }
}

type ProfilePatchBody = {
  profile?: unknown;
  preferences?: unknown;
  notifications?: unknown;
};

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "This profile request came from an untrusted origin." },
      { status: 403 }
    );
  }

  let body: ProfilePatchBody;

  try {
    body = await request.json() as ProfilePatchBody;
  } catch {
    return NextResponse.json(
      { error: "The profile update could not be read." },
      { status: 400 }
    );
  }

  try {
    const {
      supabase,
      user
    } = await requireProfileUser();

    const rateLimit = consumeRateLimit({
      key: `profile:update:${user.id}:${getRequestAddress(request)}`,
      limit: 60,
      windowMs: 15 * 60 * 1000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many profile changes were submitted. Try again shortly." },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit)
        }
      );
    }

    const updates: PromiseLike<unknown>[] = [];

    if (
      body.profile &&
      typeof body.profile === "object"
    ) {
      const record = body.profile as Record<string, unknown>;
      const displayName =
        typeof record.displayName === "string"
          ? record.displayName.trim().replace(/\s+/g, " ").slice(0, 60)
          : "";
      const rawUsername =
        typeof record.username === "string"
          ? cleanUsername(record.username)
          : "";
      const bio =
        typeof record.bio === "string"
          ? record.bio.trim().replace(/\s+/g, " ").slice(0, 180)
          : "";
      const homeNeighbourhood =
        typeof record.homeNeighbourhood === "string"
          ? record.homeNeighbourhood.trim().slice(0, 80)
          : "";
      const avatarPath =
        record.avatarPath === null
          ? null
          : typeof record.avatarPath === "string" &&
              record.avatarPath.startsWith(`${user.id}/`)
            ? record.avatarPath.slice(0, 260)
            : undefined;
      const onboardingCompleted =
        record.onboardingCompleted === true;

      if (rawUsername && rawUsername.length < 3) {
        return NextResponse.json(
          {
            error: "Usernames need at least three letters, numbers, or underscores."
          },
          { status: 400 }
        );
      }

      const profileUpdate: Record<string, unknown> = {
        display_name: displayName || "Guest",
        username: rawUsername || null,
        bio: bio || null,
        home_neighbourhood: homeNeighbourhood || null,
        onboarding_completed: onboardingCompleted,
        profile_visibility: "private",
        profile_completed_at:
          onboardingCompleted
            ? new Date().toISOString()
            : null,
        updated_at: new Date().toISOString()
      };

      if (avatarPath !== undefined) {
        profileUpdate.avatar_path = avatarPath;
      }

      updates.push(
        supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              ...profileUpdate
            },
            { onConflict: "id" }
          )
          .then((result) => {
            if (result.error) {
              throw result.error;
            }
          })
      );
    }

    if (body.preferences !== undefined) {
      const preferences = normalizePreferences(body.preferences);
      const now = new Date().toISOString();
      const identityResult = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (identityResult.error) {
        throw identityResult.error;
      }

      const legacyDisplayName =
        typeof (
          body.profile as Record<string, unknown> | undefined
        )?.displayName === "string"
          ? String(
              (
                body.profile as Record<string, unknown>
              ).displayName
            ).trim() || "Guest"
          : identityResult.data?.display_name || "Guest";

      updates.push(
        supabase
          .from("user_preferences")
          .upsert(
            {
              user_id: user.id,
              interests: preferences.interests,
              cuisines: preferences.cuisines,
              dietary_needs: preferences.dietaryNeeds,
              accessibility_needs: preferences.accessibilityNeeds,
              preferred_neighbourhoods:
                preferences.preferredNeighbourhoods,
              outing_styles: preferences.outingStyles,
              default_budget: preferences.defaultBudget,
              default_transport: preferences.defaultTransport,
              default_group_size: preferences.defaultGroupSize,
              alcohol_free: preferences.alcoholFree,
              likes_free_events: preferences.likesFreeEvents,
              likes_nightlife: preferences.likesNightlife,
              likes_outdoors: preferences.likesOutdoors,
              likes_date_ideas: preferences.likesDateIdeas,
              updated_at: now
            },
            { onConflict: "user_id" }
          )
          .then((result) => {
            if (result.error) {
              throw result.error;
            }
          })
      );

      // Keep the existing cross-device sync payload compatible.
      updates.push(
        supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              interests: preferences.interests,
              dietary_preferences: preferences.dietaryNeeds,
              accessibility_preferences:
                preferences.accessibilityNeeds,
              preferences: {
                displayName: legacyDisplayName,
                interests: preferences.interests,
                neighbourhoods:
                  preferences.preferredNeighbourhoods,
                outingStyles: preferences.outingStyles,
                budget: preferences.defaultBudget,
                alcoholFree: preferences.alcoholFree,
                newsletterInterested: false,
                updatedAt: now
              },
              updated_at: now
            },
            { onConflict: "id" }
          )
          .then((result) => {
            if (result.error) {
              throw result.error;
            }
          })
      );
    }

    if (body.notifications !== undefined) {
      const notifications = normalizeNotifications(body.notifications);

      updates.push(
        supabase
          .from("notification_preferences")
          .upsert(
            {
              user_id: user.id,
              weekend_digest: notifications.weekendDigest,
              saved_event_reminders:
                notifications.savedEventReminders,
              outing_reminders: notifications.outingReminders,
              product_updates: notifications.productUpdates
            },
            { onConflict: "user_id" }
          )
          .then((result) => {
            if (result.error) {
              throw result.error;
            }
          })
      );
    }

    await Promise.all(updates);

    return NextResponse.json(
      await loadProfilePayload(),
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        { error: "Sign in to update this profile." },
        { status: 401 }
      );
    }

    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? String(error.code)
        : "";

    if (code === "23505") {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }

    if (["42P01", "42703", "PGRST205"].includes(code)) {
      return NextResponse.json(
        {
          error:
            "Venture Profiles needs its Supabase migration before changes can be saved."
        },
        { status: 503 }
      );
    }

    console.error("Unable to update Venture profile:", error);

    return NextResponse.json(
      { error: "Venture could not save these profile changes." },
      { status: 500 }
    );
  }
}
