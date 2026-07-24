"use client";

import { useEffect, useState } from "react";

import styles from "./page.module.css";

export function OfflineStatus() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    setOnline(window.navigator.onLine);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className={styles.status} role="status">
      <span className={online ? styles.online : styles.offline} aria-hidden="true" />
      <strong>{online ? "You are connected again" : "Still offline"}</strong>
      <small>
        {online
          ? "Live discovery and route building are available."
          : "Venture will reconnect automatically when your signal returns."}
      </small>
      {online ? (
        <button type="button" onClick={() => window.location.assign("/")}>Return home</button>
      ) : null}
    </div>
  );
}
