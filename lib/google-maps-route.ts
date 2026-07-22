import type {
  GeneratedOutingPlan
} from "@/lib/saved-outings";

function getGoogleMapsTravelMode(
  transportation: string
): string {
  const normalized =
    transportation
      .trim()
      .toLowerCase();

  if (normalized === "walking") {
    return "walking";
  }

  if (normalized === "transit") {
    return "transit";
  }

  if (
    normalized === "cycling" ||
    normalized === "biking" ||
    normalized === "bike"
  ) {
    return "bicycling";
  }

  return "driving";
}

function getGoogleMapsStopQuery(
  stop:
    GeneratedOutingPlan["stops"][number]
): string {
  const latitude =
    Number(
      stop.listing.latitude
    );

  const longitude =
    Number(
      stop.listing.longitude
    );

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return `${latitude},${longitude}`;
  }

  if (stop.listing.address) {
    return `${stop.listing.address}, Winnipeg, Manitoba`;
  }

  return [
    stop.listing.name,
    stop.listing.neighbourhood,
    "Winnipeg",
    "Manitoba"
  ]
    .filter(Boolean)
    .join(", ");
}

export function buildGoogleMapsRouteUrl(
  plan: GeneratedOutingPlan
): string | null {
  const orderedStops =
    [...plan.stops].sort(
      (first, second) =>
        first.order -
        second.order
    );

  const stopQueries =
    orderedStops.map(
      getGoogleMapsStopQuery
    );

  if (stopQueries.length === 0) {
    return null;
  }

  if (stopQueries.length === 1) {
    const parameters =
      new URLSearchParams({
        api: "1",
        query:
          stopQueries[0]
      });

    return (
      "https://www.google.com/maps/search/?" +
      parameters.toString()
    );
  }

  const parameters =
    new URLSearchParams({
      api: "1",
      origin:
        stopQueries[0],
      destination:
        stopQueries[
          stopQueries.length - 1
        ],
      travelmode:
        getGoogleMapsTravelMode(
          plan.transportation
        )
    });

  const waypoints =
    stopQueries.slice(
      1,
      -1
    );

  if (waypoints.length > 0) {
    parameters.set(
      "waypoints",
      waypoints.join("|")
    );
  }

  return (
    "https://www.google.com/maps/dir/?" +
    parameters.toString()
  );
}
