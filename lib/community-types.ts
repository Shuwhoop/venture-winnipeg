export type CommunityExperienceStatus =
  | "draft"
  | "published"
  | "completed"
  | "cancelled"
  | "archived";

export type CommunityRsvpStatus =
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "attended"
  | "no_show";

export type CommunityStop = {
  id: string;
  position: number;
  entityType: "place" | "event" | null;
  entityId: string | null;
  listingSlug: string | null;
  listingName: string;
  startsAt: string | null;
  endsAt: string | null;
  neighbourhood: string | null;
  notes: string | null;
  joinableSeparately: boolean;
};

export type CommunityExperience = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  neighbourhood: string | null;
  meetingPoint: string | null;
  meetingInstructions: string | null;
  capacity: number;
  minimumAge: number | null;
  estimatedCostMinCad: number | null;
  estimatedCostMaxCad: number | null;
  socialVibe: string[];
  accessibilityNotes: string | null;
  dietaryNotes: string | null;
  whatToBring: string | null;
  hostName: string | null;
  hostDescription: string | null;
  heroImageUrl: string | null;
  status: CommunityExperienceStatus;
  publishedAt: string | null;
  confirmedPeople: number;
  waitlistedPeople: number;
  remainingSpots: number;
  stops: CommunityStop[];
};

export type CommunityRsvp = {
  id: string;
  experienceId: string;
  attendeeCount: number;
  status: CommunityRsvpStatus;
  attendingAlone: boolean;
  dietaryNotes: string;
  accessibilityNotes: string;
  createdAt: string;
  updatedAt: string;
};
