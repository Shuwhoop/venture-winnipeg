import {
  NextResponse
} from "next/server";

import {
  requireProfileUser
} from "@/lib/profile-server";
import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";
import {
  getSupabaseServerClient
} from "@/lib/supabase/server";
import {
  consumeRateLimit,
  getRequestAddress,
  isSameOriginRequest,
  rateLimitHeaders
} from "@/lib/server-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARE_CODE_PATTERN = /^[a-f0-9]{12}$/;
const RSVP_VALUES = new Set(["going", "maybe", "not-going"]);
const VOTE_VALUES = new Set(["love", "okay", "swap"]);
const BUDGET_VALUES = new Set(["free", "under-40", "under-80", "flexible"]);
const TRANSPORT_VALUES = new Set(["any", "walk", "transit", "bike", "drive", "rideshare"]);

type Rsvp = "going" | "maybe" | "not-going";
type VoteChoice = "love" | "okay" | "swap";
type Budget = "free" | "under-40" | "under-80" | "flexible";
type Transport = "any" | "walk" | "transit" | "bike" | "drive" | "rideshare";

type GroupMember = {
  userId: string;
  displayName: string;
  avatarPath: string | null;
  role: "host" | "member";
  rsvp: Rsvp;
  joinedAt: string;
};

type GroupVote = {
  userId: string;
  stopKey: string;
  choice: VoteChoice;
  updatedAt: string;
};

type GroupVibeContribution = {
  userId: string;
  interests: string[];
  cuisines: string[];
  dietaryNeeds: string[];
  accessibilityNeeds: string[];
  preferredNeighbourhoods: string[];
  outingStyles: string[];
  defaultBudget: Budget;
  defaultTransport: Transport;
  alcoholFree: boolean;
  likesFreeEvents: boolean;
  likesNightlife: boolean;
  likesOutdoors: boolean;
  likesDateIdeas: boolean;
  updatedAt: string;
};

type GroupCollaboration = {
  version: 2;
  members: GroupMember[];
  votes: GroupVote[];
  vibes: GroupVibeContribution[];
  lastBlendRemixAt: string | null;
};

type GroupOutingRow = {
  id: string;
  owner_id: string | null;
  share_code: string;
  planning_mode: string;
  visibility: string;
  status: string;
  title: string;
  budget_cad: number | null;
  builder_answers: Record<string, unknown>;
  generated_plan: Record<string, unknown>;
  updated_at: string;
};

type RouteContext = {
  params: Promise<{
    shareCode: string;
  }>;
};

type PopularValue = {
  label: string;
  count: number;
};

type BlendSummary = {
  contributorCount: number;
  memberCount: number;
  ready: boolean;
  interests: PopularValue[];
  cuisines: PopularValue[];
  neighbourhoods: PopularValue[];
  outingStyles: PopularValue[];
  budget: Budget | null;
  transportation: string | null;
  alcoholFree: boolean;
  likesFreeEvents: boolean;
  likesNightlife: boolean;
  likesOutdoors: boolean;
  likesDateIdeas: boolean;
  protectedNeedsCount: number;
  lastRemixedAt: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeStringArray(value: unknown, limit = 30): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
  )).slice(0, limit);
}

