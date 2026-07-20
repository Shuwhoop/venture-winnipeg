import { NextResponse } from "next/server";

import {
  recordServerBetaEvent
} from "@/lib/beta/server";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import type {
  GeneratedOutingPlan
} from "@/lib/saved-outings";

type PlanningMode =
  | "solo"
  | "group";

type OutingDraft = {
  planningMode: PlanningMode;
  outingTypeId: string;
  outingTypeTitle: string;
  date: string;
  startTime: string;
  duration: string;
  interests: string[];
  neighbourhoods: string[];
  budget:
    | "free"
    | "under-40"
    | "under-80"
    | "flexible";
  transportation: string;
  alcoholFree: boolean;
  createdAt?: string;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isStringArray(
  value: unknown
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "string"
    )
  );
}

function parseDraft(
  value: unknown
): OutingDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  const planningMode =
    value.planningMode;

  const budget =
    value.budget;

  if (
    (
      planningMode !== "solo" &&
      planningMode !== "group"
    ) ||
    typeof value.outingTypeId !==
      "string" ||
    typeof value.outingTypeTitle !==
      "string" ||
    typeof value.date !== "string" ||
    typeof value.startTime !==
      "string" ||
    typeof value.duration !==
      "string" ||
    !isStringArray(
      value.interests
    ) ||
    !isStringArray(
      value.neighbourhoods
    ) ||
    (
      budget !== "free" &&
      budget !== "under-40" &&
      budget !== "under-80" &&
      budget !== "flexible"
    ) ||
    typeof value.transportation !==
      "string" ||
    typeof value.alcoholFree !==
      "boolean"
  ) {
    return null;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value.date
    ) ||
    !/^\d{2}:\d{2}$/.test(
      value.startTime
    )
  ) {
    return null;
  }

  return {
    planningMode,

    outingTypeId:
      value.outingTypeId,

    outingTypeTitle:
      value.outingTypeTitle,

    date:
      value.date,

    startTime:
      value.startTime,

    duration:
      value.duration,

    interests:
      value.interests.slice(
        0,
        30
      ),

    neighbourhoods:
      value.neighbourhoods.slice(
        0,
        20
      ),

    budget,

    transportation:
      value.transportation,

    alcoholFree:
      value.alcoholFree,

    createdAt:
      typeof value.createdAt ===
      "string"
        ? value.createdAt
        : undefined
  };
}

function isGeneratedPlan(
  value: unknown
): value is GeneratedOutingPlan {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.planId !== "string" ||
    typeof value.generatedAt !==
      "string" ||
    typeof value.title !== "string" ||
    typeof value.date !== "string" ||
    typeof value.requestedStartTime !==
      "string" ||
    typeof value.requestedDuration !==
      "string" ||
    typeof value.transportation !==
      "string" ||
    typeof value.alcoholFree !==
      "boolean" ||
    !Array.isArray(value.stops) ||
    !isStringArray(value.warnings) ||
    typeof value.candidateCount !==
      "number"
  ) {
    return false;
  }

  if (
    value.estimatedTotalCad !== null &&
    typeof value.estimatedTotalCad !==
      "number"
  ) {
    return false;
  }

  if (
    value.stops.length > 10
  ) {
    return false;
  }

  return value.stops.every(
    (stop) => {
      if (!isRecord(stop)) {
        return false;
      }

      const listing =
        stop.listing;

      return (
        typeof stop.order === "number" &&
        typeof stop.startTime ===
          "string" &&
        typeof stop.endTime ===
          "string" &&
        typeof stop.reason ===
          "string" &&
        isRecord(listing) &&
        typeof listing.id === "string" &&
        typeof listing.slug ===
          "string" &&
        typeof listing.name ===
          "string" &&
        (
          listing.type === "event" ||
          listing.type === "restaurant"
        )
      );
    }
  );
}

function getDurationMinutes(
  duration: string
): number {
  const match =
    duration.match(/\d+/);

  const hours =
    match
      ? Number(match[0])
      : 3;

  if (!Number.isFinite(hours)) {
    return 180;
  }

  return Math.min(
    Math.max(hours, 1),
    24
  ) * 60;
}

export async function POST(
  request: Request
) {
  let rawBody: string;

  try {
    rawBody =
      await request.text();
  } catch {
    return NextResponse.json(
      {
        error:
          "The share request could not be read."
      },
      {
        status: 400
      }
    );
  }

  if (
    rawBody.length > 250_000
  ) {
    return NextResponse.json(
      {
        error:
          "The outing is too large to share."
      },
      {
        status: 413
      }
    );
  }

  let body: unknown;

  try {
    body =
      JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        error:
          "The share request was not valid JSON."
      },
      {
        status: 400
      }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      {
        error:
          "The share request is incomplete."
      },
      {
        status: 400
      }
    );
  }

  const draft =
    parseDraft(body.draft);

  const plan =
    isGeneratedPlan(body.plan)
      ? body.plan
      : null;

  if (!draft || !plan) {
    return NextResponse.json(
      {
        error:
          "The outing information is incomplete or invalid."
      },
      {
        status: 400
      }
    );
  }

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error
    } =
      await supabase
        .from("outings")
        .insert({
          owner_id: null,

          planning_mode:
            draft.planningMode,

          title:
            plan.title.slice(
              0,
              200
            ),

          city:
            "Winnipeg",

          timezone:
            "America/Winnipeg",

          duration_minutes:
            getDurationMinutes(
              draft.duration
            ),

          budget_cad:
            plan.estimatedTotalCad,

          builder_answers:
            draft,

          generated_plan:
            plan,

          generator_version:
            "v1",

          visibility:
            "shared",

          status:
            "ready",

          shared_at:
            new Date().toISOString()
        })
        .select(
          "share_code"
        )
        .single();

    if (error) {
      console.error(
        "Could not create shared outing:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Venture could not create the share link."
        },
        {
          status: 500
        }
      );
    }

    const shareCode =
      data?.share_code;

    if (
      typeof shareCode !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "The share link was not created correctly."
        },
        {
          status: 500
        }
      );
    }

    const origin =
      new URL(
        request.url
      ).origin;

    await recordServerBetaEvent({
      request,
      eventName: "outing_shared",
      pagePath: "/build-outing/results",
      properties: {
        shareCode,
        planningMode: draft.planningMode,
        stopCount: plan.stops.length,
        estimatedTotalCad:
          plan.estimatedTotalCad
      }
    });

    return NextResponse.json(
      {
        shareCode,

        shareUrl:
          `${origin}/outings/${shareCode}`
      },
      {
        headers: {
          "Cache-Control":
            "no-store"
        }
      }
    );
  } catch (error) {
    console.error(
      "Unexpected shared outing error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Venture could not create the share link."
      },
      {
        status: 500
      }
    );
  }
}   