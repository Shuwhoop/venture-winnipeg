import type {
  Metadata
} from "next";

import Link from "next/link";

import NewsletterSignup from "@/components/newsletter-signup/newsletter-signup";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title:
    "The Thursday Venture | Venture by Boogie Bangers",
  description:
    "A curated Winnipeg city digest covering what is happening now: events, nightlife, food, culture, free finds, local openings, and things worth knowing before the weekend."
};

export default function NewsletterPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span>THE THURSDAY VENTURE</span>

        <h1>
          What is happening in Winnipeg, edited into one useful read.
        </h1>

        <p>
          Think Winnipeg digest, but with Venture&apos;s own taste. Every week we scan the city, cross-check the details, and pull together the events, parties, food, culture, free finds, openings, and smaller things worth knowing about right now.
        </p>

        <div className={styles.heroBadges}>
          <span>Thursday delivery</span>
          <span>Winnipeg-focused</span>
          <span>No Venture account required</span>
        </div>
      </header>

      <section className={styles.purpose}>
        <div className={styles.sectionLabel}>
          WHAT IT IS FOR
        </div>

        <div className={styles.purposeGrid}>
          <div>
            <h2>
              Stop finding out after it already happened.
            </h2>

            <p>
              Winnipeg&apos;s good stuff is scattered across venue calendars, ticket sites, Instagram posts, Facebook events, community pages, Reddit threads, flyers, local media, and word of mouth. The Thursday Venture brings those fragments together while they are still useful.
            </p>
          </div>

          <aside>
            <strong>
              A city digest, not a giant event database.
            </strong>

            <p>
              We are not trying to dump every listing in Winnipeg into your inbox. We are trying to tell you what feels relevant, interesting, timely, unusual, or genuinely worth leaving the house for.
            </p>
          </aside>
        </div>
      </section>

      <section className={styles.editionMap}>
        <div className={styles.sectionLabel}>
          INSIDE AN EDITION
        </div>

        <h2>
          The city, with a little hierarchy.
        </h2>

        <div className={styles.editionGrid}>
          <article>
            <span>01</span>
            <strong>The Move</strong>
            <p>The biggest or most interesting thing happening right now.</p>
          </article>

          <article>
            <span>02</span>
            <strong>This Weekend</strong>
            <p>Music, parties, sports, comedy, food, markets, culture, and more.</p>
          </article>

          <article>
            <span>03</span>
            <strong>Lowkey</strong>
            <p>Free finds, smaller rooms, niche events, community things, and quieter gems.</p>
          </article>

          <article>
            <span>04</span>
            <strong>On the Radar</strong>
            <p>Upcoming openings, next-week events, and things worth knowing before everyone else catches on.</p>
          </article>
        </div>
      </section>

      <div id="newsletter-signup" className={styles.signupAnchor}>
        <NewsletterSignup placement="page" />
      </div>

      <section className={styles.promise}>
        <div>
          <span>🎟️</span>
          <strong>What&apos;s happening</strong>
          <p>
            Festivals, concerts, parties, sports, comedy, community events, pop-ups, markets, and niche things that deserve attention.
          </p>
        </div>

        <div>
          <span>🍜</span>
          <strong>What&apos;s new around town</strong>
          <p>
            Food, drinks, local openings, temporary menus, neighbourhood finds, and places suddenly worth knowing about.
          </p>
        </div>

        <div>
          <span>🧭</span>
          <strong>Venture&apos;s point of view</strong>
          <p>
            We research broadly, verify the important details, and edit for usefulness instead of ranking whatever got the most promotion.
          </p>
        </div>
      </section>

      <section className={styles.sourcing}>
        <div>
          <span className={styles.sectionLabel}>
            HOW VENTURE FINDS THINGS
          </span>

          <h2>
            We go where Winnipeg actually posts.
          </h2>

          <p>
            Venture checks organizers and venues first, then widens the search across Eventbrite, Instagram, Facebook Events, Reddit, city and community calendars, local media, neighbourhood pages, independent promoters, and smaller organizations. Social posts can be excellent leads, but important details get corroborated before they make the cut.
          </p>
        </div>

        <div
          className={styles.sourceCloud}
          aria-label="Typical newsletter sources"
        >
          <span>Official venues</span>
          <span>Eventbrite</span>
          <span>Instagram</span>
          <span>Facebook Events</span>
          <span>Reddit</span>
          <span>City calendars</span>
          <span>Community groups</span>
          <span>Local media</span>
        </div>
      </section>

      <section className={styles.accountNote}>
        <div>
          <span className={styles.sectionLabel}>
            NEWSLETTER ≠ ACCOUNT
          </span>
          <h2>
            Just subscribe. You do not need the app side yet.
          </h2>
          <p>
            Right now the newsletter stands on its own. A Venture account can support saves and other features, while the larger app experience will grow later. To get The Thursday Venture, all you need is your name, email, and confirmation.
          </p>
        </div>

        <div className={styles.accountActions}>
          <Link href="/sign-in">
            See Venture accounts
          </Link>
          <a href="#newsletter-signup">
            Join the newsletter
          </a>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <span>HOW IT WORKS</span>

        <h2>
          Two taps, then Thursdays.
        </h2>

        <div>
          <article>
            <strong>1</strong>
            <p>
              Enter your name and email anywhere Venture shows the newsletter form.
            </p>
          </article>

          <article>
            <strong>2</strong>
            <p>
              Confirm through the email Venture sends you. No silent opt-ins.
            </p>
          </article>

          <article>
            <strong>3</strong>
            <p>
              Get the weekly Winnipeg edit and use Venture to check what is happening when you want to dig deeper.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