function parseCollaboration(value: unknown): GroupCollaboration {
  if (!isRecord(value)) {
    return {
      version: 2,
      members: [],
      votes: [],
      vibes: [],
      lastBlendRemixAt: null
    };
  }

  const rawMembers = Array.isArray(value.members) ? value.members : [];
  const rawVotes = Array.isArray(value.votes) ? value.votes : [];
  const rawVibes = Array.isArray(value.vibes) ? value.vibes : [];

  const members = rawMembers.flatMap((item): GroupMember[] => {
    if (!isRecord(item)) return [];
    const role = item.role === "host" ? "host" : "member";
    const rsvp = RSVP_VALUES.has(String(item.rsvp)) ? item.rsvp as Rsvp : "going";
    if (typeof item.userId !== "string" || typeof item.displayName !== "string") return [];
    return [{
      userId: item.userId,
      displayName: item.displayName.slice(0, 60),
      avatarPath: typeof item.avatarPath === "string" ? item.avatarPath : null,
      role,
      rsvp,
      joinedAt: typeof item.joinedAt === "string" ? item.joinedAt : new Date(0).toISOString()
    }];
  }).slice(0, 30);

  const memberIds = new Set(members.map((member) => member.userId));

  const votes = rawVotes.flatMap((item): GroupVote[] => {
    if (!isRecord(item)) return [];
    if (
      typeof item.userId !== "string" ||
      typeof item.stopKey !== "string" ||
      !VOTE_VALUES.has(String(item.choice)) ||
      !memberIds.has(item.userId)
    ) return [];
    return [{
      userId: item.userId,
      stopKey: item.stopKey.slice(0, 180),
      choice: item.choice as VoteChoice,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date(0).toISOString()
    }];
  }).slice(0, 500);

  const vibes = rawVibes.flatMap((item): GroupVibeContribution[] => {
    if (!isRecord(item) || typeof item.userId !== "string" || !memberIds.has(item.userId)) {
      return [];
    }

    const budget = BUDGET_VALUES.has(String(item.defaultBudget))
      ? item.defaultBudget as Budget
      : "under-80";
    const transport = TRANSPORT_VALUES.has(String(item.defaultTransport))
      ? item.defaultTransport as Transport
      : "any";

    return [{
      userId: item.userId,
      interests: safeStringArray(item.interests),
      cuisines: safeStringArray(item.cuisines),
      dietaryNeeds: safeStringArray(item.dietaryNeeds),
      accessibilityNeeds: safeStringArray(item.accessibilityNeeds),
      preferredNeighbourhoods: safeStringArray(item.preferredNeighbourhoods, 20),
      outingStyles: safeStringArray(item.outingStyles),
      defaultBudget: budget,
      defaultTransport: transport,
      alcoholFree: item.alcoholFree === true,
      likesFreeEvents: item.likesFreeEvents === true,
      likesNightlife: item.likesNightlife === true,
      likesOutdoors: item.likesOutdoors === true,
      likesDateIdeas: item.likesDateIdeas === true,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date(0).toISOString()
    }];
  }).slice(0, 30);

  return {
    version: 2,
    members,
    votes,
    vibes,
    lastBlendRemixAt: typeof value.lastBlendRemixAt === "string"
      ? value.lastBlendRemixAt
      : null
  };
}

function validStopKeys(plan: Record<string, unknown>) {
  const stops = Array.isArray(plan.stops) ? plan.stops : [];
  return new Set(
    stops.flatMap((stop) => {
      if (!isRecord(stop) || !isRecord(stop.listing)) return [];
      const type = stop.listing.type;
      const id = stop.listing.id;
      const order = stop.order;
      if (typeof type !== "string" || typeof id !== "string" || typeof order !== "number") return [];
      return [`${type}:${id}:${order}`];
    })
  );
}

function popularValues(values: string[][], limit: number): PopularValue[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const list of values) {
    for (const rawValue of new Set(list)) {
      const label = rawValue.trim();
      if (!label) continue;
      const key = label.toLocaleLowerCase("en-CA");
      const current = counts.get(key);
      counts.set(key, {
        label: current?.label ?? label,
        count: (current?.count ?? 0) + 1
      });
    }
  }

  return Array.from(counts.values())
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label))
    .slice(0, limit);
}

function blendedBudget(vibes: GroupVibeContribution[]): Budget | null {
  if (vibes.length === 0) return null;
  const rank: Record<Budget, number> = {
    free: 0,
    "under-40": 1,
    "under-80": 2,
    flexible: 3
  };
  return vibes
    .map((vibe) => vibe.defaultBudget)
    .sort((first, second) => rank[first] - rank[second])[0] ?? null;
}

