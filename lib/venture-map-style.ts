import type {
  StyleSpecification
} from "maplibre-gl";

function createRasterStyle():
  StyleSpecification {
  return {
    version: 8,

    sources: {
      "venture-base-map": {
        type: "raster",

        tiles: [
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        ],

        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,

        attribution:
          "© OpenStreetMap contributors"
      }
    },

    layers: [
      {
        id: "venture-base-map-layer",
        type: "raster",
        source: "venture-base-map",
        minzoom: 0,
        maxzoom: 19
      }
    ]
  };
}

export function getVentureMapStyle():
  string | StyleSpecification {
  const configuredStyle =
    process.env
      .NEXT_PUBLIC_MAP_STYLE_URL
      ?.trim();

  /*
   * Continue using a configured
   * production map provider later.
   * Ignore the plain MapLibre demo
   * style because it currently gives
   * Venture the blank purple canvas.
   */
  if (
    configuredStyle &&
    !configuredStyle.includes(
      "demotiles.maplibre.org"
    )
  ) {
    return configuredStyle;
  }

  return createRasterStyle();
}