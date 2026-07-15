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
};

type MappableListing = Listing & {
  latitude: number;
  longitude: number;
};

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
  listings = []
}: CityMapProps) {
  const ref =
    useRef<HTMLDivElement>(null);

  const [
    message,
    setMessage
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    const style =
      process.env
        .NEXT_PUBLIC_MAP_STYLE_URL;

    if (!ref.current || !style) {
      setMessage(
        "Add a licensed MapLibre-compatible style URL to enable the live map."
      );

      return;
    }

  const safeListings =
    Array.isArray(listings)
      ? listings
      : [];

  const mappableListings =
    safeListings.filter(
      hasCoordinates
    );

    const map =
      new maplibregl.Map({
        container: ref.current,
        style,
        center: [
          -97.1384,
          49.8951
        ],
        zoom: 11
      });

    map.addControl(
      new maplibregl.NavigationControl(),
      "top-right"
    );

    map.once("load", () => {
      if (
        mappableListings.length === 0
      ) {
        setMessage(
          "No mapped locations are available for these results yet."
        );

        return;
      }

      setMessage(null);

      const bounds =
        new maplibregl.LngLatBounds();

      for (
        const listing of
        mappableListings
      ) {
        const coordinates: [
          number,
          number
        ] = [
          listing.longitude,
          listing.latitude
        ];

        const popup =
          new maplibregl.Popup({
            offset: 22
          }).setDOMContent(
            createPopupContent(
              listing
            )
          );

        new maplibregl.Marker({
          color:
            listing.type === "event"
              ? "#6d28d9"
              : "#15803d"
        })
          .setLngLat(coordinates)
          .setPopup(popup)
          .addTo(map);

        bounds.extend(coordinates);
      }

      if (
        mappableListings.length === 1
      ) {
        const onlyListing =
          mappableListings[0];

        map.jumpTo({
          center: [
            onlyListing.longitude,
            onlyListing.latitude
          ],
          zoom: 13
        });

        return;
      }

      map.fitBounds(bounds, {
        padding: 55,
        maxZoom: 14,
        duration: 0
      });
    });

    return () => {
      map.remove();
    };
  }, [listings]);

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