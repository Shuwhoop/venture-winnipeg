import type {
  Metadata
} from "next";

import Link from "next/link";

import NewsletterSignup from "@/components/newsletter-signup/newsletter-signup";

import styles from "./page.module.css";


export const metadata:
  Metadata = {
    title:
      "The Thursday Venture | Venture by Boogie Bangers",
    description:
      "A weekly Winnipeg city edit with standout events, local discoveries, low-key finds, nightlife, culture, food, and outing ideas."
  };


export default function NewsletterPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span>
          THE THURSDAY VENTURE
        </span>

        <h1>
          Winnipeg, edited down to the moves worth knowing.
        </h1>

        <p>
          One useful city email before the weekend. Venture searches the obvious places and the corners people usually miss, then turns the noise into a short list you can actually use.
        </p>

        <div className={styles.heroBadges}>
          <span>
            Thursday delivery
          </span>

          <span>
            No Venture account required
          </span>

          <span>
            Confirm once, leave anytime
          </span>
        </div>
      </header>

      <section className={styles.purpose}>
        <div className={styles.sectionLabel}>
          WHAT IT IS FOR
        </div>

        <div className={styles.purposeGrid}>
          <div>
            <h2>
              Less searching. Better weekends.
            </h2>

            <p>
              Winnipeg has plenty happening, but the information is scattered across venue calendars, ticket sites, Instagram posts, Facebook events, community pages, Reddit threads, flyers, and word of mouth. The Thursday Venture pulls those fragments into one city edit.
            </p>
          </div>

          <aside>
            <strong>
              Not a giant event dump.
            </strong>

            <p>
              The goal is not to list everything. It is to surface a useful mix of big moments, smaller finds, cultural events, nightlife, food, free options, and things you probably would not have searched for yourself.
            </p>
          </aside>
        </div>
      </section>

      <section className={styles.editionMap}>
        <div className={styles.sectionLabel}>
          INSIDE AN EDITION
        </div>

        <h2>
          A few lanes, not one kind of night.
        </h2>

        <div className={styles.editionGrid}>
          <article>
            <span>01</span>
            <strong>The Move</strong>
            <p>The standout city-scale pick or the one event worth building a plan around.</p>
          </article>

          <article>
            <span>02</span>
            <strong>This Weekend</strong>
            <p>The strongest mix across music, food, parties, sports, culture, comedy, markets, and more.</p>
          </article>

          <article>
            <span>03</span>
            <strong>Lowkey</strong>
            <p>Free finds, smaller rooms, oddball ideas, art, community events, and quieter alternatives.</p>
          </article>

          <article>
            <span>04</span>
            <strong>Next Week</strong>
            <p>A small heads-up so good plans do not only reach you after tickets disappear.</p>
          </article>
        </div>
      </section>

      <NewsletterSignup
        placement="page"
      />

      <section className={styles.promise}>
        <div>
          <span>
            🎟️
          </span>

          <strong>
            Events with range
          </strong>

          <p>
            Festivals, concerts, community nights, sports, comedy, markets, niche events, and whatever deserves attention.
          </p>
        </div>

        <div>
          <span>
            🍽️
          </span>

          <strong>
            Local discoveries
          </strong>

          <p>
            Food, drinks, places, pop-ups, and neighbourhood stops that can turn one event into a full outing.
          </p>
        </div>

        <div>
          <span>
            🧭
          </span>

          <strong>
            An editor, not an algorithm
          </strong>

          <p>
            Picks are researched, cross-checked, and mixed for usefulness instead of ranked by whoever bought the loudest placement.
          </p>
        </div>
      </section>

      <section className={styles.sourcing}>
        <div>
          <span className={styles.sectionLabel}>
            HOW VENTURE FINDS THINGS
          </span>

          <h2>
            We go where Winnipeg posts.
          </h2>

          <p>
            Venture checks official organizers and venues first, then widens the search across ticketing sites, community calendars, social platforms, local media, Reddit, neighbourhood pages, and smaller organizers. Social posts can be great leads, but important details get corroborated before they make the cut.
          </p>
        </div>

        <div className={styles.sourceCloud} aria-label="Typical newsletter sources">
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
            Subscribe without signing up for Venture.
          </h2>
          <p>
            A Venture account is for saves, synced outings, preferences, and other app features. The newsletter only needs your name, email, and confirmation. They work together, but neither is required for the other.
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

      <div id="newsletter-signup" className={styles.signupAnchor} aria-hidden="true" />

      <section className={styles.howItWorks}>
        <span>
          HOW IT WORKS
        </span>

        <h2>
          Two taps, then Thursdays.
        </h2>

        <div>
          <article>
            <strong>
              1
            </strong>

            <p>
              Enter your name and email anywhere Venture shows the newsletter form.
            </p>
          </article>

          <article>
            <strong>
              2
            </strong>

            <p>
              Confirm through the email Venture sends you. No silent opt-ins.
            </p>
          </article>

          <article>
            <strong>
              3
            </strong>

            <p>
              Get the city edit, then open Venture when you want to explore deeper or build an outing.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
