import type { Metadata } from "next";
import Link from "next/link";

import { BetaMissionBoard } from "@/components/beta-launch/beta-mission-board";

import styles from "./beta.module.css";

export const metadata: Metadata = {
  title: "Venture Private Beta | Help Shape Winnipeg Discovery",
  description:
    "Test Venture's Winnipeg discovery and outing-building experience, then share clear feedback that helps improve the product."
};

const feedbackSignals = [
  {
    icon: "bug",
    title: "Something broke",
    copy: "Tell us what you tapped, what you expected, and what happened instead."
  },
  {
    icon: "confusing",
    title: "Something felt confusing",
    copy: "Point out unclear wording, crowded screens, awkward navigation, or choices that were hard to understand."
  },
  {
    icon: "trust",
    title: "Something looked untrustworthy",
    copy: "Flag incorrect hours, outdated events, unclear sources, missing details, or questionable recommendations."
  },
  {
    icon: "spark",
    title: "Something worked brilliantly",
    copy: "The delightful parts matter too. Tell us what felt useful enough to bring back."
  }
];

function SignalIcon({ name }: { name: string }) {
  if (name === "bug") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 9h8v7a4 4 0 0 1-8 0V9Z" />
        <path d="M9 9a3 3 0 0 1 6 0M5 11h3M16 11h3M5 16h3M16 16h3M9 5 7 3M15 5l2-2" />
      </svg>
    );
  }

  if (name === "confusing") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.5 9a2.6 2.6 0 1 1 4.1 2.1c-1 .7-1.6 1.2-1.6 2.4" />
        <path d="M12 17.5h.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }

  if (name === "trust") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
      <path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </svg>
  );
}

export default function BetaPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlowOne} aria-hidden="true" />
        <div className={styles.heroGlowTwo} aria-hidden="true" />

        <div className={styles.badge}>
          <span aria-hidden="true">●</span>
          WINNIPEG PRIVATE BETA
        </div>

        <h1>Help build a better way to discover your city.</h1>

        <p>
          Venture is testing one simple promise: helping someone find a
          trustworthy place, event, or complete outing in under two minutes.
          Your job is not to be polite. Your job is to be observant.
        </p>

        <div className={styles.heroActions}>
          <Link href="/explore" className={styles.primaryAction}>
            Start exploring
            <span aria-hidden="true">→</span>
          </Link>

          <Link href="/build-outing" className={styles.secondaryAction}>
            Build an outing
          </Link>
        </div>

        <div className={styles.heroFacts}>
          <span>About 15 minutes</span>
          <span>No account required</span>
          <span>Use your own phone</span>
        </div>
      </section>

      <section className={styles.introCard}>
        <span className={styles.eyebrow}>YOUR BETA MISSION</span>
        <h2>Try Venture like a real Winnipeg night depends on it.</h2>
        <p>
          Search naturally, choose places you would genuinely consider, and
          build an outing you might actually send to a friend. Honest friction
          is more valuable than ceremonial button tapping.
        </p>
      </section>

      <BetaMissionBoard />

      <section className={styles.feedbackSection}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>WHAT TO NOTICE</span>
          <h2>Useful feedback has fingerprints.</h2>
          <p>
            Specific observations help Venture improve faster than a floating
            “it was good.” These are the signals worth catching.
          </p>
        </div>

        <div className={styles.signalGrid}>
          {feedbackSignals.map((signal) => (
            <article className={styles.signalCard} key={signal.title}>
              <span className={styles.signalIcon}>
                <SignalIcon name={signal.icon} />
              </span>
              <div>
                <h3>{signal.title}</h3>
                <p>{signal.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.trustCard}>
        <div className={styles.trustIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Z" />
            <path d="M9.5 12.2 11.2 14l3.7-4.2" />
          </svg>
        </div>
        <div>
          <span className={styles.eyebrow}>A QUICK TRUST NOTE</span>
          <h2>Test boldly, share carefully.</h2>
          <p>
            Do not submit private financial, health, immigration, or account
            information through feedback. Venture records basic usage events
            and feedback to understand what works and what needs repair.
          </p>
          <div className={styles.trustLinks}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/accessibility">Accessibility</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