function transportLabel(transport: Transport): string {
  if (transport === "walk") return "Walking";
  if (transport === "transit") return "Transit";
  if (transport === "bike") return "Bike";
  if (transport === "drive") return "Driving";
  if (transport === "rideshare") return "Rideshare";
  return "Any";
}

function blendedTransport(vibes: GroupVibeContribution[]): Transport | null {
  if (vibes.length === 0) return null;

  const counts = new Map<Transport, number>();
  for (const vibe of vibes) {
    if (vibe.defaultTransport === "any") continue;
    counts.set(vibe.defaultTransport, (counts.get(vibe.defaultTransport) ?? 0) + 1);
  }

  if (counts.size === 0) return "any";

  const ordered = Array.from(counts.entries()).sort((first, second) => second[1] - first[1]);
  const [winner, winnerCount] = ordered[0];
  const secondCount = ordered[1]?.[1] ?? 0;

  if (winnerCount === secondCount) return "any";
  return winner;
}

function trueForMajority(vibes: GroupVibeContribution[], key: keyof Pick<
  GroupVibeContribution,
  "likesFreeEvents" | "likesNightlife" | "likesOutdoors" | "likesDateIdeas"
>): boolean {
  if (vibes.length === 0) return false;
  return vibes.filter((vibe) => vibe[key]).length >= Math.ceil(vibes.length / 2);
}

function buildBlendSummary(collaboration: GroupCollaboration): BlendSummary {
  const vibes = collaboration.vibes;
  const ready = vibes.length >= 2;

  if (!ready) {
    return {
      contributorCount: vibes.length,
      memberCount: collaboration.members.length,
      ready: false,
      interests: [],
      cuisines: [],
      neighbourhoods: [],
      outingStyles: [],
      budget: null,
      transportation: null,
      alcoholFree: false,
      likesFreeEvents: false,
      likesNightlife: false,
      likesOutdoors: false,
      likesDateIdeas: false,
      protectedNeedsCount: 0,
      lastRemixedAt: collaboration.lastBlendRemixAt
    };
  }

  const transport = blendedTransport(vibes);
  const protectedNeeds = new Set(
    vibes.flatMap((vibe) => [
      ...vibe.dietaryNeeds.map((item) => `diet:${item.toLocaleLowerCase("en-CA")}`),
      ...vibe.accessibilityNeeds.map((item) => `access:${item.toLocaleLowerCase("en-CA")}`)
    ])
  );

  return {
    contributorCount: vibes.length,
    memberCount: collaboration.members.length,
    ready: true,
    interests: popularValues(vibes.map((vibe) => vibe.interests), 5),
    cuisines: popularValues(vibes.map((vibe) => vibe.cuisines), 4),
    neighbourhoods: popularValues(vibes.map((vibe) => vibe.preferredNeighbourhoods), 4),
    outingStyles: popularValues(vibes.map((vibe) => vibe.outingStyles), 4),
    budget: blendedBudget(vibes),
    transportation: transport ? transportLabel(transport) : null,
    alcoholFree: vibes.some((vibe) => vibe.alcoholFree),
    likesFreeEvents: trueForMajority(vibes, "likesFreeEvents"),
    likesNightlife: trueForMajority(vibes, "likesNightlife"),
    likesOutdoors: trueForMajority(vibes, "likesOutdoors"),
    likesDateIdeas: trueForMajority(vibes, "likesDateIdeas"),
    protectedNeedsCount: protectedNeeds.size,
    lastRemixedAt: collaboration.lastBlendRemixAt
  };
}

async function loadOuting(shareCode: string): Promise<GroupOutingRow | null> {
  const admin = getSupabaseAdminClient();
  const result = await admin
    .from("outings")
    .select("id, owner_id, share_code, planning_mode, visibility, status, title, budget_cad, builder_answers, generated_plan, updated_at")
    .eq("share_code", shareCode)
    .maybeSingle();

  if (result.error) throw result.error;
  const row = result.data as GroupOutingRow | null;

  if (
    !row ||
    row.planning_mode !== "group" ||
    row.visibility !== "shared" ||
    row.status !== "ready" ||
    !isRecord(row.generated_plan)
  ) {
    return null;
  }

  return row;
}

