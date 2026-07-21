import type { Metadata } from "next";

import Link from "next/link";

import styles from "../trust-pages.module.css";

export const metadata: Metadata = {
  title: "Privacy | Venture by Boogie Bangers",
  description: "How Venture collects, uses, protects, and manages personal information."
};

const contactEmail =
  process.env.NEXT_PUBLIC_VENTURE_CONTACT_EMAIL?.trim() || "";

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <header className={`${styles.hero} ${styles.privacyHero}`}>
        <span>PRIVACY</span>
        <h1>Your city plans should not become a surveillance novel.</h1>
        <p>
          This page explains what Venture collects during the Winnipeg beta, why it is
          collected, and the choices available to you.
        </p>
        <small>Effective July 21, 2026</small>
      </header>

      <section className={styles.summaryGrid} aria-label="Privacy summary">
        <article>
          <span aria-hidden="true">🧭</span>
          <strong>Limited analytics</strong>
          <p>Anonymous identifiers and product interactions help improve Venture.</p>
        </article>
        <article>
          <span aria-hidden="true">📬</span>
          <strong>Opt-in email</strong>
          <p>Newsletter messages are sent only after consent and include unsubscribe.</p>
        </article>
        <article>
          <span aria-hidden="true">🗂️</span>
          <strong>Your submissions</strong>
          <p>Contact details are used to review feedback, claims, reports, and listings.</p>
        </article>
        <article>
          <span aria-hidden="true">🔐</span>
          <strong>Protected access</strong>
          <p>Administrative records are restricted and handled through trusted providers.</p>
        </article>
      </section>

      <section className={styles.contentCard}>
        <h2>1. What Venture collects</h2>
        <h3>Anonymous product analytics</h3>
        <p>
          Venture may create random visitor and session identifiers in your browser. We may
          record page paths, feature interactions, device class, viewport size, referral host,
          timestamps, and whether a visit appears new or returning. These records are used to
          understand whether discovery, listing, saving, sharing, and outing-building features
          work properly.
        </p>
        <p>
          Venture does not intentionally place your name or email address inside ordinary
          analytics events. An IP address may be processed temporarily for security, abuse
          prevention, or hosting operations, but it is not intended to become part of the
          product analytics profile.
        </p>

        <h3>Information you choose to provide</h3>
        <ul>
          <li>Newsletter email address, consent status, and unsubscribe records.</li>
          <li>Feedback messages, ratings, optional contact email, and permission to follow up.</li>
          <li>Listing submissions, corrections, business claims, and incorrect-information reports.</li>
          <li>Information included when you contact Venture directly.</li>
        </ul>

        <h3>Browser-stored preferences</h3>
        <p>
          Saved listings, saved outings, profile preferences, and unfinished outing drafts may
          be stored locally in your browser. Clearing browser storage can remove this information.
          When you deliberately create a shareable outing, the route may be stored on Venture's
          systems so the share link can work.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>2. Why Venture uses information</h2>
        <ul>
          <li>Operate, secure, troubleshoot, and improve the service.</li>
          <li>Generate and share outings requested by users.</li>
          <li>Review listing submissions, corrections, claims, and reports.</li>
          <li>Respond to feedback and support requests.</li>
          <li>Send The Thursday Venture and related email only where consent permits.</li>
          <li>Measure beta performance without building advertising profiles.</li>
          <li>Meet legal, fraud-prevention, recordkeeping, and safety obligations.</li>
        </ul>
        <p>
          Venture does not sell personal information to advertisers. Sponsored placements, when
          introduced, will be labelled and kept separate from organic ranking.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>3. Service providers and external links</h2>
        <p>
          Venture relies on service providers for hosting, databases, authentication, email,
          maps, and related infrastructure. Current working providers include Vercel, Supabase,
          Resend, and a configured MapLibre-compatible map provider. These providers process
          information under their own terms and security programs.
        </p>
        <p>
          Links to businesses, organizers, ticketing services, Google Maps, reservation services,
          and other external websites are governed by those services' privacy practices. Venture
          does not control what happens after you leave the app.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>4. Retention and protection</h2>
        <p>
          Information is retained only as long as reasonably needed for the purpose it was
          collected, legal obligations, dispute handling, security, and reliable operations.
          Newsletter suppression records may be retained so Venture does not accidentally email
          someone who unsubscribed. Backups may keep limited copies for a short operational period.
        </p>
        <p>
          Venture uses access restrictions, protected administrative routes, row-level database
          controls where applicable, rate limiting, audit records, and reputable infrastructure
          providers. No online service can promise perfect security, so sensitive personal details
          should not be placed in ordinary feedback or listing forms.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>5. Your choices and requests</h2>
        <ul>
          <li>Use the unsubscribe link in any newsletter email.</li>
          <li>Clear browser storage to remove locally saved preferences and identifiers.</li>
          <li>Ask to access or correct personal information Venture holds about you.</li>
          <li>Ask Venture to delete information where retention is not legally or operationally required.</li>
          <li>Withdraw optional permission to be contacted about beta feedback.</li>
        </ul>
        {contactEmail ? (
          <p>
            Send privacy requests to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        ) : (
          <p>
            Use the in-app Feedback button and begin the message with <strong>Privacy request</strong>.
            A dedicated contact email must be configured before the beta expands broadly.
          </p>
        )}
      </section>

      <section className={styles.notice}>
        <strong>Related pages</strong>
        <div>
          <Link href="/terms">Terms of Use</Link>
          <Link href="/accessibility">Accessibility</Link>
        </div>
      </section>
    </main>
  );
}
