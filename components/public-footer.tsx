"use client";

import Link from "next/link";

import styles from "./public-footer.module.css";

const contactEmail =
  process.env.NEXT_PUBLIC_VENTURE_CONTACT_EMAIL?.trim() || "";

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.brandBlock}>
        <span className={styles.badge}>WINNIPEG BETA</span>

        <strong>Venture by Boogie Bangers</strong>

        <p>
          Discover trustworthy places, events, and complete outings across the city.
        </p>
      </div>

      <nav className={styles.links} aria-label="Venture policies and support">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/accessibility">Accessibility</Link>
        {contactEmail ? (
          <a href={`mailto:${contactEmail}`}>Contact</a>
        ) : null}
      </nav>

      <p className={styles.note}>
        Listing details can change. Check the official business, organizer, or ticketing
        source before travelling or purchasing.
      </p>
    </footer>
  );
}
