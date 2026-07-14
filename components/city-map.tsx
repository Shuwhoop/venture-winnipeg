"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

export function CityMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const style = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
    if (!ref.current || !style) {
      setMessage("Add a licensed MapLibre-compatible style URL to enable the live map.");
      return;
    }

    const map = new maplibregl.Map({
      container: ref.current,
      style,
      center: [-97.1384, 49.8951],
      zoom: 11
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    new maplibregl.Marker({ color: "#6d28d9" })
      .setLngLat([-97.1384, 49.8951])
      .setPopup(new maplibregl.Popup().setText("Venture sample listing"))
      .addTo(map);

    return () => map.remove();
  }, []);

  return (
    <div className="map-shell">
      <div className="city-map" ref={ref} />
      {message ? <div className="map-placeholder">{message}</div> : null}
    </div>
  );
}
