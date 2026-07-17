"use client";

import {
  useEffect,
  useRef
} from "react";
import {
  getVentureMapStyle
} from "@/lib/venture-map-style";
import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import type {
  Listing
} from "@/lib/types";

type CityMapProps = {
  listings?: Listing[];
  selectedListingKey?: string | null;
  selectionVersion?: number;
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

function createPopupContent(
  listing: Listing
): HTMLDivElement {
  const popupContent =
    document.createElement("div");

  popupContent.className =
    "venture-map-popup";

  const heading =
    document.createElement("strong");

  heading.textContent =
    listing.name;

  const description =
    document.createElement("span");

  description.textContent =
    listing.subtitle;

  const detailsLink =
    document.createElement("a");

  detailsLink.href =
    `/listings/${listing.slug}`;

  detailsLink.textContent =
    "View details";

  popupContent.append(
    heading,
    description,
    detailsLink
  );

  return popupContent;
}

export function CityMap({
  listings = [],
  selectedListingKey = null,
  selectionVersion = 0,
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
        zoom: 10.5
      });

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true
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
    const currentMap =
      mapRef.current;

    if (!currentMap) {
      return;
    }

    const activeMap:
      maplibregl.Map =
        currentMap;

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

      for (
        const listing
        of listings
      ) {
        const coordinates =
          getCoordinates(listing);

        if (!coordinates) {
          continue;
        }

        const listingKey =
          getListingKey(listing);

        const markerColor =
          listing.type === "event"
            ? "#7c3aed"
            : "#169447";

        const popup =
          new maplibregl.Popup({
            offset: 28,
            closeButton: false,
            closeOnClick: false
          })
            .setLngLat(coordinates)
            .setDOMContent(
              createPopupContent(
                listing
              )
            );

        const marker =
          new maplibregl.Marker({
            color: markerColor
          })
            .setLngLat(coordinates)
            .addTo(activeMap);

        const markerElement =
          marker.getElement();

        markerElement.setAttribute(
          "role",
          "button"
        );

        markerElement.setAttribute(
          "aria-label",
          `Show ${listing.name}`
        );

        markerElement.tabIndex = 0;

        markerElement.addEventListener(
          "click",
          (event) => {
            event.stopPropagation();

            onSelectListing?.(
              listing
            );
          }
        );

        markerElement.addEventListener(
          "keydown",
          (event) => {
            if (
              event.key !== "Enter" &&
              event.key !== " "
            ) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            onSelectListing?.(
              listing
            );
          }
        );

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

      if (markerCount === 1) {
        activeMap.easeTo({
          center:
            bounds.getCenter(),
          zoom: 13,
          duration: 600
        });
      }

      if (markerCount > 1) {
        activeMap.fitBounds(
          bounds,
          {
            padding: 55,
            maxZoom: 13,
            duration: 600
          }
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
      maplibregl.Map =
        currentMap;

    function updateSelection() {
      markersRef.current.forEach(
        ({
          marker,
          popup
        }) => {
          marker
            .getElement()
            .classList.remove(
              "venture-marker-selected"
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
          "venture-marker-selected"
        );

      popup
        .setLngLat(
          marker.getLngLat()
        )
        .addTo(activeMap);

      activeMap.flyTo({
        center:
          marker.getLngLat(),
        zoom: 14,
        duration: 700,
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
    <div
      ref={mapContainerRef}
      className="city-map"
      role="region"
      aria-label="Map of Winnipeg listings"
    />
  );
}