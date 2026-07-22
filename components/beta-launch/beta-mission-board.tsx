"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./beta-mission-board.module.css";

const STORAGE_KEY = "venture:beta-missions:v1";

type Mission = {
  id: string;
  number: string;
  title: string;
  description: string;
  href: string;
  action: string;
  icon: "search" | "listing" | "route" | "adjust" | "save" | "report";
};

const missions: Mission[] = [
  {
    id: "discover",
    number: "01",
    title: "Find something worth doing",
    description:
      "Browse Explore or Tonight. Notice whether the filters, cards, and neighbourhood information help you decide quickly.",
    href: "/explore",
    action: "Explore Winnipeg",
    icon: "search"
  },
  {
    id: "listing",
    number: "02",
    title: "Inspect one listing closely",
    description:
      "Open a place or event. Check its hours, address, source, actions, transit notes, and whether the page feels trustworthy.",
    href: "/explore",
    action: "Open a listing",
    icon: "listing"
  },
  {
    id: "outing",
    number: "03",
    title: "Build a realistic outing",
    description:
      "Choose the same date, budget, group size, interests, and transportation you would use in real life.",
    href: "/build-outing",
    action: "Build an outing",
    icon: "route"
  },
  {
    id: "adjust",
    number: "04",
    title: "Challenge the generated route",
    description:
      "Replace or add a stop, lock something you like, and check whether partial results explain themselves clearly.",
    href: "/build-outing",
    action: "Test the builder",
    icon: "adjust"
  },
  {
    id: "save-share",
    number: "05",
    title: "Save and share something",
    description:
      "Save a listing or outing, visit Saved, and share a plan. Check that the route still makes sense when reopened.",
    href: "/saved",
    action: "Check Saved",
    icon: "save"
  },
  {
    id: "report",
    number: "06",
    title: "Try a trust workflow",
    description:
      "Submit a listing, report incorrect information, or use the feedback button. Judge whether the process feels clear and safe.",
    href: "/submit",
    action: "Test a submission",
    icon: "report"
  }
];

function MissionIcon({ name }: { name: Mission["icon"] }) {
  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" />
      </svg>
    );
  }

  if (name === "listing") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h12v18H6z" />
        <path d="M9 7h6M9 11h6M9 15h4" />
      </svg>
    );
  }

  if (name === "route") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <path d="M8.5 18h2.2a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3H15.5" />
      </svg>
    );
  }

  if (name === "adjust") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </svg>
    );
  }

  if (name === "save") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h10a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v11H9l-5 4V5Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

export function BetaMissionBoard() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCompleted(JSON.parse(saved) as Record<string, boolean>);
      }
    } catch {
      setCompleted({});
    } finally {
      setHydrated(true);
    }
  }, []);

  const completedCount = useMemo(
    () => missions.filter((mission) => completed[mission.id]).length,
    [completed]
  );

  const progress = Math.round((completedCount / missions.length) * 100);

  function toggleMission(id: string) {
    setCompleted((current) => {
      const next = {
        ...current,
        [id]: !current[id]
      };

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function resetMissions() {
    setCompleted({});
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function openFeedback() {
    window.dispatchEvent(new CustomEvent("venture:open-feedback"));
  }

  return (
    <section className={styles.board} aria-labelledby="beta-missions-title">
      <header className={styles.header}>
        <div>
          <span>BETA TEST CHECKLIST</span>
          <h2 id="beta-missions-title">Six missions. One honest verdict.</h2>
        </div>

        <div className={styles.score} aria-label={`${completedCount} of ${missions.length} missions complete`}>
          <strong>{hydrated ? completedCount : 0}/{missions.length}</strong>
          <small>complete</small>
        </div>
      </header>

      <div className={styles.progressTrack} aria-hidden="true">
        <span style={{ width: hydrated ? `${progress}%` : "0%" }} />
      </div>

      <div className={styles.missionList}>
        {missions.map((mission) => {
          const checked = Boolean(completed[mission.id]);

          return (
            <article
              className={`${styles.mission} ${checked ? styles.completed : ""}`}
              key={mission.id}
            >
              <div className={styles.number}>{mission.number}</div>

              <div className={styles.icon}>
                <MissionIcon name={mission.icon} />
              </div>

              <div className={styles.copy}>
                <h3>{mission.title}</h3>
                <p>{mission.description}</p>

                <div className={styles.actions}>
                  <Link href={mission.href}>
                    {mission.action}
                    <span aria-hidden="true">→</span>
                  </Link>

                  <button
                    type="button"
                    className={styles.checkButton}
                    aria-pressed={checked}
                    onClick={() => toggleMission(mission.id)}
                  >
                    <span aria-hidden="true">{checked ? "✓" : ""}</span>
                    {checked ? "Completed" : "Mark complete"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <div>
          <strong>
            {completedCount === missions.length
              ? "You have finished the full beta route."
              : `${missions.length - completedCount} mission${missions.length - completedCount === 1 ? "" : "s"} left.`}
          </strong>
          <p>
            Use the feedback form while the details are still fresh. Tiny clues
            evaporate quickly.
          </p>
        </div>

        <div className={styles.footerActions}>
          <button type="button" className={styles.feedbackButton} onClick={openFeedback}>
            Give feedback
          </button>
          {completedCount > 0 ? (
            <button type="button" className={styles.resetButton} onClick={resetMissions}>
              Reset checklist
            </button>
          ) : null}
        </div>
      </footer>
    </section>
  );
}
