import {
  NextResponse
} from "next/server";

import {
  unsubscribeResendContact
} from "@/lib/newsletter/resend";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  requireProfileUser
} from "@/lib/profile-server";

import {
  consumeRateLimit,
  getRequestAddress,
  isSameOriginRequest,
  rateLimitHeaders
} from "@/lib/server-rate-limit";

export const runtime = "nodejs";

type DeleteBody = {
  confirmation?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function scrubSharedGroupIdentity(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string
) {
  const result = await admin
    .from("outings")
    .select("id, owner_id, generated_plan")
    .eq("planning_mode", "group")
    .eq("visibility", "shared")
    .limit(500);

  if (result.error) {
    throw result.error;
  }

  for (const row of result.data ?? []) {
    if (row.owner_id === userId || !isRecord(row.generated_plan)) {
      continue;
    }

    const collaboration = isRecord(row.generated_plan.collaboration)
      ? row.generated_plan.collaboration
      : null;

    if (!collaboration) {
      continue;
    }

    const members = Array.isArray(collaboration.members)
      ? collaboration.members.filter((item) => !(isRecord(item) && item.userId === userId))
      : [];
    const votes = Array.isArray(collaboration.votes)
      ? collaboration.votes.filter((item) => !(isRecord(item) && item.userId === userId))
      : [];
    const vibes = Array.isArray(collaboration.vibes)
      ? collaboration.vibes.filter((item) => !(isRecord(item) && item.userId === userId))
      : [];

    const hadIdentity =
      (Array.isArray(collaboration.members) && members.length !== collaboration.members.length) ||
      (Array.isArray(collaboration.votes) && votes.length !== collaboration.votes.length) ||
      (Array.isArray(collaboration.vibes) && vibes.length !== collaboration.vibes.length);

    if (!hadIdentity) {
      continue;
    }

    const updateResult = await admin
      .from("outings")
      .update({
        generated_plan: {
          ...row.generated_plan,
          collaboration: {
            ...collaboration,
            members,
            votes,
            vibes
          }
        }
      })
      .eq("id", row.id);

    if (updateResult.error) {
      throw updateResult.error;
    }
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "This account request came from an untrusted origin." },
      { status: 403 }
    );
  }

  let body: DeleteBody;

  try {
    body = await request.json() as DeleteBody;
  } catch {
    return NextResponse.json(
      { error: "The deletion request could not be read." },
      { status: 400 }
    );
  }

  if (body.confirmation !== "DELETE") {
    return NextResponse.json(
      { error: "Type DELETE to confirm permanent account deletion." },
      { status: 400 }
    );
  }

  try {
    const { user } = await requireProfileUser();
    const rateLimit = consumeRateLimit({
      key: `account:delete:${user.id}:${getRequestAddress(request)}`,
      limit: 5,
      windowMs: 60 * 60 * 1000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many account requests were submitted. Try again shortly." },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit)
        }
      );
    }

    const admin = getSupabaseAdminClient();
    const email = user.email?.trim().toLowerCase() ?? "";

    const avatarList = await admin.storage
      .from("avatars")
      .list(user.id, { limit: 100 });

    if (avatarList.error) {
      throw avatarList.error;
    }

    const avatarPaths = (avatarList.data ?? []).map(
      (item) => `${user.id}/${item.name}`
    );

    if (avatarPaths.length > 0) {
      const removeResult = await admin.storage
        .from("avatars")
        .remove(avatarPaths);

      if (removeResult.error) {
        throw removeResult.error;
      }
    }

    await scrubSharedGroupIdentity(admin, user.id);

    const hostedOutingsResult = await admin
      .from("outings")
      .delete()
      .eq("owner_id", user.id);

    if (hostedOutingsResult.error) {
      throw hostedOutingsResult.error;
    }

    if (email) {
      const now = new Date().toISOString();

      const newsletterResult = await admin
        .from("newsletter_subscribers")
        .update({
          first_name: "Former subscriber",
          status: "unsubscribed",
          unsubscribed_at: now,
          updated_at: now
        })
        .eq("email_normalized", email);

      if (newsletterResult.error) {
        throw newsletterResult.error;
      }

      await unsubscribeResendContact(email);
    }

    const deleteResult = await admin.auth.admin.deleteUser(
      user.id,
      false
    );

    if (deleteResult.error) {
      throw deleteResult.error;
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Your Venture account was deleted."
      },
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        { error: "Sign in before deleting your account." },
        { status: 401 }
      );
    }

    console.error("Unable to delete Venture account:", error);

    return NextResponse.json(
      {
        error:
          "Venture could not finish every account-deletion step. Your request was logged; try again or contact Venture support before creating another account."
      },
      { status: 500 }
    );
  }
}
