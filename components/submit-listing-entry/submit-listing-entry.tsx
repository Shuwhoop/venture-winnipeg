"use client";

import Link from "next/link";

import styles from "./submit-listing-entry.module.css";


type SubmitListingEntryProps = {
  placement?:
    | "home"
    | "profile";
};


export default function SubmitListingEntry({
  placement =
    "home"
}: SubmitListingEntryProps) {
  const isProfile =
    placement ===
    "profile";

  return (
    <section
      className={`${styles.card} ${
        isProfile
          ? styles.profileCard
          : styles.homeCard
      }`}
    >
      <div
        className={
          styles.icon
        }
        aria-hidden="true"
      >
        +
      </div>

      <div
        className={
          styles.copy
        }
      >
        <span
          className={
            styles.eyebrow
          }
        >
          HELP MAP WINNIPEG
        </span>

        <h2>
          Know something worth
          discovering?
        </h2>

        <p>
          Send Venture a restaurant
          or event. Every submission
          is reviewed before it can
          appear publicly.
        </p>

        <Link
          className={
            styles.button
          }
          href="/submit"
        >
          Submit a listing
          <span
            aria-hidden="true"
          >
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
