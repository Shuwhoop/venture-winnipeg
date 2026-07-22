"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  buildGoogleMapsRouteUrl
} from "@/lib/google-maps-route";

import {
  getVentureMapConfiguration
} from "@/lib/venture-map-style";

import type {
  GeneratedOutingPlan
} from "@/lib/saved-outings";

type OutingRouteMapProps = {
  plan: GeneratedOutingPlan;
};

type CoordinateStop = {
  stop:
    GeneratedOutingPlan["stops"][number];
  latitude: number;
  longitude: number;
};

type MapStatus =
  | "loading"
  | "ready"
  | "error";

const WINNIPEG_CENTER: [
  number,
  number
] = [
  -97.1384,
  49.8951
];

function createPopupContent(
  coordinateStop: CoordinateStop
): HTMLDivElement {
  const { stop } =
    coordinateStop;

  const popup =
    document.createElement(
      "div"
    );

  popup.className =
    "venture-map-popup";

  const order =
    document.createElement(
      "span"
    );

  order.textContent =
    `Stop ${stop.order}`;

  const heading =
    document.createElement(
      "strong"
    );

  heading.textContent =
    stop.listing.name;

  const time =
    document.createElement(
      "small"
    );

  time.textContent =
    `${stop.startTime}–${stop.endTime}`;

  const link =
    document.createElement(
      "a"
    );

  link.href =
    `/listings/${stop.listing.slug}`;

  link.textContent =
    "View details";

  popup.append(
    order,
    heading,
    time,
    link
  );

  return popup;
}

function getStopIcon(
  stop:
    GeneratedOutingPlan["stops"][number]
): string {
  if (
    stop.kind === "event" ||
    stop.listing.type === "event"
  ) {
    return "🎟";
  }

  if (stop.kind === "drinks") {
    return "🍸";
  }

  return "🍽";
}

function getStopKindLabel(
  stop:
    GeneratedOutingPlan["stops"][number]
): string {
  if (
    stop.kind === "event" ||
    stop.listing.type === "event"
  ) {
    return "Event";
  }

  if (stop.kind === "drinks") {
    return "Drinks";
  }

  return "Food";
}

function getStopKindClassName(
  stop:
    GeneratedOutingPlan["stops"][number]
): string {
  if (
    stop.kind === "event" ||
    stop.listing.type === "event"
  ) {
    return "event";
  }

  if (stop.kind === "drinks") {
    return "drinks";
  }

  return "food";
}

