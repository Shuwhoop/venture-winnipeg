"use client";

import {
  useEffect,
  useMemo,
  useRef
} from "react";

import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  getVentureMapStyle
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
  const {
    stop
  } = coordinateStop;

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

function getGoogleMapsTravelMode(
  transportation: string
): string {
  const normalized =
    transportation
      .trim()
      .toLowerCase();

  if (
    normalized === "walking"
  ) {
    return "walking";
  }

  if (
    normalized === "transit"
  ) {
    return "transit";
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

function buildGoogleMapsUrl(
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

  if (
    stopQueries.length === 0
  ) {
    return null;
  }

  if (
    stopQueries.length === 1
  ) {
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

  if (
    waypoints.length > 0
  ) {
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

function getStopIcon(
  stop:
    GeneratedOutingPlan["stops"][number]
): string {
  if (
    stop.kind === "event" ||
    stop.listing.type ===
      "event"
  ) {
    return "🎟";
  }

  if (
    stop.kind === "drinks"
  ) {
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
    stop.listing.type ===
      "event"
  ) {
    return "Event";
  }

  if (
    stop.kind === "drinks"
  ) {
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
    stop.listing.type ===
      "event"
  ) {
    return "event";
  }

  if (
    stop.kind === "drinks"
  ) {
    return "drinks";
  }

  return "food";
}

export function OutingRouteMap({
  plan
}: OutingRouteMapProps) {
  const containerRef =
    useRef<HTMLDivElement>(
      null
    );

  const mapRef =
    useRef<maplibregl.Map | null>(
      null
    );

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
        buildGoogleMapsUrl(
          plan
        ),
      [plan]
    );

  useEffect(() => {
    if (
      !containerRef.current
    ) {
      return;
    }

    if (
      coordinateStops.length === 0
    ) {
      return;
    }

    const mapStyle =
      getVentureMapStyle();

    const firstStop =
      coordinateStops[0];

    const map =
      new maplibregl.Map({
        container:
          containerRef.current,
        style:
          mapStyle,
        center:
          firstStop
            ? [
                firstStop.longitude,
                firstStop.latitude
              ]
            : WINNIPEG_CENTER,
        zoom:
          coordinateStops.length ===
          1
            ? 13
            : 11
      });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true
      }),
      "top-right"
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

      element.type =
        "button";

      element.className =
        "outing-route-marker";

      element.textContent =
        String(
          coordinateStop
            .stop
            .order
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

    map.once(
      "load",
      () => {
        if (
          coordinateStops.length >
          1
        ) {
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
              "line-color":
                "#ffcf00",
              "line-width": 10,
              "line-opacity": 0.8
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
              "line-color":
                "#d01013",
              "line-width": 4,
              "line-opacity": 0.95,
              "line-dasharray": [
                1.2,
                1.1
              ]
            }
          });

          map.fitBounds(
            bounds,
            {
              padding: 58,
              maxZoom: 14,
              duration: 700
            }
          );
        }
      }
    );

    return () => {
      markers.forEach(
        (marker) =>
          marker.remove()
      );

      map.remove();
      mapRef.current =
        null;
    };
  }, [coordinateStops]);

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
            Open route
            <span aria-hidden="true">
              ↗
            </span>
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
                <b>
                  {stop.order}
                </b>

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

      {coordinateStops.length >
      0 ? (
        <div
          ref={containerRef}
          className="outing-route-map outing-route-map-featured"
          role="region"
          aria-label="Map showing the generated outing route"
        />
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