async function optionalViewerId() {
  try {
    const supabase = await getSupabaseServerClient();
    const result = await supabase.auth.getUser();
    return result.data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function publicState(row: GroupOutingRow, viewerId: string | null) {
  const admin = getSupabaseAdminClient();
  const collaboration = parseCollaboration(row.generated_plan.collaboration);

  const members = await Promise.all(
    collaboration.members.map(async (member) => {
      let avatarUrl: string | null = null;
      if (member.avatarPath) {
        const signed = await admin.storage.from("avatars").createSignedUrl(member.avatarPath, 60 * 20);
        avatarUrl = signed.data?.signedUrl ?? null;
      }
      return {
        displayName: member.displayName,
        avatarUrl,
        role: member.role,
        rsvp: member.rsvp,
        isViewer: viewerId === member.userId
      };
    })
  );

  const voteSummary: Record<string, { love: number; okay: number; swap: number }> = {};
  const myVotes: Record<string, VoteChoice> = {};

  for (const vote of collaboration.votes) {
    voteSummary[vote.stopKey] ??= { love: 0, okay: 0, swap: 0 };
    voteSummary[vote.stopKey][vote.choice] += 1;
    if (viewerId && vote.userId === viewerId) {
      myVotes[vote.stopKey] = vote.choice;
    }
  }

  const viewerMember = viewerId
    ? collaboration.members.find((member) => member.userId === viewerId) ?? null
    : null;

  return {
    members,
    voteSummary,
    blend: buildBlendSummary(collaboration),
    viewer: {
      authenticated: Boolean(viewerId),
      joined: Boolean(viewerMember),
      role: viewerMember?.role ?? null,
      rsvp: viewerMember?.rsvp ?? null,
      myVotes,
      contributedVibe: Boolean(
        viewerId && collaboration.vibes.some((vibe) => vibe.userId === viewerId)
      )
    }
  };
}

function validGeneratedPlan(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  if (
    typeof value.planId !== "string" ||
    typeof value.generatedAt !== "string" ||
    typeof value.title !== "string" ||
    typeof value.date !== "string" ||
    typeof value.requestedStartTime !== "string" ||
    typeof value.requestedDuration !== "string" ||
    typeof value.transportation !== "string" ||
    typeof value.alcoholFree !== "boolean" ||
    !Array.isArray(value.stops) ||
    !Array.isArray(value.warnings) ||
    typeof value.candidateCount !== "number"
  ) return false;

  return value.stops.length <= 10 && value.stops.every((stop) => {
    if (!isRecord(stop) || !isRecord(stop.listing)) return false;
    return (
      typeof stop.order === "number" &&
      typeof stop.startTime === "string" &&
      typeof stop.endTime === "string" &&
      typeof stop.reason === "string" &&
      typeof stop.listing.id === "string" &&
      typeof stop.listing.name === "string" &&
      (stop.listing.type === "event" || stop.listing.type === "restaurant")
    );
  });
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, Math.round(value)))
    : fallback;
}

function requestedStopMix(plan: Record<string, unknown>) {
  if (isRecord(plan.requestedMix)) {
    return {
      food: readNumber(plan.requestedMix.food, 1, 0, 5),
      events: readNumber(plan.requestedMix.events, 1, 0, 5),
      drinks: readNumber(plan.requestedMix.drinks, 1, 0, 5)
    };
  }
  return { food: 1, events: 1, drinks: 1 };
}

function generatorTransport(transport: Transport | null, fallback: string): string {
  if (transport === "walk") return "Walking";
  if (transport === "transit") return "Transit";
  if (transport === "bike") return "Bike";
  if (transport === "drive") return "Driving";
  if (transport === "rideshare") return "Rideshare";
  return fallback;
}