export function OutingRouteMap({
  plan
}: OutingRouteMapProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const mapRef =
    useRef<maplibregl.Map | null>(
      null
    );

  const [
    mapStatus,
    setMapStatus
  ] = useState<MapStatus>(
    "loading"
  );

  const [
    retryVersion,
    setRetryVersion
  ] = useState(0);

  const orderedStops =
    useMemo(
      () =>
        [...plan.stops].sort(
          (first, second) =>
            first.order -
            second.order
        ),
      [plan.stops]
    );

  const coordinateStops =
    useMemo<CoordinateStop[]>(
      () =>
        orderedStops.flatMap(
          (stop) => {
            const latitude =
              Number(
                stop.listing
                  .latitude
              );

            const longitude =
              Number(
                stop.listing
                  .longitude
              );

            if (
              !Number.isFinite(
                latitude
              ) ||
              !Number.isFinite(
                longitude
              )
            ) {
              return [];
            }

            return [
              {
                stop,
                latitude,
                longitude
              }
            ];
          }
        ),
      [orderedStops]
    );

  const googleMapsUrl =
    useMemo(
      () =>
        buildGoogleMapsRouteUrl(
          plan
        ),
      [plan]
    );

  useEffect(() => {
    const container =
      containerRef.current;

    if (
      !container ||
      coordinateStops.length === 0
    ) {
      return;
    }

    setMapStatus("loading");

    const mapConfiguration =
      getVentureMapConfiguration();

    const firstStop =
      coordinateStops[0];

    const map =
      new maplibregl.Map({
        container,
        style:
          mapConfiguration.style,
        center:
          firstStop
            ? [
                firstStop.longitude,
                firstStop.latitude
              ]
            : WINNIPEG_CENTER,
        zoom:
          coordinateStops.length === 1
            ? 13
            : 11,
        dragRotate: false,
        pitchWithRotate: false,
        cooperativeGestures: true,
        attributionControl: false
      });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        showZoom: true
      }),
      "top-right"
    );

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true
      }),
      "bottom-right"
    );

    const bounds =
      new maplibregl.LngLatBounds();

    const markers:
      maplibregl.Marker[] = [];

    for (
      const coordinateStop
      of coordinateStops
    ) {
      const element =
        document.createElement(
          "button"
        );

      element.type = "button";
      element.className =
        "outing-route-marker";

      element.textContent =
        String(
          coordinateStop.stop.order
        );

      element.setAttribute(
        "aria-label",
        `Stop ${coordinateStop.stop.order}: ${coordinateStop.stop.listing.name}`
      );

      const popup =
        new maplibregl.Popup({
          offset: 24,
          closeButton: false,
          closeOnClick: true
        }).setDOMContent(
          createPopupContent(
            coordinateStop
          )
        );

      const marker =
        new maplibregl.Marker({
          element,
          anchor: "bottom"
        })
          .setLngLat([
            coordinateStop.longitude,
            coordinateStop.latitude
          ])
          .setPopup(popup)
          .addTo(map);

      markers.push(marker);

      bounds.extend([
        coordinateStop.longitude,
        coordinateStop.latitude
      ]);
    }

    let mapReady = false;

    const loadTimeout =
      window.setTimeout(() => {
        if (!mapReady) {
          setMapStatus("error");
        }
      }, 12000);

    const fitRoute = () => {
      map.resize();

      if (coordinateStops.length === 1) {
        map.easeTo({
          center: [
            coordinateStops[0].longitude,
            coordinateStops[0].latitude
          ],
          zoom: 14,
          duration: 500
        });
        return;
      }

      map.fitBounds(bounds, {
        padding: {
          top: 66,
          right: 54,
          bottom: 72,
          left: 54
        },
        maxZoom: 14,
        duration: 700
      });
    };

    const handleLoad = () => {
      mapReady = true;
      window.clearTimeout(
        loadTimeout
      );

      if (coordinateStops.length > 1) {
        const coordinates =
          coordinateStops.map(
            (coordinateStop) => [
              coordinateStop.longitude,
              coordinateStop.latitude
            ]
          );

        map.addSource(
          "venture-outing-route",
          {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates
              }
            }
          }
        );

        map.addLayer({
          id:
            "venture-outing-route-halo",
          type: "line",
          source:
            "venture-outing-route",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": "#ffcf00",
            "line-width": 10,
            "line-opacity": 0.82
          }
        });

        map.addLayer({
          id:
            "venture-outing-route-line",
          type: "line",
          source:
            "venture-outing-route",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": "#d01013",
            "line-width": 4,
            "line-opacity": 0.96,
            "line-dasharray": [
              1.2,
              1.1
            ]
          }
        });
      }

      window.requestAnimationFrame(
        () => {
          fitRoute();
          setMapStatus("ready");
        }
      );
    };

    const handleError = (
      event: maplibregl.ErrorEvent
    ) => {
      console.error(
        "Venture outing map error",
        event.error
      );

      if (!mapReady) {
        setMapStatus("error");
      }
    };

    map.on("load", handleLoad);
    map.on("error", handleError);

    const resizeObserver =
      new ResizeObserver(() => {
        map.resize();
      });

    resizeObserver.observe(container);

    const resizeFrame =
      window.requestAnimationFrame(
        () => map.resize()
      );

    return () => {
      window.clearTimeout(
        loadTimeout
      );
      window.cancelAnimationFrame(
        resizeFrame
      );
      resizeObserver.disconnect();
      map.off("load", handleLoad);
      map.off("error", handleError);

      markers.forEach(
        (marker) => marker.remove()
      );

      map.remove();
      mapRef.current = null;
    };
  }, [
    coordinateStops,
    retryVersion
  ]);

  return (
    <section className="outing-route-panel outing-route-panel-featured">
      <div className="outing-route-heading">
        <div>
          <span>
            START WITH THE MAP
          </span>

          <h2>
            Your route at a glance
          </h2>

          <p>
            Tap a numbered marker to
            preview each stop.
          </p>
        </div>

        {googleMapsUrl ? (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span aria-hidden="true">
              G
            </span>
            Open full route in Google Maps
            <b aria-hidden="true">
              ↗
            </b>
          </a>
        ) : null}
      </div>

      <div className="outing-map-stop-strip">
        {orderedStops.map(
          (stop) => {
            const kindClassName =
              getStopKindClassName(
                stop
              );

            return (
              <article
                className={`outing-map-stop-pill outing-map-stop-pill-${kindClassName}`}
                key={`${stop.listing.type}-${stop.listing.id}-${stop.order}`}
              >
                <b>{stop.order}</b>

                <i aria-hidden="true">
                  {getStopIcon(stop)}
                </i>

                <div>
                  <strong>
                    {stop.listing.name}
                  </strong>

                  <small>
                    {getStopKindLabel(
                      stop
                    )}
                    {stop.listing.neighbourhood
                      ? ` • ${stop.listing.neighbourhood}`
                      : ""}
                  </small>
                </div>
              </article>
            );
          }
        )}
      </div>

      {coordinateStops.length > 0 ? (
        <div className="outing-route-map-shell">
          <div
            ref={containerRef}
            className="outing-route-map outing-route-map-featured"
            role="region"
            aria-label="Map showing the generated outing route"
          />

          {mapStatus !== "ready" ? (
            <div
              className={`outing-route-map-status ${
                mapStatus === "error"
                  ? "error"
                  : ""
              }`}
              role={
                mapStatus === "error"
                  ? "alert"
                  : "status"
              }
            >
              <span aria-hidden="true">
                {mapStatus === "error"
                  ? "🗺"
                  : "⌖"}
              </span>

              <strong>
                {mapStatus === "error"
                  ? "The route map could not load"
                  : "Loading your route map"}
              </strong>

              <small>
                {mapStatus === "error"
                  ? "Your itinerary is still available below. Check your connection and retry."
                  : "Adding streets, stops, and route order."}
              </small>

              {mapStatus === "error" ? (
                <button
                  type="button"
                  onClick={() =>
                    setRetryVersion(
                      (current) =>
                        current + 1
                    )
                  }
                >
                  Retry map
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="outing-route-unavailable">
          <span aria-hidden="true">
            ◉
          </span>

          <p>
            A route preview is not
            available because these
            listings do not all have
            confirmed coordinates.
          </p>
        </div>
      )}

      <p className="outing-route-note">
        Venture shows the outing order.
        Google Maps calculates live
        streets, transit, and traffic.
      </p>
    </section>
  );
}
