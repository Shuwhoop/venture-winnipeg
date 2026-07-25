import "server-only";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import type {
  CommunityExperience,
  CommunityExperienceStatus,
  CommunityRsvp,
  CommunityStop
} from "@/lib/community-types";

type ExperienceRow = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  neighbourhood: string | null;
  meeting_point: string | null;
  meeting_instructions: string | null;
  capacity: number;
  minimum_age: number | null;
  estimated_cost_min_cad:
    | number
    | string
    | null;
  estimated_cost_max_cad:
    | number
    | string
    | null;
  social_vibe: string[] | null;
  accessibility_notes: string | null;
  dietary_notes: string | null;
  what_to_bring: string | null;
  host_name: string | null;
  host_description: string | null;
  hero_image_url: string | null;
  status: CommunityExperienceStatus;
  published_at: string | null;
};

type StopRow = {
  id: string;
  experience_id: string;
  position: number;
  entity_type:
    | "place"
    | "event"
    | null;
  entity_id: string | null;
  listing_slug: string | null;
  listing_name: string;
  starts_at: string | null;
  ends_at: string | null;
  neighbourhood: string | null;
  notes: string | null;
  joinable_separately: boolean;
};

type RsvpRow = {
  id: string;
  experience_id: string;
  attendee_count: number;
  status:
    | "confirmed"
    | "waitlisted"
    | "cancelled"
    | "attended"
    | "no_show";
  attending_alone: boolean;
  dietary_notes: string;
  accessibility_notes: string;
  created_at: string;
  updated_at: string;
};

function moneyValue(
  value:
    | number
    | string
    | null
): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function mapStop(
  row: StopRow
): CommunityStop {
  return {
    id: row.id,
    position: row.position,
    entityType: row.entity_type,
    entityId: row.entity_id,
    listingSlug: row.listing_slug,
    listingName: row.listing_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    neighbourhood: row.neighbourhood,
    notes: row.notes,
    joinableSeparately:
      row.joinable_separately
  };
}