function deriveGroupVibe(vibes: GroupVibeContribution[], plan: Record<string, unknown>) {
  const majority = Math.ceil(vibes.length / 2);
  if (vibes.filter((vibe) => vibe.likesDateIdeas).length >= majority) return "date-night";
  if (vibes.filter((vibe) => vibe.likesNightlife).length >= majority) return "nightlife";
  if (vibes.filter((vibe) => vibe.outingStyles.includes("Family plans")).length >= majority) return "family-plan";
  const existing = plan.groupVibe;
  return existing === "friends-night" || existing === "date-night" || existing === "celebration" || existing === "family-plan" || existing === "nightlife"
    ? existing
    : "friends-night";
}

function buildRemixRequest(row: GroupOutingRow, collaboration: GroupCollaboration) {
  const plan = row.generated_plan;
  const answers = isRecord(row.builder_answers) ? row.builder_answers : {};
  const vibes = collaboration.vibes;
  const budget = blendedBudget(vibes) ?? "under-80";
  const transport = blendedTransport(vibes);
  const interests = popularValues(vibes.map((vibe) => vibe.interests), 8).map((item) => item.label);
  const cuisines = popularValues(vibes.map((vibe) => vibe.cuisines), 5).map((item) => item.label);
  const neighbourhoods = popularValues(vibes.map((vibe) => vibe.preferredNeighbourhoods), 5).map((item) => item.label);
  const originalInterests = safeStringArray(answers.interests, 20);
  const originalNeighbourhoods = safeStringArray(answers.neighbourhoods, 15);
  const mix = requestedStopMix(plan);
  const alcoholFree = vibes.some((vibe) => vibe.alcoholFree) || plan.alcoholFree === true;

  if (alcoholFree) {
    mix.drinks = 0;
  }

  const allowedKinds = [
    ...(mix.food > 0 ? ["food"] : []),
    ...(mix.events > 0 ? ["event"] : []),
    ...(!alcoholFree && mix.drinks > 0 ? ["drinks"] : [])
  ];

  const buildMethod = plan.buildMethod === "mix" || plan.buildMethod === "anchor"
    ? plan.buildMethod
    : "surprise";

  return {
    planningMode: "group",
    buildMethod,
    outingTypeId: readString(answers.outingTypeId, "group-night"),
    outingTypeTitle: readString(answers.outingTypeTitle, "Group outing"),
    date: readString(plan.date, readString(answers.date, "")),
    startTime: readString(plan.requestedStartTime, readString(answers.startTime, "18:00")),
    duration: readString(plan.requestedDuration, readString(answers.duration, "3 hours")),
    interests: Array.from(new Set([...interests, ...cuisines, ...originalInterests])).slice(0, 20),
    neighbourhoods: (neighbourhoods.length > 0 ? neighbourhoods : originalNeighbourhoods).slice(0, 10),
    budget,
    transportation: generatorTransport(transport, readString(plan.transportation, "Transit")),
    alcoholFree,
    partySize: Math.max(
      2,
      collaboration.members.filter((member) => member.rsvp !== "not-going").length,
      readNumber(plan.partySize, 2, 2, 12)
    ),
    maxTravelMinutes: readNumber(plan.maxTravelMinutes, 20, 5, 90),
    mustIncludeTerms: safeStringArray(plan.mustIncludeTerms, 8),
    avoidTerms: safeStringArray(plan.avoidTerms, 8),
    discoveryPreference:
      plan.discoveryPreference === "new-only" || plan.discoveryPreference === "mix"
        ? plan.discoveryPreference
        : "best",
    visitedListingKeys: [],
    visitedEventOccurrenceKeys: [],
    stopMix: mix,
    totalStops: readNumber(plan.requestedStopCount, Math.max(1, Math.min(5, Array.isArray(plan.stops) ? plan.stops.length : 3)), 1, 5),
    allowedKinds: allowedKinds.length > 0 ? allowedKinds : alcoholFree ? ["food", "event"] : ["food", "event", "drinks"],
    anchorListingKey: buildMethod === "anchor" && typeof plan.anchorListingKey === "string" ? plan.anchorListingKey : null,
    anchorListingName: buildMethod === "anchor" && typeof plan.anchorListingName === "string" ? plan.anchorListingName : null,
    soloVibe: null,
    soloPace: null,
    groupVibe: deriveGroupVibe(vibes, plan),
    groupPriority: budget === "free" || budget === "under-40" ? "budget-friendly" : "everyone-happy"
  };
}

