"use client";

import Link from "next/link";

import {
  useEffect,
  useState
} from "react";

import {
  getSavedListingReferences,
  isListingSnapshot
} from "@/lib/saved-listings";

import {
  getSavedOutings,
  type GeneratedOutingPlan
} from "@/lib/saved-outings";

import type {
  Listing
} from "@/lib/types";

import styles from "./page.module.css";

export default function OfflineSavedPage() {
  const [loaded, setLoaded] =
    useState(false);
  const [listings, setListings] =
    useState<Listing[]>([]);
  const [outings, setOutings] =
    useState<GeneratedOutingPlan[]>([]);

  useEffect(() => {
    setListings(
      getSavedListingReferences()
        .map((reference) =>
          reference.snapshot
        )
        .filter(isListingSnapshot)
    );
    setOutings(getSavedOutings());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <section className="empty-state">
        <div>◌</div>
        <h1>Opening offline saves</h1>
      </section>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span>OFFLINE POCKET</span>
        <h1>Your saved Winnipeg, no signal required.</h1>
        <p>
          These are the copies already stored on this device. Live hours,
          tickets, maps, and changes still need a connection.
        </p>
      </header>

      {outings.length === 0 && listings.length === 0 ? (
        <section className={styles.empty}>
          <span aria-hidden="true">♡</span>
          <h2>Nothing is packed for offline yet</h2>
          <p>
            Save a listing or complete outing while connected and Venture will
            keep a device copy close by.
          </p>
        </section>
      ) : null}

      {outings.length > 0 ? (
        <section className={styles.section}>
          <header>
            <span>COMPLETE OUTINGS</span>
            <h2>{outings.length} saved routes</h2>
          </header>

          <div className={styles.stack}>
            {outings.map((outing) => (
              <article
                className={styles.outingCard}
                key={outing.planId}
              >
                <div>
                  <small>{outing.date} · {outing.requestedStartTime}</small>
                  <h3>{outing.title}</h3>
                  <p>
                    {outing.stops.length} stops · {outing.transportation}
                  </p>
                </div>

                <ol>
                  {outing.stops.map((stop) => (
                    <li key={`${stop.order}-${stop.listing.id}`}>
                      <b>{stop.order}</b>
                      <span>
                        <small>{stop.startTime}</small>
                        <strong>{stop.listing.name}</strong>
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {listings.length > 0 ? (
        <section className={styles.section}>
          <header>
            <span>PLACES + EVENTS</span>
            <h2>{listings.length} saved picks</h2>
          </header>

          <div className={styles.listingGrid}>
            {listings.map((listing) => (
              <article key={`${listing.type}-${listing.id}`}>
                <span>{listing.type === "event" ? "EVENT" : "FOOD"}</span>
                <h3>{listing.name}</h3>
                <p>{listing.subtitle}</p>
                <small>
                  {listing.neighbourhood || "Winnipeg"} · {listing.timeOrHours}
                </small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.actions}>
        <Link href="/saved">Try regular Saved</Link>
        <Link href="/offline">Offline help</Link>
      </div>
    </main>
  );
}
