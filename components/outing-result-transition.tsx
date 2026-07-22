"use client";

import styles from "./outing-result-transition.module.css";

export function OutingResultTransition({
  active
}: {
  active: boolean;
}) {
  if (!active) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      role="status"
      aria-live="polite"
      aria-label="Venture is building your outing"
    >
      <div className={styles.bandGrid} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className={styles.floaters} aria-hidden="true">
        <i>🎵</i>
        <i>✨</i>
        <i>📍</i>
        <i>🍽️</i>
      </div>

      <div className={styles.routeSketch} aria-hidden="true">
        <span>1</span>
        <b />
        <span>2</span>
        <b />
        <span>3</span>
      </div>

      <section className={styles.card}>
        <span className={styles.eyebrow}>
          WINNIPEG / CITY DISCOVERY
        </span>

        <strong className={styles.wordmark}>
          VENTURE
        </strong>

        <div className={styles.progressTrack} aria-hidden="true">
          <span />
        </div>

        <p>
          Connecting your Winnipeg picks into one smooth route.
        </p>

        <small className={styles.loadingNote}>
          Checking timing, distance, and the best stop order
        </small>
      </section>
    </div>
  );
}
