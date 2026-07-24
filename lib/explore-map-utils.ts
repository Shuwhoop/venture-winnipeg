import type {
  Listing
} from "@/lib/types";

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type ListingProximity = {
  distanceKilometres: number;
  distanceLabel: string;
  travelLabel: string;
};

const EARTH_RADIUS_KM = 6371;

function toRadians(
  value: number
): number {
  return value * Math.PI / 180;
}

export function getListingPoint(
  listing: Listing
): GeoPoint | null {
  const latitude =
    Number(listing.latitude);

  const longitude =
    Number(listing.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    latitude,
    longitude
  };
}

export function listingIsInsideBounds(
  listing: Listing,
  bounds: MapBounds
): boolean {
  const point =
    getListingPoint(listing);

  if (!point) {
    return false;
  }

  const insideLatitude =
    point.latitude >= bounds.south &&
    point.latitude <= bounds.north;

  const insideLongitude =
    bounds.west <= bounds.east
      ? point.longitude >= bounds.west &&
        point.longitude <= bounds.east
      : point.longitude >= bounds.west ||
        point.longitude <= bounds.east;

  return (
    insideLatitude &&
    insideLongitude
  );
}

export function getDistanceKilometres(
  first: GeoPoint,
  second: GeoPoint
): number {
  const latitudeDelta =
    toRadians(
      second.latitude -
        first.latitude
    );

  const longitudeDelta =
    toRadians(
      second.longitude -
        first.longitude
    );

  const firstLatitude =
    toRadians(first.latitude);

  const secondLatitude =
    toRadians(second.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine)
    );

  return (
    EARTH_RADIUS_KM *
    angularDistance
  );
}

function formatDistance(
  distanceKilometres: number
): string {
  if (distanceKilometres < 1) {
    return `${Math.max(
      50,
      Math.round(
        distanceKilometres *
          1000 / 50
      ) * 50
    )} m away`;
  }

  return `${distanceKilometres.toFixed(
    distanceKilometres < 10
      ? 1
      : 0
  )} km away`;
}

function estimateTravelLabel(
  distanceKilometres: number
): string {
  if (distanceKilometres <= 1.6) {
    const walkingMinutes =
      Math.max(
        3,
        Math.round(
          distanceKilometres /
            4.8 *
            60
        )
      );

    return `≈ ${walkingMinutes} min walk`;
  }

  const drivingMinutes =
    Math.max(
      5,
      Math.round(
        distanceKilometres /
          28 *
          60 +
          3
      )
    );

  return `≈ ${drivingMinutes} min drive`;
}

export function getListingProximity(
  listing: Listing,
  userLocation: GeoPoint | null
): ListingProximity | null {
  if (!userLocation) {
    return null;
  }

  const listingPoint =
    getListingPoint(listing);

  if (!listingPoint) {
    return null;
  }

  const distanceKilometres =
    getDistanceKilometres(
      userLocation,
      listingPoint
    );

  return {
    distanceKilometres,
    distanceLabel:
      formatDistance(
        distanceKilometres
      ),
    travelLabel:
      estimateTravelLabel(
        distanceKilometres
      )
  };
}

export function mapBoundsAreNearlyEqual(
  first: MapBounds | null,
  second: MapBounds | null
): boolean {
  if (!first || !second) {
    return first === second;
  }

  const tolerance = 0.0008;

  return (
    Math.abs(
      first.north - second.north
    ) < tolerance &&
    Math.abs(
      first.south - second.south
    ) < tolerance &&
    Math.abs(
      first.east - second.east
    ) < tolerance &&
    Math.abs(
      first.west - second.west
    ) < tolerance
  );
}
