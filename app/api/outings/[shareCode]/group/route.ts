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

type Rsvp = "going" | "maybe" | "not-going";
type VoteChoice = "love" | "okay" | "swap";

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

type GroupCollaboration = {
  version: 1;
  members: GroupMember[];
  votes: GroupVote[];
};

type GroupOutingRow = {
  id: string;
  owner_id: string | null;
  share_code: string;
  planning_mode: string;
  visibility: string;
  status: string;
  generated_plan: Record<string, unknown>;
  updated_at: string;
};

type RouteContext = {
  params: Promise<{
    shareCode: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseCollaboration(value: unknown): GroupCollaboration {
  if (!isRecord(value)) {
    return { version: 1, members: [], votes: [] };
  }

  const rawMembers = Array.isArray(value.members) ? value.members : [];
  const rawVotes = Array.isArray(value.votes) ? value.votes : [];

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

  return { version: 1, members, votes };
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

async function loadOuting(shareCode: string): Promise<GroupOutingRow | null> {
  const admin = getSupabaseAdminClient();
  const result = await admin
    .from("outings")
    .select("id, owner_id, share_code, planning_mode, visibility, status, generated_plan, updated_at")
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
    viewer: {
      authenticated: Boolean(viewerId),
      joined: Boolean(viewerMember),
      role: viewerMember?.role ?? null,
      rsvp: viewerMember?.rsvp ?? null,
      myVotes
    }
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
    const { user } = await requireProfileUser();
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
    } else if (body.action === "leave") {
      if (member?.role === "host") {
        return NextResponse.json({ error: "The host stays attached to the group plan." }, { status: 409 });
      }
      collaboration.members = collaboration.members.filter((item) => item.userId !== user.id);
      collaboration.votes = collaboration.votes.filter((vote) => vote.userId !== user.id);
    } else {
      return NextResponse.json({ error: "That group action is not supported." }, { status: 400 });
    }

    const nextPlan = {
      ...row.generated_plan,
      collaboration
    };

    const updateResult = await admin
      .from("outings")
      .update({ generated_plan: nextPlan })
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

    return NextResponse.json(await publicState(refreshed, user.id), {
      headers: {
        ...rateLimitHeaders(rateLimit),
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Sign in with Venture before joining this group plan." }, { status: 401 });
    }
    console.error("Unable to update Venture group collaboration:", error);
    return NextResponse.json({ error: "Venture could not update the group right now." }, { status: 500 });
  }
}
