"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  getListingPoint,
  type GeoPoint,
  type MapBounds
} from "@/lib/explore-map-utils";

import {
  getVentureMapConfiguration
} from "@/lib/venture-map-style";

import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import type {
  Listing
} from "@/lib/types";

import styles from "@/app/explore/explore.module.css";

type CityMapProps = {
  listings?: Listing[];
  selectedListingKey?: string | null;
  selectionVersion?: number;
  fitVersion?: number;
  isVisible?: boolean;
  userLocation?: GeoPoint | null;
  onSelectListing?: (
    listing: Listing
  ) => void;
  onViewportChanged?: (
    bounds: MapBounds
  ) => void;
  onUserLocationChange?: (
    location: GeoPoint
  ) => void;
};

type MarkerRecord = {
  marker: maplibregl.Marker;
  popup: maplibregl.Popup;
  listing: Listing;
};

type MapStatus =
  | "loading"
  | "ready"
  | "error";

type LocationStatus =
  | "idle"
  | "locating"
  | "ready"
  | "error";

const WINNIPEG_CENTER: [
  number,
  number
] = [
  -97.1384,
  49.8951
];

function mapMotionDuration(
  duration: number
): number {
  if (typeof window === "undefined") {
    return duration;
  }

  return window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches
    ? 0
    : duration;
}

function getListingKey(
  listing: Listing
): string {
  return `${listing.type}-${listing.id}`;
}

function createPopupContent(
  listing: Listing,
  index: number
): HTMLDivElement {
  const popupContent =
    document.createElement("div");

  popupContent.className =
    styles.mapPopup;

  const eyebrow =
    document.createElement("span");

  eyebrow.textContent =
    `${index + 1} · ${
      listing.type === "event"
        ? "EVENT"
        : listing.category.toUpperCase()
    }`;

  const heading =
    document.createElement("strong");

  heading.textContent =
    listing.name;

  const description =
    document.createElement("small");

  description.textContent = [
    listing.neighbourhood ||
      listing.address ||
      "Winnipeg",
    listing.timeOrHours,
    listing.price
  ]
    .filter(Boolean)
    .join(" · ");

  popupContent.append(
    eyebrow,
    heading,
    description
  );

  return popupContent;
}

function getCurrentBounds(
  map: maplibregl.Map
): MapBounds {
  const bounds = map.getBounds();

  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest()
  };
}

