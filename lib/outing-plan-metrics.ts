import type {
  GeneratedOutingPlan,
  GeneratedOutingStop,
  OutingPlanStatus,
  OutingStopKind,
  OutingStopMix
} from "@/lib/saved-outings";

const PRICE_WARNING_PREFIX =
  "At least one listing does not have a confirmed numeric price";

function getListingSearchText(
  stop: GeneratedOutingStop
): string {
  const { listing } = stop;

  return [
    listing.name,
    listing.category,
    listing.subtitle,
    listing.description,
    listing.neighbourhood,
    listing.venueName ?? "",
    listing.address ?? "",
    listing.placeType ?? "",
    ...(listing.searchTerms ?? [])
  ]
    .join(" ")
    .toLowerCase();
}

export function getOutingStopKind(
  stop: GeneratedOutingStop
): OutingStopKind {
  if (stop.kind) {
    return stop.kind;
  }

  if (stop.listing.type === "event") {
    return "event";
  }

  if (
    stop.listing.catalogueKind ===
    "activity"
  ) {
    return "activity";
  }

  const text = getListingSearchText(stop);

  return (
    stop.listing.placeType === "bar_pub" ||
    stop.listing.placeType === "brewery" ||
    [
      "bar",
      "pub",
      "cocktail",
      "brewery",
      "nightclub",
      "nightlife"
    ].some((keyword) => text.includes(keyword))
  )
    ? "drinks"
    : "food";
}

export function countOutingMix(
  stops: GeneratedOutingStop[]
): OutingStopMix {
  return stops.reduce<OutingStopMix>(
    (mix, stop) => {
      const kind = getOutingStopKind(stop);

      if (kind === "event") {
        mix.events += 1;
      } else if (kind === "activity") {
        mix.activities += 1;
      } else {
        mix[kind] += 1;
      }

      return mix;
    },
    {
      food: 0,
      events: 0,
      activities: 0,
      drinks: 0
    }
  );
}

export function countMix(
  mix: OutingStopMix | undefined
): number {
  if (!mix) {
    return 0;
  }

  return (
    (mix.food ?? 0) +
    (mix.events ?? 0) +
    (mix.activities ?? 0) +
    (mix.drinks ?? 0)
  );
}

export function resolveRequestedStopCount(
  plan: GeneratedOutingPlan
): number {
  const requestedFromMix = countMix(
    plan.requestedMix
  );

  return Math.max(
    plan.requestedStopCount ??
      requestedFromMix,
    plan.stops.length
  );
}

export function decrementMix(
  mix: OutingStopMix | undefined,
  kind: OutingStopKind
): OutingStopMix {
  const next: OutingStopMix = {
    food: mix?.food ?? 0,
    events: mix?.events ?? 0,
    activities:
      mix?.activities ?? 0,
    drinks: mix?.drinks ?? 0
  };

  if (kind === "event") {
    next.events = Math.max(0, next.events - 1);
  } else if (kind === "activity") {
    next.activities = Math.max(0, next.activities - 1);
  } else {
    next[kind] = Math.max(0, next[kind] - 1);
  }

  return next;
}

type MetricOptions = {
  requestedStopCount?: number;
  requestedMix?: OutingStopMix;
  partySize?: number;
};

export function withOutingPlanMetrics(
  plan: GeneratedOutingPlan,
  options: MetricOptions = {}
): GeneratedOutingPlan {
  const actualStopCount = plan.stops.length;
  const requestedMix =
    options.requestedMix ?? plan.requestedMix;

  const requestedStopCount = Math.max(
    options.requestedStopCount ??
      plan.requestedStopCount ??
      countMix(requestedMix),
    actualStopCount
  );

  const missingStopCount = Math.max(
    0,
    requestedStopCount - actualStopCount
  );

  const planStatus: OutingPlanStatus =
    actualStopCount === 0
      ? "empty"
      : missingStopCount > 0
        ? "partial"
        : "complete";

  const actualMix = countOutingMix(
    plan.stops
  );

  const knownCosts = plan.stops
    .map((stop) => stop.estimatedCostCad)
    .filter(
      (value): value is number => value !== null
    );

  const estimatedTotalCad =
    knownCosts.length > 0
      ? knownCosts.reduce(
          (total, cost) => total + cost,
          0
        )
      : null;

  const partySize = Math.max(
    1,
    options.partySize ?? plan.partySize ?? 1
  );

  const warnings = plan.warnings.filter(
    (warning) =>
      !warning.startsWith(PRICE_WARNING_PREFIX)
  );

  if (
    plan.stops.some(
      (stop) => stop.estimatedCostCad === null
    )
  ) {
    warnings.push(
      "At least one listing does not have a confirmed numeric price, so the total is incomplete."
    );
  }

  return {
    ...plan,
    partySize,
    requestedMix,
    actualMix,
    requestedStopCount,
    actualStopCount,
    missingStopCount,
    planStatus,
    estimatedTotalCad,
    estimatedGroupTotalCad:
      estimatedTotalCad === null
        ? null
        : estimatedTotalCad * partySize,
    warnings: Array.from(new Set(warnings))
  };
}
