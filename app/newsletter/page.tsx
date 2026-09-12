import type { Metadata } from "next";
import Link from "next/link";

import NewsletterSignup from "@/components/newsletter-signup/newsletter-signup";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "The Thursday Venture | Venture by Boogie Bangers",
  description:
    "A curated Winnipeg city digest covering events, nightlife, food, culture, free finds, openings, and the things worth knowing before the weekend."
};

export default function NewsletterPage() {
  return (
    <main className={styles.page}>
      <div className={styles.ticker} aria-label="What Venture covers">
        <div>
          <span>WINNIPEG THIS WEEK</span>
          <i>✦</i>
          <span>PARTIES</span>
          <i>✦</i>
          <span>FOOD</span>
          <i>✦</i>
          <span>CULTURE</span>
          <i>✦</i>
          <span>FREE THINGS</span>
          <i>✦</i>
          <span>ODD LITTLE FINDS</span>
        </div>
      </div>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>THE THURSDAY VENTURE</span>
          <h1>Winnipeg is doing too much to hear about it on Monday.</h1>
          <p>
            Venture edits the city into one useful Thursday read. Events, nightlife,
            food, culture, free finds, openings, community things, and the stuff that
            usually lives three Instagram stories deep.
          </p>

          <div className={styles.heroActions}>
            <a href="#newsletter-signup">Get Thursday Venture</a>
            <Link href="/submit">Send us something</Link>
          </div>

          <div className={styles.heroBadges}>
            <span>Every Thursday</span>
            <span>Winnipeg only</span>
            <span>No app account needed</span>
          </div>
        </div>

        <aside className={styles.issueCard}>
          <div className={styles.issueTape}>ISSUE 001</div>
          <span>IN THE EDIT ROOM</span>
          <strong>The Weekend Drop</strong>
          <p>
            Street festivals, night markets, sports, samba, art books, parties,
            comedy, free Sunday plans and whatever else survives the cut.
          </p>
          <div className={styles.issueDots} aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </aside>
      </header>

      <section className={styles.pulse} aria-label="Venture editorial lanes">
        <article>
          <span>01</span>
          <strong>THE MOVE</strong>
          <p>The thing we would hate to tell you about after it happened.</p>
        </article>
        <article>
          <span>02</span>
          <strong>THIS WEEKEND</strong>
          <p>The loud, social, tasty, weird and genuinely worth-it options.</p>
        </article>
        <article>
          <span>03</span>
          <strong>LOWKEY</strong>
          <p>Free finds, smaller rooms, niche events and quieter gems.</p>
        </article>
        <article>
          <span>04</span>
          <strong>ON THE RADAR</strong>
          <p>Next week, new openings and things beginning to bubble.</p>
        </article>
      </section>

      <section className={styles.purpose}>
        <div className={styles.sectionLabel}>WHY THIS EXISTS</div>
        <div className={styles.purposeGrid}>
          <div>
            <h2>Winnipeg posts everywhere. Venture does the digging.</h2>
            <p>
              Venue calendars, Eventbrite, Instagram, Facebook events, Reddit,
              neighbourhood pages, flyers, local media and word of mouth all tell a
              different piece of the story. Venture pulls the useful pieces together
              while there is still time to do something with them.
            </p>
          </div>
          <aside>
            <span>NOT A DATABASE DUMP</span>
            <strong>Edited, not endless.</strong>
            <p>
              We would rather send twelve good reasons to leave the house than eighty
              listings nobody wants to read.
            </p>
          </aside>
        </div>
      </section>

      <div id="newsletter-signup" className={styles.signupAnchor}>
        <NewsletterSignup placement="page" />
      </div>

      <section className={styles.communityCallout}>
        <div className={styles.megaphone} aria-hidden="true">✦</div>
        <div>
          <span className={styles.sectionLabel}>PUT US ON</span>
          <h2>Hosting something? Found something? Tell Venture.</h2>
          <p>
            Parties, pop-ups, markets, run clubs, restaurant events, gallery nights,
            community things, strange little ideas. Send the link and the basics. We
            review it before it enters the editorial pile.
          </p>
        </div>
        <Link href="/submit">Submit a find →</Link>
      </section>

      <section className={styles.promise}>
        <div>
          <span>🎟️</span>
          <strong>Go somewhere</strong>
          <p>Festivals, shows, parties, sports, comedy, markets and community events.</p>
        </div>
        <div>
          <span>🍜</span>
          <strong>Eat something</strong>
          <p>Openings, temporary menus, neighbourhood spots and food worth clocking.</p>
        </div>
        <div>
          <span>🌀</span>
          <strong>Find the odd stuff</strong>
          <p>The tiny, niche, local things that rarely make the obvious city lists.</p>
        </div>
      </section>

      <section className={styles.sourcing}>
        <div>
          <span className={styles.sectionLabel}>WHERE WE LOOK</span>
          <h2>We go where Winnipeg actually posts.</h2>
          <p>
            Organizers and official venues come first. Then we widen the net and
            corroborate the details before something makes the Thursday cut.
          </p>
        </div>
        <div className={styles.sourceCloud} aria-label="Typical Venture sources">
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

      <section className={styles.publicOnly}>
        <div>
          <span className={styles.sectionLabel}>FOR NOW</span>
          <h2>The publication is public. The app stays backstage.</h2>
          <p>
            Venture is launching as the Thursday city edit first. The larger app is
            still being built and is not open to the public yet. Right now, read,
            subscribe, and send us the things Winnipeg should know about.
          </p>
        </div>
        <div className={styles.publicActions}>
          <a href="#newsletter-signup">Join the newsletter</a>
          <Link href="/submit">Send a find</Link>
        </div>
      </section>

      <section className={styles.howItWorks}>
        <span>THE LOOP</span>
        <h2>Find it. Check it. Edit it. Thursday.</h2>
        <div>
          <article>
            <strong>1</strong>
            <p>Winnipeg posts. You submit. Venture searches.</p>
          </article>
          <article>
            <strong>2</strong>
            <p>We verify the important details and decide what deserves space.</p>
          </article>
          <article>
            <strong>3</strong>
            <p>The finished city edit lands in your inbox before the weekend does.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
