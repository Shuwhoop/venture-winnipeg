import type { Metadata } from "next";

import Link from "next/link";

import styles from "../trust-pages.module.css";

export const metadata: Metadata = {
  title: "Terms of Use | Venture by Boogie Bangers",
  description: "The terms that apply when using Venture's Winnipeg city-discovery service."
};

const contactEmail =
  process.env.NEXT_PUBLIC_VENTURE_CONTACT_EMAIL?.trim() || "";

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <header className={`${styles.hero} ${styles.termsHero}`}>
        <span>TERMS OF USE</span>
        <h1>The city is real. The app is a guide, not a crystal ball.</h1>
        <p>
          These terms explain the ground rules for using Venture during its Winnipeg beta.
        </p>
        <small>Effective July 21, 2026</small>
      </header>

      <section className={styles.summaryGrid} aria-label="Terms summary">
        <article>
          <span aria-hidden="true">📍</span>
          <strong>Verify before going</strong>
          <p>Hours, prices, availability, accessibility, and event details can change.</p>
        </article>
        <article>
          <span aria-hidden="true">🎟️</span>
          <strong>External purchases</strong>
          <p>Tickets, reservations, directions, and payments may be handled elsewhere.</p>
        </article>
        <article>
          <span aria-hidden="true">✍️</span>
          <strong>Submit responsibly</strong>
          <p>Only provide accurate information and content you are allowed to share.</p>
        </article>
        <article>
          <span aria-hidden="true">🛠️</span>
          <strong>Beta service</strong>
          <p>Features and inventory may change while Venture is being tested.</p>
        </article>
      </section>

      <section className={styles.contentCard}>
        <h2>1. Accepting these terms</h2>
        <p>
          By using Venture, you agree to these Terms of Use and the Privacy page. Do not use the
          service if you do not agree. A parent or legal guardian should supervise use by anyone
          who is not legally able to agree to these terms on their own.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>2. What Venture provides</h2>
        <p>
          Venture is a city-discovery service that organizes information about places, events,
          and possible outing routes. It is not the business, event organizer, transportation
          provider, ticket seller, reservation platform, emergency service, or payment processor
          unless a future feature clearly says otherwise.
        </p>
        <p>
          Recommendations and outing routes are generated from available Venture inventory and
          user preferences. They are suggestions, not guarantees that a place will be open,
          suitable, available, safe, accessible, affordable, or enjoyable for every person.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>3. Check official information</h2>
        <p>
          Businesses and events can change hours, prices, menus, age restrictions, ticket
          availability, accessibility, parking, transit conditions, and policies without notice.
          Check the linked official source before travelling, purchasing, or making plans.
        </p>
        <p>
          Maps and directions may be supplied by third parties. Follow local laws, posted signs,
          weather advisories, transit notices, and common-sense safety precautions.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>4. User submissions, corrections, and claims</h2>
        <p>When submitting information, you agree that:</p>
        <ul>
          <li>The information is accurate to the best of your knowledge.</li>
          <li>You have the right to provide any text, images, contact details, or other material.</li>
          <li>You will not impersonate a business, organizer, owner, or representative.</li>
          <li>You will not submit unlawful, harmful, misleading, abusive, or privacy-invasive material.</li>
          <li>Venture may verify, edit, decline, archive, or remove the submission.</li>
        </ul>
        <p>
          You give Venture a non-exclusive, worldwide, royalty-free licence to use, format, edit,
          display, and distribute submitted material only as reasonably needed to operate, improve,
          promote, and document the Venture service. You keep ownership of content you own.
        </p>
        <p>
          A business claim request does not automatically transfer control of a listing. Venture may
          request proof and may approve, decline, limit, or revoke claimed access to protect accuracy.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>5. Acceptable use</h2>
        <p>You may not:</p>
        <ul>
          <li>Attempt to bypass security, rate limits, authentication, or administrative controls.</li>
          <li>Scrape, copy, or republish Venture data at scale without written permission.</li>
          <li>Use automated tools that harm performance or interfere with other users.</li>
          <li>Upload malware, fraudulent claims, spam, or content that violates another person's rights.</li>
          <li>Use Venture to facilitate illegal activity or create unsafe situations.</li>
        </ul>
      </section>

      <section className={styles.contentCard}>
        <h2>6. Saved and shared outings</h2>
        <p>
          A shared outing link may be accessible to anyone who receives the link. Do not put private,
          confidential, or sensitive information into an outing title, notes, feedback, or submission.
          Venture may remove shared content that creates legal, safety, privacy, or service-integrity concerns.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>7. Availability, changes, and termination</h2>
        <p>
          Venture is in beta. Features, ranking logic, inventory, providers, and availability may
          change. Venture may suspend or discontinue a feature, remove content, or restrict access
          where reasonably necessary for security, maintenance, law, or service integrity.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>8. Disclaimers and responsibility</h2>
        <p>
          Venture is provided on an "as available" basis. To the fullest extent permitted by law,
          Venture does not guarantee uninterrupted service or the accuracy, completeness, timeliness,
          suitability, accessibility, or availability of third-party listings and services.
        </p>
        <p>
          You remain responsible for your decisions, purchases, transportation, personal safety,
          dietary choices, accessibility planning, age-restricted activity, and interactions with
          businesses, organizers, and other people.
        </p>
        <p>
          To the fullest extent permitted by law, Venture and its operators are not responsible for
          indirect, incidental, special, or consequential loss arising from use of the service or a
          third-party destination. Nothing in these terms removes rights that cannot legally be waived.
        </p>
      </section>

      <section className={styles.contentCard}>
        <h2>9. Contact and updates</h2>
        <p>
          These terms may be updated as Venture grows. Material changes will be reflected by a new
          effective date and, where appropriate, an in-product notice.
        </p>
        {contactEmail ? (
          <p>
            Questions can be sent to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        ) : (
          <p>Use the in-app Feedback button for questions about these terms.</p>
        )}
      </section>

      <section className={styles.notice}>
        <strong>Related pages</strong>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/accessibility">Accessibility</Link>
        </div>
      </section>
    </main>
  );
}
