import Link from "next/link";
import { SupportForm } from "@/app/support/support-form";
import styles from "./support.module.css";

export const metadata = { title: "Contact Venture" };

export default function SupportPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>VENTURE SUPPORT</span>
        <h1>Talk to a real person.</h1>
        <p>Questions, account trouble, listing corrections, bugs, partnerships, or something that just feels off. Send it here and it goes directly to Venture.</p>
      </section>
      <section className={styles.card}>
        <div className={styles.cardHeading}><div className={styles.mailIcon} aria-hidden="true">@</div><div><strong>Contact Venture</strong><small>Direct support inbox</small></div></div>
        <SupportForm />
      </section>
      <aside className={styles.directNote}><strong>Prefer your own email app?</strong><a href="mailto:venturebangers@gmail.com?subject=Venture%20Support">venturebangers@gmail.com</a></aside>
      <Link className={styles.backLink} href="/profile">Back to profile</Link>
    </main>
  );
}