function mapRsvp(
  row: RsvpRow
): CommunityRsvp {
  return {
    id: row.id,
    experienceId: row.experience_id,
    attendeeCount: row.attendee_count,
    status: row.status,
    attendingAlone:
      row.attending_alone,
    dietaryNotes:
      row.dietary_notes,
    accessibilityNotes:
      row.accessibility_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function attachExperienceDetails(
  rows: ExperienceRow[]
): Promise<CommunityExperience[]> {
  if (rows.length === 0) {
    return [];
  }

  const supabase =
    getSupabaseAdminClient();

  const experienceIds =
    rows.map((row) => row.id);

  const [
    stopsResult,
    rsvpsResult
  ] = await Promise.all([
    supabase
      .from(
        "community_experience_stops"
      )
      .select(
        "id, experience_id, position, entity_type, entity_id, listing_slug, listing_name, starts_at, ends_at, neighbourhood, notes, joinable_separately"
      )
      .in(
        "experience_id",
        experienceIds
      )
      .order(
        "position",
        {
          ascending: true
        }
      ),

    supabase
      .from("community_rsvps")
      .select(
        "experience_id, attendee_count, status"
      )
      .in(
        "experience_id",
        experienceIds
      )
  ]);

  if (
    stopsResult.error ||
    rsvpsResult.error
  ) {
    throw new Error(
      stopsResult.error?.message ??
      rsvpsResult.error?.message ??
      "Could not load community experience details."
    );
  }

  const stopsByExperience =
    new Map<
      string,
      CommunityStop[]
    >();

  for (
    const row of
    (stopsResult.data ?? []) as StopRow[]
  ) {
    const current =
      stopsByExperience.get(
        row.experience_id
      ) ?? [];

    current.push(
      mapStop(row)
    );

    stopsByExperience.set(
      row.experience_id,
      current
    );
  }

  const counts =
    new Map<
      string,
      {
        confirmed: number;
        waitlisted: number;
      }
    >();

  for (
    const row of
    (rsvpsResult.data ?? []) as Array<{
      experience_id: string;
      attendee_count: number;
      status: string;
    }>
  ) {
    const current =
      counts.get(row.experience_id) ?? {
        confirmed: 0,
        waitlisted: 0
      };

    if (row.status === "confirmed") {
      current.confirmed +=
        row.attendee_count;
    }

    if (row.status === "waitlisted") {
      current.waitlisted +=
        row.attendee_count;
    }

    counts.set(
      row.experience_id,
      current
    );
  }

  return rows.map((row) => {
    const experienceCounts =
      counts.get(row.id) ?? {
        confirmed: 0,
        waitlisted: 0
      };

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      eyebrow: row.eyebrow,
      summary: row.summary,
      description: row.description,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      timezone: row.timezone,
      neighbourhood: row.neighbourhood,
      meetingPoint: row.meeting_point,
      meetingInstructions:
        row.meeting_instructions,
      capacity: row.capacity,
      minimumAge: row.minimum_age,
      estimatedCostMinCad:
        moneyValue(
          row.estimated_cost_min_cad
        ),
      estimatedCostMaxCad:
        moneyValue(
          row.estimated_cost_max_cad
        ),
      socialVibe:
        row.social_vibe ?? [],
      accessibilityNotes:
        row.accessibility_notes,
      dietaryNotes:
        row.dietary_notes,
      whatToBring:
        row.what_to_bring,
      hostName:
        row.host_name,
      hostDescription:
        row.host_description,
      heroImageUrl:
        row.hero_image_url,
      status: row.status,
      publishedAt:
        row.published_at,
      confirmedPeople:
        experienceCounts.confirmed,
      waitlistedPeople:
        experienceCounts.waitlisted,
      remainingSpots:
        Math.max(
          row.capacity -
          experienceCounts.confirmed,
          0
        ),
      stops:
        stopsByExperience.get(
          row.id
        ) ?? []
    };
  });
}

const experienceFields = `
  id,
  slug,
  title,
  eyebrow,
  summary,
  description,
  starts_at,
  ends_at,
  timezone,
  neighbourhood,
  meeting_point,
  meeting_instructions,
  capacity,
  minimum_age,
  estimated_cost_min_cad,
  estimated_cost_max_cad,
  social_vibe,
  accessibility_notes,
  dietary_notes,
  what_to_bring,
  host_name,
  host_description,
  hero_image_url,
  status,
  published_at
`;

function isMissingCommunitySchema(
  message: string
): boolean {
  return (
    message.includes(
      "community_experiences"
    ) ||
    message.includes(
      "community_experience_stops"
    ) ||
    message.includes(
      "community_rsvps"
    )
  );
}

export async function getFeaturedCommunityExperience():
  Promise<CommunityExperience | null> {
  try {
    const supabase =
      getSupabaseAdminClient();

    const { data, error } =
      await supabase
        .from("community_experiences")
        .select(experienceFields)
        .eq("status", "published")
        .gte(
          "starts_at",
          new Date(
            Date.now() -
            12 * 60 * 60 * 1000
          ).toISOString()
        )
        .order(
          "starts_at",
          {
            ascending: true
          }
        )
        .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const experiences =
      await attachExperienceDetails(
        (data ?? []) as ExperienceRow[]
      );

    return experiences[0] ?? null;
  } catch (error) {
    if (
      error instanceof Error &&
      isMissingCommunitySchema(
        error.message
      )
    ) {
      return null;
    }

    throw error;
  }
}

export async function getPublicCommunityExperiences():
  Promise<CommunityExperience[]> {
  try {
    const supabase =
      getSupabaseAdminClient();

    const { data, error } =
      await supabase
        .from("community_experiences")
        .select(experienceFields)
        .in(
          "status",
          [
            "published",
            "completed"
          ]
        )
        .order(
          "starts_at",
          {
            ascending: false
          }
        )
        .limit(24);

    if (error) {
      throw new Error(error.message);
    }

    return attachExperienceDetails(
      (data ?? []) as ExperienceRow[]
    );
  } catch (error) {
    if (
      error instanceof Error &&
      isMissingCommunitySchema(
        error.message
      )
    ) {
      return [];
    }

    throw error;
  }
}

export async function getCommunityExperienceBySlug(
  slug: string
): Promise<CommunityExperience | null> {
  try {
    const supabase =
      getSupabaseAdminClient();

    const { data, error } =
      await supabase
        .from("community_experiences")
        .select(experienceFields)
        .eq("slug", slug)
        .in(
          "status",
          [
            "published",
            "completed"
          ]
        )
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const experiences =
      await attachExperienceDetails(
        [data as ExperienceRow]
      );

    return experiences[0] ?? null;
  } catch (error) {
    if (
      error instanceof Error &&
      isMissingCommunitySchema(
        error.message
      )
    ) {
      return null;
    }

    throw error;
  }
}

export async function getAdminCommunityExperiences():
  Promise<CommunityExperience[]> {
  const supabase =
    getSupabaseAdminClient();

  const { data, error } =
    await supabase
      .from("community_experiences")
      .select(experienceFields)
      .order(
        "starts_at",
        {
          ascending: false
        }
      )
      .limit(36);

  if (error) {
    if (
      isMissingCommunitySchema(
        error.message
      )
    ) {
      return [];
    }

    throw new Error(error.message);
  }

  return attachExperienceDetails(
    (data ?? []) as ExperienceRow[]
  );
}

export async function getCommunityRsvpsForUser(
  userId: string
): Promise<
  Array<
    CommunityRsvp & {
      experience:
        CommunityExperience | null;
    }
  >
> {
  const supabase =
    getSupabaseAdminClient();

  const { data, error } =
    await supabase
      .from("community_rsvps")
      .select(
        "id, experience_id, attendee_count, status, attending_alone, dietary_notes, accessibility_notes, created_at, updated_at"
      )
      .eq("user_id", userId)
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {
    if (
      isMissingCommunitySchema(
        error.message
      )
    ) {
      return [];
    }

    throw new Error(error.message);
  }

  const rows =
    (data ?? []) as RsvpRow[];

  const experienceIds =
    Array.from(
      new Set(
        rows.map(
          (row) =>
            row.experience_id
        )
      )
    );

  if (experienceIds.length === 0) {
    return [];
  }

  const {
    data: experienceRows,
    error: experienceError
  } =
    await supabase
      .from("community_experiences")
      .select(experienceFields)
      .in("id", experienceIds);

  if (experienceError) {
    throw new Error(
      experienceError.message
    );
  }

  const experiences =
    await attachExperienceDetails(
      (experienceRows ?? []) as ExperienceRow[]
    );

  const experienceMap =
    new Map(
      experiences.map(
        (experience) => [
          experience.id,
          experience
        ]
      )
    );

  return rows.map((row) => ({
    ...mapRsvp(row),
    experience:
      experienceMap.get(
        row.experience_id
      ) ?? null
  }));
}
