import type {
  StyleSpecification
} from "maplibre-gl";

function createDevelopmentFallbackStyle():
  StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "venture-map-background",
        type: "background",
        paint: {
          "background-color":
            "#efeae4"
        }
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

  if (configuredStyle) {
    return configuredStyle;
  }

  /*
   * Never fall back to the public
   * OpenStreetMap tile servers.
   * Venture must use a licensed
   * MapLibre-compatible provider.
   */
  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    throw new Error(
      "NEXT_PUBLIC_MAP_STYLE_URL is required in production."
    );
  }

  return createDevelopmentFallbackStyle();
}
