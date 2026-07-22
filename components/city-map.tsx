"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  getVentureMapStyle
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
  isVisible?: boolean;
  onSelectListing?: (
    listing: Listing
  ) => void;
};

type MarkerRecord = {
  marker: maplibregl.Marker;
  popup: maplibregl.Popup;
  listing: Listing;
};

const WINNIPEG_CENTER: [
  number,
  number
] = [
  -97.1384,
  49.8951
];

function getListingKey(
  listing: Listing
): string {
  return `${listing.type}-${listing.id}`;
}

function getCoordinates(
  listing: Listing
): [number, number] | null {
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

  return [
    longitude,
    latitude
  ];
}

function getMarkerIcon(
  listing: Listing
): string {
  if (listing.type === "event") {
    return "🎟";
  }

  const text = `${listing.name} ${listing.category}`
    .toLowerCase();

  if (
    text.includes("bar") ||
    text.includes("pub") ||
    text.includes("cocktail") ||
    text.includes("brew")
  ) {
    return "🍸";
  }

  if (
    text.includes("cafe") ||
    text.includes("coffee") ||
    text.includes("bakery")
  ) {
    return "☕";
  }

  return "🍴";
}

function createPopupContent(
  listing: Listing
): HTMLDivElement {
  const popupContent =
    document.createElement("div");

  popupContent.className =
    styles.mapPopup;

  const eyebrow =
    document.createElement("span");

  eyebrow.textContent =
    listing.type === "event"
      ? "EVENT"
      : listing.category.toUpperCase();

  const heading =
    document.createElement("strong");

  heading.textContent =
    listing.name;

  const description =
    document.createElement("small");

  description.textContent =
    listing.neighbourhood ||
    listing.address ||
    "Winnipeg";

  popupContent.append(
    eyebrow,
    heading,
    description
  );

  return popupContent;
}

export function CityMap({
  listings = [],
  selectedListingKey = null,
  selectionVersion = 0,
  isVisible = true,
  onSelectListing
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

  const boundsRef =
    useRef<maplibregl.LngLatBounds | null>(
      null
    );

  const [
    mappedCount,
    setMappedCount
  ] = useState(0);

  const fitAll =
    useCallback(() => {
      const map = mapRef.current;
      const bounds = boundsRef.current;

      if (!map) {
        return;
      }

      if (!bounds || bounds.isEmpty()) {
        map.easeTo({
          center: WINNIPEG_CENTER,
          zoom: 10.5,
          duration: 450
        });
        return;
      }

      map.fitBounds(bounds, {
        padding: {
          top: 64,
          right: 42,
          bottom: 74,
          left: 42
        },
        maxZoom: 13,
        duration: 550
      });
    }, []);

  useEffect(() => {
    if (
      !mapContainerRef.current ||
      mapRef.current
    ) {
      return;
    }

    const mapStyle =
      getVentureMapStyle();

    const map =
      new maplibregl.Map({
        container:
          mapContainerRef.current,
        style: mapStyle,
        center: WINNIPEG_CENTER,
        zoom: 10.5,
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
        cooperativeGestures: true
      });

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        showZoom: true,
        visualizePitch: false
      }),
      "top-right"
    );

    mapRef.current = map;

    return () => {
      markersRef.current.forEach(
        ({
          marker,
          popup
        }) => {
          popup.remove();
          marker.remove();
        }
      );

      markersRef.current.clear();

      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const frame =
      window.requestAnimationFrame(() => {
        mapRef.current?.resize();
      });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isVisible]);

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
        ({
          marker,
          popup
        }) => {
          popup.remove();
          marker.remove();
        }
      );

      markersRef.current.clear();

      const bounds =
        new maplibregl.LngLatBounds();

      let markerCount = 0;

      for (const listing of listings) {
        const coordinates =
          getCoordinates(listing);

        if (!coordinates) {
          continue;
        }

        const listingKey =
          getListingKey(listing);

        const markerButton =
          document.createElement("button");

        markerButton.type = "button";
        markerButton.className =
          `${styles.mapMarker} ${
            listing.type === "event"
              ? styles.eventMarker
              : styles.placeMarker
          }`;

        const markerIcon =
          document.createElement("span");

        markerIcon.textContent =
          getMarkerIcon(listing);

        markerIcon.setAttribute(
          "aria-hidden",
          "true"
        );

        markerButton.append(
          markerIcon
        );

        markerButton.setAttribute(
          "aria-label",
          `Show ${listing.name}`
        );

        markerButton.addEventListener(
          "click",
          (event) => {
            event.stopPropagation();
            onSelectListing?.(listing);
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
              createPopupContent(listing)
            );

        const marker =
          new maplibregl.Marker({
            element: markerButton,
            anchor: "bottom"
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

      boundsRef.current =
        markerCount > 0
          ? bounds
          : null;

      setMappedCount(markerCount);
      fitAll();
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
    listings,
    onSelectListing
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
        ({
          marker,
          popup
        }) => {
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

      const {
        marker,
        popup
      } = selectedRecord;

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
        duration: 650,
        essential: true
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
    selectedListingKey,
    selectionVersion,
    listings
  ]);

  return (
    <div className={styles.mapShell}>
      <div
        ref={mapContainerRef}
        className={styles.cityMap}
        role="region"
        aria-label="Map of Winnipeg listings"
      />

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

      <button
        type="button"
        className={styles.fitMapButton}
        onClick={fitAll}
      >
        <span aria-hidden="true">⌗</span>
        Fit all
      </button>

      <div className={styles.mapCount}>
        {mappedCount} mapped
      </div>
    </div>
  );
}
