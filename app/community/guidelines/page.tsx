import type {
  Metadata
} from "next";

import Link from "next/link";

import styles from "../community.module.css";

export const metadata: Metadata = {
  title:
    "Community Guidelines | Venture",
  description:
    "Guidelines for Venture is Building community experiences."
};

export default function CommunityGuidelinesPage() {
  return (
    <main
      className={
        styles.detailPage
      }
    >
      <section
        className={`${styles.panel} ${styles.panelYellow}`}
      >
        <header>
          <span>
            VENTURE IS BUILDING
          </span>

          <h2>
            Community guidelines
          </h2>
        </header>

        <p>
          Venture community experiences happen
          in public places and are designed to
          be welcoming to people arriving alone
          or with a friend.
        </p>

        <p>
          Treat hosts, venue staff, and other
          attendees with respect. Harassment,
          discrimination, intimidation,
          unwanted sexual attention, violence,
          and deliberate disruption are not
          accepted.
        </p>

        <p>
          Respect personal boundaries. Do not
          pressure anyone to share contact
          details, drink alcohol, continue to
          another stop, or participate in an
          activity they have declined.
        </p>

        <p>
          Follow venue rules, age requirements,
          and safety instructions. Venture may
          remove an attendee from current or
          future experiences when behaviour
          creates a safety or trust concern.
        </p>

        <p>
          If something feels unsafe, contact the
          identified host or venue staff. In an
          emergency, contact local emergency
          services.
        </p>

        <Link
          className={
            styles.heroLink
          }
          href="/community"
        >
          Return to Venture is Building
        </Link>
      </section>
    </main>
  );
}
