"use client";

import {
  useEffect,
  useRef,
  useState
} from "react";

import maplibregl from "maplibre-gl";

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

type MappableListing = Listing & {
  latitude: number;
  longitude: number;
};

function getListingKey(
  listing: Listing
): string {
  return `${listing.type}-${listing.id}`;
}

function hasCoordinates(
  listing: Listing
): listing is MappableListing {
  return (
    typeof listing.latitude ===
      "number" &&
    Number.isFinite(
      listing.latitude
    ) &&
    typeof listing.longitude ===
      "number" &&
    Number.isFinite(
      listing.longitude
    )
  );
}

function createPopupContent(
  listing: Listing
): HTMLElement {
  const container =
    document.createElement("div");

  container.className =
    "venture-map-popup";

  const title =
    document.createElement("strong");

  title.textContent = listing.name;

  const description =
    document.createElement("span");

  description.textContent =
    listing.subtitle;

  const link =
    document.createElement("a");

  link.href =
    `/listings/${listing.slug}`;

  link.textContent = "View listing";

  container.append(
    title,
    description,
    link
  );

  return container;
}

export function CityMap({
  listings = [],
  selectedListingKey = null,
  selectionVersion = 0,
  onSelectListing
}: CityMapProps) {
  const ref =
    useRef<HTMLDivElement>(null);

  const mapRef =
    useRef<maplibregl.Map | null>(
      null
    );

  const markerRefs = useRef(
    new Map<
      string,
      maplibregl.Marker
    >()
  );

  const listingRefs = useRef(
    new Map<
      string,
      MappableListing
    >()
  );

  const [
    message,
    setMessage
  ] = useState<string | null>(
    null
  );

useEffect(() => {
  const currentMap = mapRef.current;

  if (!currentMap) {
    return;
  }

  const activeMap: maplibregl.Map =
    currentMap;

  if (!selectedListingKey) {
    markerRefs.current.forEach(
      (marker) => {
        marker
          .getElement()
          .classList.remove(
            "venture-marker-selected"
          );

        marker
          .getPopup()
          ?.remove();
      }
    );

    return;
  }

  const activeListingKey: string =
    selectedListingKey;

  function focusSelectedListing() {
    const selectedListing =
      listingRefs.current.get(
        activeListingKey
      );

    const selectedMarker =
      markerRefs.current.get(
        activeListingKey
      );

    if (
      !selectedListing ||
      !selectedMarker
    ) {
      return;
    }

    markerRefs.current.forEach(
      (marker, markerKey) => {
        marker
          .getElement()
          .classList.toggle(
            "venture-marker-selected",
            markerKey ===
              activeListingKey
          );

        if (
          markerKey !==
          activeListingKey
        ) {
          marker
            .getPopup()
            ?.remove();
        }
      }
    );

    activeMap.flyTo({
      center: [
        selectedListing.longitude,
        selectedListing.latitude
      ],
      zoom: Math.max(
        activeMap.getZoom(),
        13.5
      ),
      duration: 700,
      essential: true
    });

    if (
      !selectedMarker
        .getPopup()
        ?.isOpen()
    ) {
      selectedMarker.togglePopup();
    }
  }

  if (activeMap.loaded()) {
    focusSelectedListing();
  } else {
    activeMap.once(
      "load",
      focusSelectedListing
    );
  }

  return () => {
    activeMap.off(
      "load",
      focusSelectedListing
    );
  };
}, [
  selectedListingKey,
  selectionVersion
]);
  return (
    <div className="map-shell">
      <div
        className="city-map"
        ref={ref}
      />

      {message ? (
        <div className="map-placeholder">
          {message}
        </div>
      ) : null}
    </div>
  );
}