export function CityMap({
  listings = [],
  selectedListingKey = null,
  selectionVersion = 0,
  fitVersion = 0,
  isVisible = true,
  userLocation = null,
  onSelectListing,
  onViewportChanged,
  onUserLocationChange
}: CityMapProps) {
  const mapContainerRef =
    useRef<HTMLDivElement>(null);

  const mapRef =
    useRef<maplibregl.Map | null>(
      null
    );

  const markersRef =
    useRef<
      Map<string, MarkerRecord>
    >(new Map());

  const userMarkerRef =
    useRef<maplibregl.Marker | null>(
      null
    );

  const boundsRef =
    useRef<maplibregl.LngLatBounds | null>(
      null
    );

  const lastFitVersionRef =
    useRef(-1);

  const userMovedMapRef =
    useRef(false);

  const [mappedCount, setMappedCount] =
    useState(0);

  const [mapStatus, setMapStatus] =
    useState<MapStatus>("loading");

  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("idle");

  const [locationMessage, setLocationMessage] =
    useState("");

  const [retryVersion, setRetryVersion] =
    useState(0);

  const fitAll =
    useCallback(() => {
      const map = mapRef.current;
      const bounds = boundsRef.current;

      if (!map) {
        return;
      }

      map.resize();

      if (!bounds || bounds.isEmpty()) {
        map.easeTo({
          center: WINNIPEG_CENTER,
          zoom: 10.5,
          duration:
            mapMotionDuration(450),
          essential: false
        });
        return;
      }

      map.fitBounds(bounds, {
        padding: {
          top: 78,
          right: 48,
          bottom: 100,
          left: 48
        },
        maxZoom: 13.5,
        duration:
          mapMotionDuration(550),
        essential: false
      });
    }, []);

  const locateUser =
    useCallback(() => {
      if (
        typeof navigator === "undefined" ||
        !navigator.geolocation
      ) {
        setLocationStatus("error");
        setLocationMessage(
          "Location is not available on this device."
        );
        return;
      }

      setLocationStatus("locating");
      setLocationMessage(
        "Finding your location..."
      );

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = {
            latitude:
              position.coords.latitude,
            longitude:
              position.coords.longitude
          };

          setLocationStatus("ready");
          setLocationMessage(
            "Showing distance from you."
          );

          onUserLocationChange?.(
            nextLocation
          );

          mapRef.current?.flyTo({
            center: [
              nextLocation.longitude,
              nextLocation.latitude
            ],
            zoom: Math.max(
              mapRef.current?.getZoom() ??
                12,
              13
            ),
            duration:
              mapMotionDuration(650),
            essential: false
          });
        },
        (error) => {
          setLocationStatus("error");

          if (
            error.code ===
            error.PERMISSION_DENIED
          ) {
            setLocationMessage(
              "Location permission was not granted."
            );
          } else {
            setLocationMessage(
              "Venture could not find your location."
            );
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    }, [onUserLocationChange]);

  useEffect(() => {
    const container =
      mapContainerRef.current;

    if (!container) {
      return;
    }

    setMapStatus("loading");

    const mapConfiguration =
      getVentureMapConfiguration();

    const map =
      new maplibregl.Map({
        container,
        style:
          mapConfiguration.style,
        center: WINNIPEG_CENTER,
        zoom: 10.5,
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
        cooperativeGestures: true,
        attributionControl: false
      });

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        showZoom: true,
        visualizePitch: false
      }),
      "top-right"
    );

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true
      }),
      "bottom-right"
    );

    mapRef.current = map;

    let mapReady = false;

    const loadTimeout =
      window.setTimeout(() => {
        if (!mapReady) {
          setMapStatus("error");
        }
      }, 12000);

    const handleLoad = () => {
      mapReady = true;
      window.clearTimeout(
        loadTimeout
      );
      map.resize();
      setMapStatus("ready");
    };

    const handleError = (
      event: maplibregl.ErrorEvent
    ) => {
      console.error(
        "Venture Explore map error",
        event.error
      );

      if (!mapReady) {
        setMapStatus("error");
      }
    };

    const handleMoveStart = (
      event: unknown
    ) => {
      const originalEvent =
        (
          event as {
            originalEvent?: Event;
          }
        ).originalEvent;

      if (originalEvent) {
        userMovedMapRef.current =
          true;
      }
    };

    const handleMoveEnd = () => {
      if (
        !userMovedMapRef.current
      ) {
        return;
      }

      userMovedMapRef.current = false;
      onViewportChanged?.(
        getCurrentBounds(map)
      );
    };

    map.on("load", handleLoad);
    map.on("error", handleError);
    map.on("movestart", handleMoveStart);
    map.on("moveend", handleMoveEnd);

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

      markersRef.current.forEach(
        ({ marker, popup }) => {
          popup.remove();
          marker.remove();
        }
      );

      markersRef.current.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;

      map.off("load", handleLoad);
      map.off("error", handleError);
      map.off(
        "movestart",
        handleMoveStart
      );
      map.off("moveend", handleMoveEnd);
      map.remove();
      mapRef.current = null;
    };
  }, [
    onViewportChanged,
    retryVersion
  ]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const firstFrame =
      window.requestAnimationFrame(() => {
        mapRef.current?.resize();

        window.setTimeout(() => {
          mapRef.current?.resize();

          if (
            lastFitVersionRef.current < 0
          ) {
            fitAll();
          }
        }, 120);
      });

    return () => {
      window.cancelAnimationFrame(
        firstFrame
      );
    };
  }, [fitAll, isVisible]);

  useEffect(() => {
    const currentMap =
      mapRef.current;

    if (!currentMap) {
      return;
    }

    const activeMap:
      maplibregl.Map = currentMap;

    function displayMarkers() {
      markersRef.current.forEach(
        ({ marker, popup }) => {
          popup.remove();
          marker.remove();
        }
      );

      markersRef.current.clear();

      const bounds =
        new maplibregl.LngLatBounds();

      let markerCount = 0;

      listings.forEach(
        (listing, index) => {
          const point =
            getListingPoint(listing);

          if (!point) {
            return;
          }

          const coordinates: [
            number,
            number
          ] = [
            point.longitude,
            point.latitude
          ];

          const listingKey =
            getListingKey(listing);

          const markerButton =
            document.createElement(
              "button"
            );

          markerButton.type = "button";
          markerButton.draggable = false;
          markerButton.className =
            `${styles.mapMarker} ${
              listing.type === "event"
                ? styles.eventMarker
                : styles.placeMarker
            }`;

          const markerNumber =
            document.createElement(
              "span"
            );

          markerNumber.textContent =
            String(index + 1);

          markerNumber.setAttribute(
            "aria-hidden",
            "true"
          );

          markerButton.append(
            markerNumber
          );

          markerButton.setAttribute(
            "aria-label",
            `${index + 1}. Show ${listing.name}`
          );

          markerButton.addEventListener(
            "click",
            (event) => {
              event.stopPropagation();
              onSelectListing?.(
                listing
              );
            }
          );

          const popup =
            new maplibregl.Popup({
              offset: 24,
              closeButton: false,
              closeOnClick: false,
              className:
                styles.mapPopupShell
            })
              .setLngLat(coordinates)
              .setDOMContent(
                createPopupContent(
                  listing,
                  index
                )
              );

          const marker =
            new maplibregl.Marker({
              element: markerButton,
              anchor: "bottom",
              draggable: false
            })
              .setLngLat(coordinates)
              .addTo(activeMap);

          markersRef.current.set(
            listingKey,
            {
              marker,
              popup,
              listing
            }
          );

          bounds.extend(coordinates);
          markerCount += 1;
        }
      );

      boundsRef.current =
        markerCount > 0
          ? bounds
          : null;

      setMappedCount(markerCount);

      if (
        lastFitVersionRef.current !==
        fitVersion
      ) {
        lastFitVersionRef.current =
          fitVersion;

        window.setTimeout(
          fitAll,
          80
        );
      }
    }

    if (activeMap.loaded()) {
      displayMarkers();
    } else {
      activeMap.once(
        "load",
        displayMarkers
      );
    }

    return () => {
      activeMap.off(
        "load",
        displayMarkers
      );
    };
  }, [
    fitAll,
    fitVersion,
    listings,
    onSelectListing,
    retryVersion
  ]);

  useEffect(() => {
    const currentMap =
      mapRef.current;

    if (!currentMap) {
      return;
    }

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    if (!userLocation) {
      return;
    }

    const element =
      document.createElement("div");

    element.className =
      styles.userLocationMarker;

    element.setAttribute(
      "aria-label",
      "Your location"
    );

    const dot =
      document.createElement("span");

    element.append(dot);

    userMarkerRef.current =
      new maplibregl.Marker({
        element,
        anchor: "center"
      })
        .setLngLat([
          userLocation.longitude,
          userLocation.latitude
        ])
        .addTo(currentMap);

    return () => {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
    };
  }, [
    retryVersion,
    userLocation
  ]);

  useEffect(() => {
    const currentMap =
      mapRef.current;

    if (!currentMap) {
      return;
    }

    const activeMap:
      maplibregl.Map = currentMap;

    function updateSelection() {
      markersRef.current.forEach(
        ({ marker, popup }) => {
          marker
            .getElement()
            .classList.remove(
              styles.selectedMarker
            );

          popup.remove();
        }
      );

      if (!selectedListingKey) {
        return;
      }

      const selectedRecord =
        markersRef.current.get(
          selectedListingKey
        );

      if (!selectedRecord) {
        return;
      }

      const { marker, popup } =
        selectedRecord;

      marker
        .getElement()
        .classList.add(
          styles.selectedMarker
        );

      popup
        .setLngLat(
          marker.getLngLat()
        )
        .addTo(activeMap);

      activeMap.flyTo({
        center: marker.getLngLat(),
        zoom: Math.max(
          activeMap.getZoom(),
          14
        ),
        duration:
          mapMotionDuration(650),
        essential: false
      });
    }

    if (activeMap.loaded()) {
      updateSelection();
    } else {
      activeMap.once(
        "load",
        updateSelection
      );
    }

    return () => {
      activeMap.off(
        "load",
        updateSelection
      );
    };
  }, [
    listings,
    retryVersion,
    selectedListingKey,
    selectionVersion
  ]);

  return (
    <div className={styles.mapShell}>
      <p
        id="venture-map-description"
        className="sr-only"
      >
        Interactive map of the listings in the current results. Every mapped place is also available in the listing cards below the map.
      </p>

      <div
        ref={mapContainerRef}
        className={styles.cityMap}
        role="region"
        aria-label="Map of Winnipeg listings"
        aria-describedby="venture-map-description"
      />

      {mapStatus !== "ready" ? (
        <div
          className={`${styles.mapStatus} ${
            mapStatus === "error"
              ? styles.mapStatusError
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
              ? "The map could not load"
              : "Loading Winnipeg map"}
          </strong>

          <small>
            {mapStatus === "error"
              ? "Check your connection, then try again. The listings below still work."
              : "Bringing the streets and listings into view."}
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

      <div className={styles.mapLegend}>
        <span>
          <i className={styles.legendEvent} />
          Events
        </span>

        <span>
          <i className={styles.legendPlace} />
          Places
        </span>
      </div>

      <div className={styles.mapControlStack}>
        <button
          type="button"
          className={styles.fitMapButton}
          onClick={fitAll}
          disabled={mapStatus !== "ready"}
        >
          <span aria-hidden="true">⌗</span>
          Fit all
        </button>

        <button
          type="button"
          className={`${styles.locateMapButton} ${
            locationStatus === "ready"
              ? styles.locateMapButtonActive
              : ""
          }`}
          onClick={locateUser}
          disabled={
            mapStatus !== "ready" ||
            locationStatus === "locating"
          }
        >
          <span aria-hidden="true">◎</span>
          {locationStatus === "locating"
            ? "Locating"
            : locationStatus === "ready"
              ? "Near me"
              : "Use my location"}
        </button>
      </div>

      {locationMessage ? (
        <div
          className={`${styles.locationMessage} ${
            locationStatus === "error"
              ? styles.locationMessageError
              : ""
          }`}
          role="status"
        >
          {locationMessage}
        </div>
      ) : null}

      <div className={styles.mapCount}>
        {mappedCount} mapped
      </div>
    </div>
  );
}
