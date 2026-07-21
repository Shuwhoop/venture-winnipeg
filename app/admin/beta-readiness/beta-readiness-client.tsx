"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState
} from "react";

import type {
  BetaReadinessReport,
  BetaReadinessStatus
} from "@/lib/admin/beta-readiness-types";

import styles from "./page.module.css";

const STORAGE_KEY =
  "venture:beta-readiness:v1";

const MANUAL_CHECKS = [
  {
    id: "mobile-layouts",
    area: "Mobile",
    title: "Phone layout pass",
    detail:
      "Homepage, Explore, listing details, all outing-builder steps, results, Saved, Submit, and Profile fit at 320px, 375px, and 430px widths.",
    required: true
  },
  {
    id: "public-journeys",
    area: "Product",
    title: "Core public journeys tested",
    detail:
      "Browse, search, listing actions, save, share, submit, claim, and report flows have been completed from a fresh browser session.",
    required: true
  },
  {
    id: "outing-states",
    area: "Recommendations",
    title: "Complete, partial, and empty outings tested",
    detail:
      "Each result state explains what happened and gives the user a useful next action without trapping them.",
    required: true
  },
  {
    id: "legal-pages",
    area: "Trust",
    title: "Privacy and terms published",
    detail:
      "Public privacy and terms pages describe analytics, feedback, newsletter consent, submissions, claims, and third-party links.",
    required: true
  },
  {
    id: "accessibility-pass",
    area: "Accessibility",
    title: "Keyboard and screen-reader pass",
    detail:
      "Interactive controls have visible focus, meaningful labels, usable contrast, reduced motion, and logical keyboard order.",
    required: true
  },
  {
    id: "secret-rotation",
    area: "Security",
    title: "Production secrets reviewed",
    detail:
      "Previously exposed keys and tokens have been rotated, production environment variables are current, and no secrets are committed to Git.",
    required: true
  },
  {
    id: "moderation-dry-run",
    area: "Operations",
    title: "Moderation dry run",
    detail:
      "A test submission, incorrect-info report, and business claim were reviewed without granting automatic publishing or ranking advantages.",
    required: true
  },
  {
    id: "rollback-plan",
    area: "Operations",
    title: "Rollback and backup plan",
    detail:
      "The last stable deployment is identifiable, database migrations are documented, and code backups sit outside the TypeScript project tree.",
    required: true
  },
  {
    id: "tester-briefing",
    area: "Beta",
    title: "Tester briefing prepared",
    detail:
      "Testers know the beta is Winnipeg-focused, data may be incomplete, what tasks to try, and how to report problems.",
    required: true
  },
  {
    id: "support-inbox",
    area: "Support",
    title: "Support inbox monitored",
    detail:
      "A working email address is checked during the beta and urgent listing corrections have an owner.",
    required: false
  },
  {
    id: "verified-email-domain",
    area: "Email",
    title: "Venture sending domain verified",
    detail:
      "Newsletter delivery uses a Venture-controlled sender rather than the Resend onboarding address.",
    required: false
  },
  {
    id: "browser-pass",
    area: "Compatibility",
    title: "Cross-browser spot check",
    detail:
      "The main journey works in current Chrome, Safari, and Edge on at least one mobile and one desktop device.",
    required: false
  }
] as const;

type ManualState = Record<string, boolean>;

type StoredReadiness = {
  completed?: ManualState;
  notes?: string;
};

function statusLabel(
  status: BetaReadinessStatus
): string {
  if (status === "blocked") {
    return "Blocked";
  }

  if (status === "attention") {
    return "Needs attention";
  }

  return "Ready";
}

function statusIcon(
  status: BetaReadinessStatus
): string {
  if (status === "blocked") {
    return "!";
  }

  if (status === "attention") {
    return "•";
  }

  return "✓";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Winnipeg",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(new Date(value));
}

function loadStoredReadiness(): StoredReadiness {
  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return {};
    }

    const parsed =
      JSON.parse(raw) as StoredReadiness;

    return {
      completed:
        parsed.completed &&
        typeof parsed.completed === "object"
          ? parsed.completed
          : {},
      notes:
        typeof parsed.notes === "string"
          ? parsed.notes
          : ""
    };
  } catch {
    return {};
  }
}

