import type {
  GeneratedOutingPlan,
  GeneratedOutingStop
} from "@/lib/saved-outings";

const MANUAL_ORDER_WARNING =
  "You changed the stop order. Venture recalculated the route timing and travel; confirm live event and venue hours before heading out.";

function getStopKey(
  stop: GeneratedOutingStop
): string {
  return `${stop.listing.type}-${stop.listing.id}`;
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

function getDistanceKm(
  first: GeneratedOutingStop["listing"],
  second: GeneratedOutingStop["listing"]
): number | null {
  if (
    typeof first.latitude !== "number" ||
    typeof first.longitude !== "number" ||
    typeof second.latitude !== "number" ||
    typeof second.longitude !== "number"
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const latitudeDifference = toRadians(
    second.latitude - first.latitude
  );
  const longitudeDifference = toRadians(
    second.longitude - first.longitude
  );
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);

  const calculation =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const angle =
    2 *
    Math.atan2(
      Math.sqrt(calculation),
      Math.sqrt(1 - calculation)
    );

  return earthRadiusKm * angle;
}

function getTravelMinutes(
  first: GeneratedOutingStop["listing"],
  second: GeneratedOutingStop["listing"],
  transportation: string
): number {
  const distance = getDistanceKm(first, second);

  if (distance === null) {
    return 20;
  }

  const normalizedMode = transportation
    .trim()
    .toLowerCase();

  let speedKmPerHour = 18;
  let fixedBuffer = 8;

  if (normalizedMode.includes("walk")) {
    speedKmPerHour = 4.5;
    fixedBuffer = 3;
  } else if (
    normalizedMode.includes("driv") ||
    normalizedMode.includes("ride")
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

function parseClock(value: string): number | null {
  const trimmed = value.trim();

  const twentyFourHourMatch = trimmed.match(
    /^(\d{1,2}):(\d{2})$/
  );

  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);

    if (
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59
    ) {
      return hours * 60 + minutes;
    }
  }

  const twelveHourMatch = trimmed.match(
    /^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i
  );

  if (!twelveHourMatch) {
    return null;
  }

  let hours = Number(twelveHourMatch[1]);
  const minutes = Number(twelveHourMatch[2] ?? "0");
  const period = twelveHourMatch[3].toLowerCase();

  if (
    hours < 1 ||
    hours > 12 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  if (hours === 12) {
    hours = 0;
  }

  if (period === "pm") {
    hours += 12;
  }

  return hours * 60 + minutes;
}

function formatClock(value: number): string {
  const minutesInDay = 24 * 60;
  const normalized =
    ((value % minutesInDay) + minutesInDay) %
    minutesInDay;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}`;
}

function getFallbackDuration(
  stop: GeneratedOutingStop
): number {
  const start = parseClock(stop.startTime);
  const end = parseClock(stop.endTime);

  if (
    start !== null &&
    end !== null
  ) {
    const difference =
      end >= start
        ? end - start
        : end + 24 * 60 - start;

    if (difference > 0) {
      return difference;
    }
  }

  return 60;
}

export function getOutingStopKey(
  stop: GeneratedOutingStop
): string {
  return getStopKey(stop);
}

export function reorderOutingPlan(
  plan: GeneratedOutingPlan,
  sourceKey: string,
  targetKey: string
): GeneratedOutingPlan {
  if (sourceKey === targetKey) {
    return plan;
  }

  const sourceIndex = plan.stops.findIndex(
    (stop) => getStopKey(stop) === sourceKey
  );
  const targetIndex = plan.stops.findIndex(
    (stop) => getStopKey(stop) === targetKey
  );

  if (
    sourceIndex < 0 ||
    targetIndex < 0
  ) {
    return plan;
  }

  const reorderedStops = [...plan.stops];
  const [movedStop] = reorderedStops.splice(
    sourceIndex,
    1
  );
  reorderedStops.splice(targetIndex, 0, movedStop);

  const firstStart =
    parseClock(plan.requestedStartTime) ??
    parseClock(reorderedStops[0]?.startTime ?? "") ??
    18 * 60;

  let previousEnd = firstStart;

  const recalculatedStops = reorderedStops.map(
    (stop, index) => {
      const travelMinutes =
        index === 0
          ? null
          : getTravelMinutes(
              reorderedStops[index - 1].listing,
              stop.listing,
              plan.transportation
            );

      const start =
        index === 0
          ? firstStart
          : previousEnd + (travelMinutes ?? 0);
      const duration = Math.max(
        15,
        stop.durationMinutes ||
          getFallbackDuration(stop)
      );
      const end = start + duration;

      previousEnd = end;

      return {
        ...stop,
        order: index + 1,
        startTime: formatClock(start),
        endTime: formatClock(end),
        durationMinutes: duration,
        travelFromPreviousMinutes: travelMinutes
      };
    }
  );

  const warnings = Array.from(
    new Set([
      ...plan.warnings.filter(
        (warning) => warning !== MANUAL_ORDER_WARNING
      ),
      MANUAL_ORDER_WARNING
    ])
  );

  return {
    ...plan,
    generatedAt: new Date().toISOString(),
    actualStopCount: recalculatedStops.length,
    missingStopCount: Math.max(
      0,
      (plan.requestedStopCount ??
        recalculatedStops.length) -
        recalculatedStops.length
    ),
    planStatus:
      recalculatedStops.length === 0
        ? "empty"
        : (plan.requestedStopCount ??
              recalculatedStops.length) >
            recalculatedStops.length
          ? "partial"
          : "complete",
    stops: recalculatedStops,
    warnings
  };
}
