import type {
  Metadata
} from "next";

import NewsletterSignup from "@/components/newsletter-signup/newsletter-signup";

import styles from "./page.module.css";


export const metadata:
  Metadata = {
    title:
      "The Thursday Venture | Venture by Boogie Bangers",
    description:
      "Subscribe for standout Winnipeg events, local food and drink spots, outing ideas, and major Venture updates."
  };


export default function NewsletterPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span>
          THE THURSDAY VENTURE
        </span>

        <h1>
          Your weekend starts before Friday.
        </h1>

        <p>
          A focused Winnipeg roundup built to help people meet up, try more local places, and turn “what should we do?” into an actual plan.
        </p>

        <div className={styles.heroBadges}>
          <span>
            Thursday delivery
          </span>

          <span>
            Confirmed subscribers only
          </span>

          <span>
            Unsubscribe anytime
          </span>
        </div>
      </header>

      <NewsletterSignup
        placement="page"
      />

      <section className={styles.promise}>
        <div>
          <span>
            🎟️
          </span>

          <strong>
            Worthwhile events
          </strong>

          <p>
            Major city moments and smaller local gems.
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
            Restaurants, drinks, and places worth supporting.
          </p>
        </div>

        <div>
          <span>
            🗺️
          </span>

          <strong>
            Complete ideas
          </strong>

          <p>
            Outing combinations that make planning feel lighter.
          </p>
        </div>
      </section>

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
              Enter your name and email.
            </p>
          </article>

          <article>
            <strong>
              2
            </strong>

            <p>
              Confirm through the email Venture sends you.
            </p>
          </article>

          <article>
            <strong>
              3
            </strong>

            <p>
              Receive the city edit each Thursday.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
