"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  getVisitHistory,
  getVisitHistoryStats,
  removeVisit,
  VISIT_HISTORY_EVENT,
  type VisitRecord
} from "@/lib/visit-history";

import styles from "./visit-history-dashboard.module.css";

function formatVisitDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Date not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  ).format(parsed);
}

export function VisitHistoryDashboard() {
  const [visits, setVisits] =
    useState<VisitRecord[]>([]);
  const [filter, setFilter] =
    useState<"all" | "restaurant" | "event">(
      "all"
    );
  const [expanded, setExpanded] =
    useState(false);

  useEffect(() => {
    function refresh() {
      setVisits(getVisitHistory());
    }

    refresh();

    window.addEventListener(
      VISIT_HISTORY_EVENT,
      refresh
    );
    window.addEventListener(
      "storage",
      refresh
    );

    return () => {
      window.removeEventListener(
        VISIT_HISTORY_EVENT,
        refresh
      );
      window.removeEventListener(
        "storage",
        refresh
      );
    };
  }, []);

  const stats = useMemo(
    () => getVisitHistoryStats(visits),
    [visits]
  );

  const filtered = useMemo(
    () =>
      visits.filter(
        (visit) =>
          filter === "all" ||
          visit.listingType === filter
      ),
    [filter, visits]
  );

  const visible = expanded
    ? filtered
    : filtered.slice(0, 5);

  function handleRemove(visit: VisitRecord) {
    const confirmed = window.confirm(
      `Remove the ${formatVisitDate(
        visit.visitedAt
      )} visit to ${
        visit.listingSnapshot.name
      }?`
    );

    if (confirmed) {
      removeVisit(visit.visitId);
    }
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <span>MY VENTURE</span>
          <h2>Your Winnipeg history</h2>
          <p>
            Venture remembers only places and
            events you confirm you attended.
            Saved and viewed listings do not
            count as visits.
          </p>
        </div>

        <div
          className={styles.passportMark}
          aria-hidden="true"
        >
          <strong>V</strong>
          <small>WPG</small>
        </div>
      </header>

      <div className={styles.stats}>
        <article>
          <strong>{stats.totalVisits}</strong>
          <span>Total visits</span>
        </article>
        <article>
          <strong>{stats.uniquePlaces}</strong>
          <span>Places tried</span>
        </article>
        <article>
          <strong>{stats.uniqueEvents}</strong>
          <span>Events attended</span>
        </article>
        <article>
          <strong>
            {stats.neighbourhoodsExplored}
          </strong>
          <span>Areas explored</span>
        </article>
      </div>

      {visits.length === 0 ? (
        <div className={styles.empty}>
          <span aria-hidden="true">⌖</span>
          <div>
            <strong>
              Your city passport is blank.
            </strong>
            <p>
              Mark a listing as visited or
              complete an outing. Venture can
              then find places that are genuinely
              new to you.
            </p>
          </div>
          <Link href="/explore">
            Explore Winnipeg
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <div
              className={styles.filters}
              aria-label="Filter visit history"
            >
              {(
                [
                  ["all", "All"],
                  ["restaurant", "Places"],
                  ["event", "Events"]
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={
                    filter === value
                      ? styles.active
                      : ""
                  }
                  aria-pressed={filter === value}
                  onClick={() => {
                    setFilter(value);
                    setExpanded(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <span>
              {stats.newThisMonth} new this month
            </span>
          </div>

          <div className={styles.historyList}>
            {visible.map((visit) => (
              <article
                className={styles.historyItem}
                key={visit.visitId}
              >
                <div
                  className={`${styles.typeMark} ${
                    visit.listingType === "event"
                      ? styles.event
                      : styles.place
                  }`}
                  aria-hidden="true"
                >
                  {visit.listingType === "event"
                    ? "🎟"
                    : "🍽"}
                </div>

                <div className={styles.historyCopy}>
                  <Link
                    href={`/listings/${visit.listingSlug}`}
                  >
                    {visit.listingSnapshot.name}
                  </Link>
                  <span>
                    {visit.listingSnapshot
                      .neighbourhood || "Winnipeg"}
                    {" · "}
                    {formatVisitDate(
                      visit.visitedAt
                    )}
                  </span>
                  <small>
                    {visit.source ===
                    "outing_complete"
                      ? "Logged from a completed outing"
                      : "Marked manually"}
                  </small>
                </div>

                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove visit to ${visit.listingSnapshot.name}`}
                  onClick={() =>
                    handleRemove(visit)
                  }
                >
                  ×
                </button>
              </article>
            ))}
          </div>

          {filtered.length > 5 ? (
            <button
              type="button"
              className={styles.expand}
              onClick={() =>
                setExpanded(
                  (current) => !current
                )
              }
            >
              {expanded
                ? "Show recent visits"
                : `View all ${filtered.length} visits`}
            </button>
          ) : null}
        </>
      )}

      <div className={styles.newToMeNote}>
        <span aria-hidden="true">✨</span>
        <div>
          <strong>New to Me is now available</strong>
          <p>
            In the outing builder, choose
            “Only somewhere new” to exclude
            restaurants and event occurrences
            already recorded here.
          </p>
        </div>
        <Link href="/build-outing">
          Build something new
        </Link>
      </div>
    </section>
  );
}
