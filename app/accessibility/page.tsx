import type { Metadata } from "next";

import Link from "next/link";

import styles from "../trust-pages.module.css";

export const metadata: Metadata = {
  title: "Accessibility | Venture by Boogie Bangers",
  description: "Venture's accessibility commitments, known limitations, and feedback process."
};

const contactEmail =
  process.env.NEXT_PUBLIC_VENTURE_CONTACT_EMAIL?.trim() || "";

export default function AccessibilityPage() {
  return (
    <main className={styles.page}>
      <header className={`${styles.hero} ${styles.accessibilityHero}`}>
        <span>ACCESSIBILITY</span>
        <h1>A city-discovery app should open doors, not quietly add new ones.</h1>
        <p>
          Venture is working toward a service that can be understood and used by people with
          different disabilities, devices, communication needs, and levels of technical comfort.
        </p>
        <small>Last reviewed July 21, 2026</small>
      </header>

      <section className={styles.summaryGrid} aria-label="Accessibility summary">
        <article>
          <span aria-hidden="true">⌨️</span>
          <strong>Keyboard use</strong>
          <p>Core actions should remain reachable without a mouse or touchscreen.</p>
        </article>
        <article>
          <span aria-hidden="true">🔎</span>
          <strong>Readable layouts</strong>
          <p>Mobile sizing, text wrapping, contrast, and zoom are treated as product requirements.</p>
        </article>
        <article>
          <span aria-hidden="true">🗣️</span>
          <strong>Clear language</strong>
          <p>Instructions and status messages aim to be direct and understandable.</p>
        </article>
        <article>
          <span aria-hidden="true">🧰</span>
          <strong>Continuous repair</strong>
          <p>Accessibility feedback is reviewed alongside bugs and listing corrections.</p>
        </article>
      </section>

      <section className={styles.contentCard}>
        <h2>Venture's current commitments</h2>
        <ul>
          <li>Support keyboard navigation for core browsing, saving, and outing-building flows.</li>
          <li>Use meaningful headings, labels, link text, and accessible names for controls.</li>
          <li>Maintain visible focus states and sufficient colour contrast.</li>
          <li>Allow text wrapping and responsive layouts without horizontal scrolling.</li>
          <li>Respect reduced-motion preferences for non-essential animation.</li>
          <li>Avoid relying on colour alone to communicate status or selection.</li>
          <li>Provide text alternatives or accessible labels for meaningful icons.</li>
          <li>Make accessibility information about venues visible when Venture has reliable data.</li>
        </ul>
      </section>

      <section className={styles.contentCard}>
        <h2>Known beta limitations</h2>
        <p>
          Venture is still being tested. Some map interactions, third-party content, external
          reservation or ticketing services, and incomplete venue accessibility records may not
          provide an equally accessible experience. Accessibility notes supplied by venues or
          public sources may also become outdated.
        </p>
        <p>
          A listing saying that an accessibility feature exists is not a guarantee that it is
          currently available or suitable for every need. Contact the venue directly before a trip
          where a feature is essential.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>Requesting help or an alternative format</h2>
        <p>
          Venture will make reasonable efforts to provide information in another format or explain
          a route, listing, or policy in a more accessible way. Include the page, the barrier, your
          preferred format, and how Venture may contact you.
        </p>
        {contactEmail ? (
          <p>
            Send accessibility requests to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        ) : (
          <p>
            Use the in-app Feedback button, choose <strong>Confusing</strong> or <strong>Other</strong>,
            and begin the message with <strong>Accessibility request</strong>.
          </p>
        )}
      </section>

      <section className={styles.contentCard}>
        <h2>How accessibility feedback is handled</h2>
        <ol>
          <li>Venture records the barrier and the affected page or feature.</li>
          <li>The issue is assessed for immediate repair, workaround, or future planning.</li>
          <li>Where contact permission is provided, Venture may ask clarifying questions.</li>
          <li>Important recurring barriers are included in beta-readiness and product reviews.</li>
        </ol>
      </section>

      <section className={styles.notice}>
        <strong>Related pages</strong>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms of Use</Link>
        </div>
      </section>
    </main>
  );
}
