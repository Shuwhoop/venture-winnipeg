import Link from "next/link";

import styles from "./saved-empty-state.module.css";


const activities = [
  {
    emoji: "🎵",
    label: "Live music",
    className: styles.music
  },
  {
    emoji: "🍜",
    label: "Food",
    className: styles.food
  },
  {
    emoji: "🎳",
    label: "Bowling",
    className: styles.bowling
  },
  {
    emoji: "⚽",
    label: "Sports",
    className: styles.sports
  },
  {
    emoji: "🎨",
    label: "Arts",
    className: styles.arts
  },
  {
    emoji: "🌲",
    label: "Outdoors",
    className: styles.outdoors
  },
  {
    emoji: "🎭",
    label: "Shows",
    className: styles.shows
  },
  {
    emoji: "🎮",
    label: "Games",
    className: styles.games
  }
];


export default function SavedEmptyState() {
  return (
    <main
      className={
        styles.page
      }
    >
      <section
        className={
          styles.card
        }
      >
        <div
          className={
            styles.activityOrbit
          }
          aria-hidden="true"
        >
          <div
            className={
              styles.heart
            }
          >
            <span>
              ♡
            </span>
          </div>

          {
            activities.map(
              (
                activity,
                index
              ) => (
                <span
                  className={`${styles.activity} ${activity.className}`}
                  key={
                    activity.label
                  }
                  style={
                    {
                      "--activity-index":
                        index
                    } as React.CSSProperties
                  }
                  title={
                    activity.label
                  }
                >
                  {
                    activity.emoji
                  }
                </span>
              )
            )
          }

          <span
            className={`${styles.spark} ${styles.sparkOne}`}
          />

          <span
            className={`${styles.spark} ${styles.sparkTwo}`}
          />

          <span
            className={`${styles.spark} ${styles.sparkThree}`}
          />
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
            YOUR WINNIPEG COLLECTION
          </span>

          <h1>
            Nothing saved yet
          </h1>

          <p>
            Save a complete outing or
            tap the heart on any
            Winnipeg listing you want
            to revisit.
          </p>
        </div>

        <div
          className={
            styles.actions
          }
        >
          <Link
            className={
              styles.primary
            }
            href="/build"
          >
            Build an outing
            <span
              aria-hidden="true"
            >
              ✦
            </span>
          </Link>

          <Link
            className={
              styles.secondary
            }
            href="/explore"
          >
            Explore Winnipeg
            <span
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>

        <p
          className={
            styles.tip
          }
        >
          Your saved places and outings
          will appear here.
        </p>
      </section>
    </main>
  );
}