async function remixPlan(request: Request, row: GroupOutingRow, collaboration: GroupCollaboration) {
  const generationRequest = buildRemixRequest(row, collaboration);
  const generatorUrl = new URL("/api/outings/generate", request.url);

  const response = await fetch(generatorUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Venture-Group-Blend": "1"
    },
    body: JSON.stringify(generationRequest),
    cache: "no-store"
  });

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error("REMIX_GENERATOR_INVALID");
  }

  if (!response.ok) {
    const error = isRecord(result) && typeof result.error === "string"
      ? result.error
      : "Venture could not build a fresh route from the group blend.";
    throw new Error(`REMIX_GENERATOR:${error}`);
  }

  if (!validGeneratedPlan(result)) {
    throw new Error("REMIX_GENERATOR_INVALID");
  }

  const protectedNeeds = new Set(
    collaboration.vibes.flatMap((vibe) => [
      ...vibe.dietaryNeeds.map((item) => `diet:${item.toLocaleLowerCase("en-CA")}`),
      ...vibe.accessibilityNeeds.map((item) => `access:${item.toLocaleLowerCase("en-CA")}`)
    ])
  );

  const warnings = safeStringArray(result.warnings, 20);
  if (protectedNeeds.size > 0) {
    warnings.push(
      `This group blend includes ${protectedNeeds.size} private practical ${protectedNeeds.size === 1 ? "need" : "needs"} that Venture cannot fully verify from current venue data. Confirm accessibility or dietary details before heading out.`
    );
  }

  const now = new Date().toISOString();
  const nextCollaboration: GroupCollaboration = {
    ...collaboration,
    version: 2,
    votes: [],
    lastBlendRemixAt: now
  };

  return {
    ...result,
    warnings: Array.from(new Set(warnings)),
    collaboration: nextCollaboration
  };
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { shareCode } = await context.params;
  if (!SHARE_CODE_PATTERN.test(shareCode)) {
    return NextResponse.json({ error: "That group plan link is not valid." }, { status: 400 });
  }

  try {
    const row = await loadOuting(shareCode);
    if (!row) {
      return NextResponse.json({ error: "This shared group plan is unavailable." }, { status: 404 });
    }
    const viewerId = await optionalViewerId();
    return NextResponse.json(await publicState(row, viewerId), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Unable to load Venture group collaboration:", error);
    return NextResponse.json({ error: "Venture could not load the group right now." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "This group update came from an untrusted origin." }, { status: 403 });
  }

  const { shareCode } = await context.params;
  if (!SHARE_CODE_PATTERN.test(shareCode)) {
    return NextResponse.json({ error: "That group plan link is not valid." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The group update could not be read." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.action !== "string") {
    return NextResponse.json({ error: "The group update is incomplete." }, { status: 400 });
  }

  try {
    const { user, supabase } = await requireProfileUser();
    const rateLimit = consumeRateLimit({
      key: `group-plan:${shareCode}:${user.id}:${getRequestAddress(request)}`,
      limit: 60,
      windowMs: 60 * 60 * 1000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many group-plan updates were sent. Try again shortly." },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const row = await loadOuting(shareCode);
    if (!row) {
      return NextResponse.json({ error: "This shared group plan is unavailable." }, { status: 404 });
    }

    const admin = getSupabaseAdminClient();
    const collaboration = parseCollaboration(row.generated_plan.collaboration);
    const now = new Date().toISOString();
    let member = collaboration.members.find((item) => item.userId === user.id) ?? null;
    let remixed = false;
    let nextPlan: Record<string, unknown> = row.generated_plan;

    if (body.action === "join") {
      const profileResult = await admin
        .from("profiles")
        .select("display_name, avatar_path")
        .eq("id", user.id)
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;

      const displayName = typeof profileResult.data?.display_name === "string"
        ? profileResult.data.display_name.trim().slice(0, 60)
        : "";
      const fallbackName = user.email?.split("@")[0] || "Venture friend";
      const rsvp = RSVP_VALUES.has(String(body.rsvp)) ? body.rsvp as Rsvp : "going";
      const nextMember: GroupMember = {
        userId: user.id,
        displayName: displayName || fallbackName,
        avatarPath: typeof profileResult.data?.avatar_path === "string" ? profileResult.data.avatar_path : null,
        role: row.owner_id === user.id ? "host" : "member",
        rsvp,
        joinedAt: member?.joinedAt || now
      };

      collaboration.members = [
        ...collaboration.members.filter((item) => item.userId !== user.id),
        nextMember
      ].slice(0, 30);
      member = nextMember;
    } else if (body.action === "rsvp") {
      if (!member) {
        return NextResponse.json({ error: "Join the group plan before changing your RSVP." }, { status: 409 });
      }
      if (!RSVP_VALUES.has(String(body.rsvp))) {
        return NextResponse.json({ error: "Choose Going, Maybe, or Can't make it." }, { status: 400 });
      }
      collaboration.members = collaboration.members.map((item) =>
        item.userId === user.id ? { ...item, rsvp: body.rsvp as Rsvp } : item
      );
    } else if (body.action === "vote") {
      if (!member) {
        return NextResponse.json({ error: "Join the group plan before voting on stops." }, { status: 409 });
      }
      if (typeof body.stopKey !== "string" || !validStopKeys(row.generated_plan).has(body.stopKey)) {
        return NextResponse.json({ error: "That stop is not part of this itinerary." }, { status: 400 });
      }
      if (!VOTE_VALUES.has(String(body.choice))) {
        return NextResponse.json({ error: "Choose Love it, Fine, or Swap it." }, { status: 400 });
      }
      collaboration.votes = [
        ...collaboration.votes.filter((vote) => !(vote.userId === user.id && vote.stopKey === body.stopKey)),
        {
          userId: user.id,
          stopKey: body.stopKey,
          choice: body.choice as VoteChoice,
          updatedAt: now
        }
      ].slice(-500);
    } else if (body.action === "contribute-vibe") {
      if (!member) {
        return NextResponse.json({ error: "Join the group plan before blending your vibe." }, { status: 409 });
      }

      const preferencesResult = await supabase
        .from("user_preferences")
        .select("interests, cuisines, dietary_needs, accessibility_needs, preferred_neighbourhoods, outing_styles, default_budget, default_transport, alcohol_free, likes_free_events, likes_nightlife, likes_outdoors, likes_date_ideas")
        .eq("user_id", user.id)
        .maybeSingle();

      if (preferencesResult.error) throw preferencesResult.error;
      const preferences: Record<string, unknown> = isRecord(preferencesResult.data) ? preferencesResult.data : {};
      const defaultBudget = BUDGET_VALUES.has(String(preferences.default_budget))
        ? preferences.default_budget as Budget
        : "under-80";
      const defaultTransport = TRANSPORT_VALUES.has(String(preferences.default_transport))
        ? preferences.default_transport as Transport
        : "any";

      const contribution: GroupVibeContribution = {
        userId: user.id,
        interests: safeStringArray(preferences.interests),
        cuisines: safeStringArray(preferences.cuisines),
        dietaryNeeds: safeStringArray(preferences.dietary_needs),
        accessibilityNeeds: safeStringArray(preferences.accessibility_needs),
        preferredNeighbourhoods: safeStringArray(preferences.preferred_neighbourhoods, 20),
        outingStyles: safeStringArray(preferences.outing_styles),
        defaultBudget,
        defaultTransport,
        alcoholFree: preferences.alcohol_free === true,
        likesFreeEvents: preferences.likes_free_events !== false,
        likesNightlife: preferences.likes_nightlife === true,
        likesOutdoors: preferences.likes_outdoors === true,
        likesDateIdeas: preferences.likes_date_ideas === true,
        updatedAt: now
      };

      collaboration.vibes = [
        ...collaboration.vibes.filter((vibe) => vibe.userId !== user.id),
        contribution
      ].slice(0, 30);
    } else if (body.action === "remove-vibe") {
      if (!member) {
        return NextResponse.json({ error: "Join the group plan before changing your vibe contribution." }, { status: 409 });
      }
      collaboration.vibes = collaboration.vibes.filter((vibe) => vibe.userId !== user.id);
    } else if (body.action === "remix") {
      if (!member || member.role !== "host" || row.owner_id !== user.id) {
        return NextResponse.json({ error: "Only the host can remix the shared itinerary." }, { status: 403 });
      }
      if (collaboration.vibes.length < 2) {
        return NextResponse.json({ error: "At least two people need to share their vibe before Venture can blend the group." }, { status: 409 });
      }

      const remixLimit = consumeRateLimit({
        key: `group-remix:${shareCode}:${user.id}:${getRequestAddress(request)}`,
        limit: 8,
        windowMs: 60 * 60 * 1000
      });

      if (!remixLimit.allowed) {
        return NextResponse.json(
          { error: "This group has remixed a few times already. Give it a moment before trying again." },
          { status: 429, headers: rateLimitHeaders(remixLimit) }
        );
      }

      nextPlan = await remixPlan(request, row, collaboration);
      remixed = true;
    } else if (body.action === "leave") {
      if (member?.role === "host") {
        return NextResponse.json({ error: "The host stays attached to the group plan." }, { status: 409 });
      }
      collaboration.members = collaboration.members.filter((item) => item.userId !== user.id);
      collaboration.votes = collaboration.votes.filter((vote) => vote.userId !== user.id);
      collaboration.vibes = collaboration.vibes.filter((vibe) => vibe.userId !== user.id);
    } else {
      return NextResponse.json({ error: "That group action is not supported." }, { status: 400 });
    }

    if (!remixed) {
      nextPlan = {
        ...row.generated_plan,
        collaboration: {
          ...collaboration,
          version: 2
        }
      };
    }

    const title = typeof nextPlan.title === "string" ? nextPlan.title.slice(0, 200) : row.title;
    const estimatedTotalCad = typeof nextPlan.estimatedTotalCad === "number" ? nextPlan.estimatedTotalCad : row.budget_cad;

    const updateResult = await admin
      .from("outings")
      .update({
        generated_plan: nextPlan,
        title,
        budget_cad: estimatedTotalCad
      })
      .eq("id", row.id)
      .eq("updated_at", row.updated_at)
      .select("id")
      .maybeSingle();

    if (updateResult.error) throw updateResult.error;
    if (!updateResult.data) {
      return NextResponse.json(
        { error: "Someone else updated the group at the same time. Refresh and try once more." },
        { status: 409, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const refreshed = await loadOuting(shareCode);
    if (!refreshed) {
      return NextResponse.json({ error: "The group plan could not be reloaded." }, { status: 500 });
    }

    return NextResponse.json({
      ...(await publicState(refreshed, user.id)),
      remixed
    }, {
      headers: {
        ...rateLimitHeaders(rateLimit),
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Sign in with Venture before joining this group plan." }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith("REMIX_GENERATOR:")) {
      return NextResponse.json({ error: error.message.slice("REMIX_GENERATOR:".length) }, { status: 409 });
    }
    if (error instanceof Error && error.message === "REMIX_GENERATOR_INVALID") {
      return NextResponse.json({ error: "Venture built a route, but it did not pass the shared-plan safety check." }, { status: 500 });
    }
    console.error("Unable to update Venture group collaboration:", error);
    return NextResponse.json({ error: "Venture could not update the group right now." }, { status: 500 });
  }
}
