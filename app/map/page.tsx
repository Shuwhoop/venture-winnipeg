import Link from "next/link";

import {
  ExploreExperience
} from "@/components/explore-experience";

import {
  getPublishedEventListings
} from "@/lib/data/events";

import {
  getPublishedPlaceListings
} from "@/lib/data/places";

import type {
  Listing
} from "@/lib/types";

import styles from "@/app/explore/explore.module.css";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [events, places] =
    await Promise.all([
      getPublishedEventListings(150),
      getPublishedPlaceListings(150)
    ]);

  const listings: Listing[] = [
    ...events,
    ...places
  ];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            NAVIGATE WINNIPEG
          </span>

          <h1>City Map</h1>

          <p>
            Browse the city by location, move the map,
            and search the area when you find a part of
            Winnipeg worth exploring.
          </p>
        </div>

        <Link
          className={styles.mapExploreLink}
          href="/explore"
        >
          Filters
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <ExploreExperience
        listings={listings}
        eyebrow="WINNIPEG MAP"
        searchQuery=""
        initialView="map"
      />
    </main>
  );
}
