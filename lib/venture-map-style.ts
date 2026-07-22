import type {
  StyleSpecification
} from "maplibre-gl";

const OPEN_FREE_MAP_STYLE =
  "https://tiles.openfreemap.org/styles/positron";

function createMapTilerStyleUrl(
  key: string
): string {
  return (
    "https://api.maptiler.com/maps/streets-v4/style.json?key=" +
    encodeURIComponent(key)
  );
}

export type VentureMapConfiguration = {
  style: string | StyleSpecification;
  provider: "configured" | "maptiler" | "openfreemap";
};

export function getVentureMapConfiguration():
  VentureMapConfiguration {
  const configuredStyle =
    process.env
      .NEXT_PUBLIC_MAP_STYLE_URL
      ?.trim();

  if (configuredStyle) {
    return {
      style: configuredStyle,
      provider: "configured"
    };
  }

  const mapTilerKey =
    process.env
      .NEXT_PUBLIC_MAPTILER_KEY
      ?.trim();

  if (mapTilerKey) {
    return {
      style:
        createMapTilerStyleUrl(
          mapTilerKey
        ),
      provider: "maptiler"
    };
  }

  /*
   * OpenFreeMap provides a MapLibre-compatible
   * vector style and is not the public OSM raster
   * tile service. It keeps local development and
   * early beta maps functional without a secret.
   * Venture can switch to a contracted provider by
   * setting NEXT_PUBLIC_MAP_STYLE_URL or
   * NEXT_PUBLIC_MAPTILER_KEY.
   */
  return {
    style: OPEN_FREE_MAP_STYLE,
    provider: "openfreemap"
  };
}

export function getVentureMapStyle():
  string | StyleSpecification {
  return getVentureMapConfiguration().style;
}
