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
    <main
      className={
        styles.page
      }
    >
      <header
        className={
          styles.hero
        }
      >
        <span>
          THE THURSDAY VENTURE
        </span>

        <h1>
          Your weekend starts
          before Friday.
        </h1>

        <p>
          A thoughtful Winnipeg roundup
          from Venture by Boogie Bangers,
          built to help people meet up,
          try more local places, and make
          better memories.
        </p>
      </header>

      <NewsletterSignup
        placement="page"
      />

      <section
        className={
          styles.promise
        }
      >
        <div>
          <span>
            🎟️
          </span>

          <strong>
            Worthwhile events
          </strong>

          <p>
            Major city moments and
            smaller local gems.
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
            Restaurants, drinks, and
            places worth supporting.
          </p>
        </div>

        <div>
          <span>
            ✦
          </span>

          <strong>
            Complete ideas
          </strong>

          <p>
            Outing combinations that
            make planning feel lighter.
          </p>
        </div>
      </section>
    </main>
  );
}
