"use client";

import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  getVentureMapConfiguration
} from "@/lib/venture-map-style";

import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import styles from "./listing-detail-map.module.css";

type ListingDetailMapProps = {
  latitude: number;
  longitude: number;
  name: string;
  neighbourhood: string;
  directionsUrl: string;
};

export function ListingDetailMap({
  latitude,
  longitude,
  name,
  neighbourhood,
  directionsUrl
}: ListingDetailMapProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);
  const [status, setStatus] =
    useState<"loading" | "ready" | "error">(
      "loading"
    );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const configuration =
      getVentureMapConfiguration();

    const map = new maplibregl.Map({
      container,
      style: configuration.style,
      center: [longitude, latitude],
      zoom: 14.2,
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

    const markerElement =
      document.createElement("div");

    markerElement.className =
      styles.marker;
    markerElement.setAttribute(
      "aria-label",
      name
    );
    markerElement.innerHTML =
      "<span>V</span>";

    const marker =
      new maplibregl.Marker({
        element: markerElement,
        anchor: "bottom"
      })
        .setLngLat([
          longitude,
          latitude
        ])
        .addTo(map);

    const timeout = window.setTimeout(
      () => setStatus("error"),
      12000
    );

    map.on("load", () => {
      window.clearTimeout(timeout);
      map.resize();
      setStatus("ready");
    });

    map.on("error", () => {
      if (!map.loaded()) {
        setStatus("error");
      }
    });

    const observer =
      new ResizeObserver(() =>
        map.resize()
      );

    observer.observe(container);

    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
      marker.remove();
      map.remove();
    };
  }, [latitude, longitude, name]);

  return (
    <div className={styles.shell}>
      <div
        ref={containerRef}
        className={styles.map}
        role="region"
        aria-label={`Map showing ${name}`}
      />

      {status !== "ready" ? (
        <div
          className={`${styles.status} ${
            status === "error"
              ? styles.error
              : ""
          }`}
          role={
            status === "error"
              ? "alert"
              : "status"
          }
        >
          <span aria-hidden="true">⌖</span>
          <strong>
            {status === "error"
              ? "Map unavailable"
              : "Loading the map"}
          </strong>
          <small>
            {status === "error"
              ? "Directions still work below."
              : neighbourhood}
          </small>
        </div>
      ) : null}

      <div className={styles.caption}>
        <span>
          <small>LOCATION</small>
          <strong>{neighbourhood}</strong>
        </span>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open directions
          <b aria-hidden="true">↗</b>
        </a>
      </div>
    </div>
  );
}
