import { NextResponse } from "next/server";

import {
  recordServerBetaEvent
} from "@/lib/beta/server";

import {
  decrementMix,
  getOutingStopKind,
  resolveRequestedStopCount,
  withOutingPlanMetrics
} from "@/lib/outing-plan-metrics";

import {
  repairOutingSchedule
} from "@/lib/outing-schedule-validation";

import type {
  GeneratedOutingPlan,
  GeneratedOutingStop
} from "@/lib/saved-outings";

import type {
  Listing
} from "@/lib/types";

type RemoveStopRequest = {
  draft: {
    transportation: string;
    partySize: number;
  };
  plan: GeneratedOutingPlan;
  stopOrder: number;
};

function parseRequest(
  value: unknown
): RemoveStopRequest | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const body = value as Record<string, unknown>;
  const draft = body.draft as
    | Record<string, unknown>
    | undefined;
  const plan = body.plan as
    | GeneratedOutingPlan
    | undefined;

  if (
    !draft ||
    typeof draft.transportation !== "string" ||
    !plan ||
    !Array.isArray(plan.stops) ||
    typeof body.stopOrder !== "number" ||
    !Number.isFinite(body.stopOrder)
  ) {
    return null;
  }

  const partySize =
    typeof draft.partySize === "number" &&
    Number.isFinite(draft.partySize)
      ? Math.min(
          12,
          Math.max(1, Math.round(draft.partySize))
        )
      : Math.max(1, plan.partySize ?? 1);

  return {
    draft: {
      transportation: draft.transportation,
      partySize
    },
    plan,
    stopOrder: Math.round(body.stopOrder)
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

function getDistanceKm(
  first: Listing,
  second: Listing
): number | null {
  if (
    first.latitude === undefined ||
    first.longitude === undefined ||
    second.latitude === undefined ||
    second.longitude === undefined
  ) {
    return null;
  }

  const latitudeDifference = toRadians(
    second.latitude - first.latitude
  );

  const longitudeDifference = toRadians(
    second.longitude - first.longitude
  );

  const firstLatitude = toRadians(
    first.latitude
  );

  const secondLatitude = toRadians(
    second.latitude
  );

  const calculation =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  return 6371 *
    2 *
    Math.atan2(
      Math.sqrt(calculation),
      Math.sqrt(1 - calculation)
    );
}

function getTravelMinutes(
  first: Listing,
  second: Listing,
  transportation: string
): number {
  const distance = getDistanceKm(first, second);

  if (distance === null) {
    return 20;
  }

  const mode = normalize(transportation);
  let speedKmPerHour = 18;
  let fixedBuffer = 8;

  if (mode === "walking") {
    speedKmPerHour = 4.5;
    fixedBuffer = 3;
  } else if (
    mode === "driving" ||
    mode === "rideshare"
  ) {
    speedKmPerHour = 30;
    fixedBuffer = 8;
  }

  return Math.max(
    5,
    Math.ceil(
      distance / speedKmPerHour * 60 + fixedBuffer
    )
  );
}

function rebuildTravel(
  stops: GeneratedOutingStop[],
  transportation: string
): GeneratedOutingStop[] {
  return stops.map((stop, index, allStops) => ({
    ...stop,
    order: index + 1,
    travelFromPreviousMinutes:
      index === 0
        ? null
        : getTravelMinutes(
            allStops[index - 1].listing,
            stop.listing,
            transportation
          )
  }));
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "The remove-stop request was not valid JSON."
      },
      {
        status: 400
      }
    );
  }

  const parsed = parseRequest(body);

  if (!parsed) {
    return NextResponse.json(
      {
        error: "The remove-stop request was incomplete."
      },
      {
        status: 400
      }
    );
  }

  const {
    draft,
    plan,
    stopOrder
  } = parsed;

  if (plan.stops.length <= 1) {
    return NextResponse.json(
      {
        error: "An outing needs at least one stop."
      },
      {
        status: 400
      }
    );
  }

  const orderedStops = [...plan.stops].sort(
    (first, second) => first.order - second.order
  );

  const removedStop = orderedStops.find(
    (stop) => stop.order === stopOrder
  );

  if (!removedStop) {
    return NextResponse.json(
      {
        error: "That stop could not be found."
      },
      {
        status: 404
      }
    );
  }

  const updatedStops = rebuildTravel(
    orderedStops.filter(
      (stop) => stop.order !== stopOrder
    ),
    draft.transportation
  );

  const removedKind = getOutingStopKind(removedStop);
  const previousRequestedStopCount =
    resolveRequestedStopCount(plan);

  const requestedStopCount = Math.max(
    updatedStops.length,
    previousRequestedStopCount - 1
  );

  const requestedMix = decrementMix(
    plan.requestedMix,
    removedKind
  );

  const updatedPlan = repairOutingSchedule(
    withOutingPlanMetrics(
      {
        ...plan,
        generatedAt: new Date().toISOString(),
        requestedMix,
        stops: updatedStops
      },
      {
        requestedStopCount,
        requestedMix,
        partySize: draft.partySize
      }
    )
  );

  await recordServerBetaEvent({
    request,
    eventName: "outing_stop_removed",
    pagePath: "/build-outing/results",
    properties: {
      removedOrder: stopOrder,
      removedKind,
      removedListingKey:
        `${removedStop.listing.type}-${removedStop.listing.id}`,
      remainingStopCount: updatedStops.length,
      recommendationVersion:
        plan.recommendationVersion || "route-score-v1"
    }
  });

  return NextResponse.json({
    plan: updatedPlan,
    removedOrder: stopOrder,
    removedKind,
    removedListingName: removedStop.listing.name
  });
}