export function BetaReadinessClient({
  report
}: {
  report: BetaReadinessReport;
}) {
  const [completed, setCompleted] =
    useState<ManualState>({});
  const [notes, setNotes] =
    useState("");
  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    const stored = loadStoredReadiness();
    setCompleted(stored.completed ?? {});
    setNotes(stored.notes ?? "");
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completed,
        notes
      })
    );
  }, [completed, loaded, notes]);

  const manualSummary = useMemo(() => {
    const required =
      MANUAL_CHECKS.filter(
        (check) => check.required
      );
    const recommended =
      MANUAL_CHECKS.filter(
        (check) => !check.required
      );
    const requiredComplete =
      required.filter(
        (check) => completed[check.id]
      ).length;
    const recommendedComplete =
      recommended.filter(
        (check) => completed[check.id]
      ).length;

    return {
      requiredTotal: required.length,
      requiredComplete,
      requiredRemaining:
        required.length - requiredComplete,
      recommendedTotal:
        recommended.length,
      recommendedComplete
    };
  }, [completed]);

  const overallStatus: BetaReadinessStatus =
    report.launchStatus === "blocked" ||
    manualSummary.requiredRemaining > 0
      ? "blocked"
      : report.launchStatus === "attention" ||
          manualSummary.recommendedComplete <
            manualSummary.recommendedTotal
        ? "attention"
        : "ready";

  const blockers =
    report.automaticChecks.filter(
      (check) => check.status === "blocked"
    );
  const attention =
    report.automaticChecks.filter(
      (check) => check.status === "attention"
    );

  function resetManualChecks() {
    const confirmed = window.confirm(
      "Reset every manual beta check and clear the notes?"
    );

    if (!confirmed) {
      return;
    }

    setCompleted({});
    setNotes("");
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            BETA LAUNCH CONTROL
          </p>
          <h1>
            Is Venture ready for real testers?
          </h1>
          <p>
            This page combines live platform checks with the human checks that software cannot honestly mark for you.
          </p>
        </div>

        <div
          className={`${styles.launchCard} ${styles[overallStatus]}`}
        >
          <span className={styles.launchIcon}>
            {statusIcon(overallStatus)}
          </span>
          <div>
            <small>LAUNCH DECISION</small>
            <strong>
              {statusLabel(overallStatus)}
            </strong>
            <p>
              {overallStatus === "ready"
                ? "The automatic checks and required human checks are complete."
                : overallStatus === "attention"
                  ? "The beta can be prepared, but a few non-blocking items still deserve attention."
                  : "Resolve the blockers and finish the required human checks before inviting outside testers."}
            </p>
          </div>
        </div>

        <div className={styles.heroActions}>
          <Link href="/admin/quick-repair">
            Repair inventory
          </Link>
          <Link href="/build-outing">
            Test outing builder
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
          >
            Print summary
          </button>
        </div>
      </section>

      <section
        className={styles.metrics}
        aria-label="Beta readiness summary"
      >
        <article className={styles.blockedMetric}>
          <span>Automatic blockers</span>
          <strong>{report.summary.blocked}</strong>
          <small>Live systems preventing launch</small>
        </article>
        <article className={styles.attentionMetric}>
          <span>Needs attention</span>
          <strong>{report.summary.attention}</strong>
          <small>Important, but not always fatal</small>
        </article>
        <article className={styles.readyMetric}>
          <span>Automatic checks ready</span>
          <strong>{report.summary.ready}</strong>
          <small>Live checks currently passing</small>
        </article>
        <article>
          <span>Required manual checks</span>
          <strong>
            {manualSummary.requiredComplete}/
            {manualSummary.requiredTotal}
          </strong>
          <small>
            Saved only in this browser
          </small>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>
              DO THESE FIRST
            </p>
            <h2>Current launch blockers</h2>
            <p>
              Automatic blockers are shown before every passing check, so the dashboard does not bury the useful work.
            </p>
          </div>
          <time dateTime={report.generatedAt}>
            Updated {formatDate(report.generatedAt)}
          </time>
        </div>

        {blockers.length === 0 &&
        manualSummary.requiredRemaining === 0 ? (
          <div className={styles.successBanner}>
            <span>✓</span>
            <div>
              <strong>No required blockers remain.</strong>
              <p>
                Review the attention items before sending the invitation link.
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.blockerGrid}>
            {blockers.map((check) => (
              <article
                className={styles.blockerCard}
                key={check.id}
              >
                <span className={styles.cardIcon}>
                  !
                </span>
                <div>
                  <small>{check.area}</small>
                  <h3>{check.title}</h3>
                  <p>{check.detail}</p>
                  <strong>{check.metric}</strong>
                  {check.href ? (
                    <Link href={check.href}>
                      {check.actionLabel ?? "Open tool"}
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}

            {manualSummary.requiredRemaining > 0 ? (
              <article className={styles.blockerCard}>
                <span className={styles.cardIcon}>
                  ☑
                </span>
                <div>
                  <small>HUMAN REVIEW</small>
                  <h3>
                    Required checks are incomplete
                  </h3>
                  <p>
                    {manualSummary.requiredRemaining} required manual checks still need a real person to test or confirm them.
                  </p>
                  <strong>
                    {manualSummary.requiredComplete}/
                    {manualSummary.requiredTotal} complete
                  </strong>
                  <a href="#manual-checks">
                    Finish manual checks
                  </a>
                </div>
              </article>
            ) : null}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>
              LIVE PLATFORM CHECKS
            </p>
            <h2>Automatic readiness</h2>
            <p>
              These results come from Venture data, environment configuration, analytics, and feedback systems.
            </p>
          </div>
        </div>

        <div className={styles.checkGrid}>
          {report.automaticChecks.map((check) => (
            <article
              className={`${styles.checkCard} ${styles[check.status]}`}
              key={check.id}
            >
              <div className={styles.checkTop}>
                <span className={styles.statusIcon}>
                  {statusIcon(check.status)}
                </span>
                <span className={styles.statusLabel}>
                  {statusLabel(check.status)}
                </span>
                <strong>{check.metric}</strong>
              </div>
              <small>{check.area}</small>
              <h3>{check.title}</h3>
              <p>{check.detail}</p>
              {check.href ? (
                <Link href={check.href}>
                  {check.actionLabel ?? "Open tool"}
                  <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {attention.length > 0 ? (
        <section className={styles.attentionStrip}>
          <span>•</span>
          <div>
            <strong>
              {attention.length} automatic checks need attention
            </strong>
            <p>
              They may not stop a tiny controlled beta, but they should not disappear into the wallpaper.
            </p>
          </div>
        </section>
      ) : null}

      <section
        className={styles.section}
        id="manual-checks"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>
              HUMAN CHECKLIST
            </p>
            <h2>Things the database cannot prove</h2>
            <p>
              Check these only after testing them. Progress and notes are stored locally in this browser.
            </p>
          </div>
          <button
            className={styles.resetButton}
            type="button"
            onClick={resetManualChecks}
          >
            Reset checklist
          </button>
        </div>

        <div className={styles.manualGrid}>
          {MANUAL_CHECKS.map((check) => {
            const isComplete =
              Boolean(completed[check.id]);

            return (
              <label
                className={`${styles.manualCard} ${
                  isComplete
                    ? styles.manualComplete
                    : ""
                }`}
                key={check.id}
              >
                <input
                  type="checkbox"
                  checked={isComplete}
                  onChange={(event) =>
                    setCompleted((current) => ({
                      ...current,
                      [check.id]: event.target.checked
                    }))
                  }
                />
                <span className={styles.manualCheck}>
                  {isComplete ? "✓" : ""}
                </span>
                <span className={styles.manualCopy}>
                  <small>
                    {check.area} · {check.required
                      ? "Required"
                      : "Recommended"}
                  </small>
                  <strong>{check.title}</strong>
                  <p>{check.detail}</p>
                </span>
              </label>
            );
          })}
        </div>

        <label className={styles.notesCard}>
          <span>Launch notes</span>
          <textarea
            value={notes}
            placeholder="Record bugs, tester names, launch conditions, rollback notes, or the next repair sprint..."
            onChange={(event) =>
              setNotes(event.target.value)
            }
          />
          <small>
            Notes remain on this device and are not written to Supabase.
          </small>
        </label>
      </section>

      <section className={styles.targetCard}>
        <div>
          <p className={styles.kicker}>
            SMALL-BETA TARGETS
          </p>
          <h2>A useful first runway</h2>
          <p>
            These are deliberately smaller than Venture's long-term inventory targets. They are enough for a controlled Winnipeg beta, not proof of citywide completeness.
          </p>
        </div>
        <div className={styles.targetGrid}>
          <span>
            <strong>{report.targets.trustedPlaces}</strong>
            trusted places
          </span>
          <span>
            <strong>{report.targets.futureEvents}</strong>
            future events
          </span>
          <span>
            <strong>{report.targets.outingEligible}</strong>
            outing-eligible records
          </span>
          <span>
            <strong>
              ≤{report.targets.maxMissingNeighbourhoods}
            </strong>
            missing neighbourhoods
          </span>
        </div>
      </section>
    </main>
  );
}
