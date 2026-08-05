import Link from "next/link";

import type { CSSProperties } from "react";

import styles from "./saved-empty-state.module.css";

type ActivityName =
  | "music"
  | "food"
  | "bowling"
  | "sports"
  | "arts"
  | "outdoors"
  | "shows"
  | "games";

const activities: Array<{
  name: ActivityName;
  label: string;
  className: string;
}> = [
  { name: "music", label: "Live music", className: styles.music },
  { name: "food", label: "Food", className: styles.food },
  { name: "bowling", label: "Bowling", className: styles.bowling },
  { name: "sports", label: "Sports", className: styles.sports },
  { name: "arts", label: "Arts", className: styles.arts },
  { name: "outdoors", label: "Outdoors", className: styles.outdoors },
  { name: "shows", label: "Shows", className: styles.shows },
  { name: "games", label: "Games", className: styles.games }
];

function ActivityIcon({ name }: { name: ActivityName }) {
  if (name === "music") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 18V6l10-2v12" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="16" cy="16" r="3" />
      </svg>
    );
  }

  if (name === "food") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4v7M7 4v7M4 8h3M5.5 11v9" />
        <path d="M15 4c3 2 3 7 0 9v7" />
      </svg>
    );
  }

  if (name === "bowling") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="14" r="7" />
        <circle cx="10" cy="11" r="1" />
        <circle cx="13.5" cy="10.5" r="1" />
        <circle cx="14" cy="13.5" r="1" />
      </svg>
    );
  }

  if (name === "sports") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="m8 5 2 4-4 3M16 5l-2 4 4 3M8 19l2-4-4-3M16 19l-2-4 4-3" />
      </svg>
    );
  }

  if (name === "arts") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4c-5 0-9 3.4-9 7.6 0 3 2.4 5.4 5.4 5.4H10c.8 0 1.2.9.8 1.5-.5.8.1 1.8 1.1 1.8 5.1 0 9.1-3.6 9.1-8.3C21 7.6 17 4 12 4Z" />
        <circle cx="8" cy="10" r="1" />
        <circle cx="12" cy="8" r="1" />
        <circle cx="16" cy="10" r="1" />
      </svg>
    );
  }

  if (name === "outdoors") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 6 11h4l-5 7h14l-5-7h4L12 3Z" />
        <path d="M12 18v3" />
      </svg>
    );
  }

  if (name === "shows") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v14H4z" />
        <path d="M8 5 6 9M13 5l-2 4M18 5l-2 4M4 9h16" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 9h8a5 5 0 0 1 4.8 6.4l-.7 2.3a2.4 2.4 0 0 1-4.2.8L14 16h-4l-1.9 2.5a2.4 2.4 0 0 1-4.2-.8l-.7-2.3A5 5 0 0 1 8 9Z" />
      <path d="M8 12v4M6 14h4M16 13h.01M18 15h.01" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

export default function SavedEmptyState() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div
          className={styles.activityOrbit}
          aria-hidden="true"
        >
          <div className={styles.heart}>
            <HeartIcon />
          </div>

          {activities.map((activity, index) => (
            <span
              className={`${styles.activity} ${activity.className}`}
              key={activity.label}
              style={
                {
                  "--activity-index": index
                } as CSSProperties
              }
            >
              <ActivityIcon name={activity.name} />
            </span>
          ))}

          <span className={`${styles.spark} ${styles.sparkOne}`} />
          <span className={`${styles.spark} ${styles.sparkTwo}`} />
          <span className={`${styles.spark} ${styles.sparkThree}`} />
        </div>

        <div className={styles.copy}>
          <span className={styles.eyebrow}>
            YOUR WINNIPEG COLLECTION
          </span>

          <h1>Nothing saved yet</h1>

          <p>
            Save a complete outing or tap the heart on any Winnipeg listing you want to revisit.
          </p>
        </div>

        <div className={styles.actions}>
          <Link
            className={styles.primary}
            href="/build-outing"
          >
            Build an outing
            <SparkIcon />
          </Link>

          <Link
            className={styles.secondary}
            href="/explore"
          >
            Explore Winnipeg
            <ArrowIcon />
          </Link>
        </div>

        <p className={styles.tip}>
          Your saved places and outings will appear here.
        </p>
      </section>
    </main>
  );
}
