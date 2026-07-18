import Link from "next/link";

const activityBadges = [
  {
    emoji: "🎵",
    label: "Live music",
    className: "activity-one"
  },
  {
    emoji: "🍜",
    label: "Food",
    className: "activity-two"
  },
  {
    emoji: "🎳",
    label: "Bowling",
    className: "activity-three"
  },
  {
    emoji: "⚽",
    label: "Sports",
    className: "activity-four"
  },
  {
    emoji: "🎟️",
    label: "Events",
    className: "activity-five"
  },
  {
    emoji: "📸",
    label: "Exploring",
    className: "activity-six"
  }
];

export function SavedEmptyState() {
  return (
    <section className="saved-empty-state">
      <div className="saved-empty-shell">
        <div className="saved-empty-illustration">
          <div className="saved-empty-heart">
            <span aria-hidden="true">♡</span>
          </div>

          {activityBadges.map((item) => (
            <div
              key={item.label}
              className={`saved-activity-badge ${item.className}`}
              aria-label={item.label}
              title={item.label}
            >
              <span aria-hidden="true">
                {item.emoji}
              </span>
            </div>
          ))}
        </div>

        <div className="saved-empty-copy">
          <h1>Nothing saved yet</h1>

          <p>
            Save a complete outing or tap the
            heart on an individual Winnipeg
            listing.
          </p>
        </div>

        <div className="saved-empty-actions">
          <Link
            className="saved-empty-primary"
            href="/build-outing"
          >
            Build an outing
          </Link>

          <Link
            className="saved-empty-secondary"
            href="/explore"
          >
            Explore Winnipeg
          </Link>
        </div>
      </div>
    </section>
  );
}