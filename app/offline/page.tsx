import type { Metadata } from "next";
import Link from "next/link";

import { OfflineStatus } from "./offline-status";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Offline | Venture",
  description: "Use saved Venture plans while your connection is unavailable."
};

export default function OfflinePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.signal} aria-hidden="true">
          <span />
          <span />
          <span />
          <i />
        </div>
        <span className={styles.eyebrow}>VENTURE OFFLINE</span>
        <h1>The city is still here. Your signal took a break.</h1>
        <p>
          You can reopen locally saved places and outings. New searches,
          current hours, and route generation need an internet connection.
        </p>
      </section>

      <section className={styles.actions}>
        <Link href="/saved">
          <span aria-hidden="true">♡</span>
          <strong>Open saved plans</strong>
          <small>Use places and outings already stored on this device.</small>
        </Link>
        <Link href="/profile">
          <span aria-hidden="true">◎</span>
          <strong>View local preferences</strong>
          <small>Your profile settings remain available in this browser.</small>
        </Link>
      </section>

      <OfflineStatus />

      <p className={styles.note}>
        Listing details can change. Reconnect before travelling or purchasing.
      </p>
    </main>
  );
}
