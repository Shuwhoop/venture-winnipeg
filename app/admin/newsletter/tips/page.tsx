import Link from "next/link";

import { requireVentureAdmin } from "@/lib/auth/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const kindLabels: Record<string, string> = {
  event: "Event",
  food: "Food",
  nightlife: "Nightlife",
  culture: "Culture",
  community: "Community",
  place: "Place",
  other: "Other"
};

export default async function NewsletterTipsPage() {
  await requireVentureAdmin();
  const supabase = getSupabaseAdminClient();

  const result = await supabase
    .from("newsletter_public_tips")
    .select("id,kind,title,source_url,note,submitter_name,submitter_email,status,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const tips = result.data || [];

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>EDITORIAL INBOX</span>
          <h1>Winnipeg put us on.</h1>
          <p>
            Public finds land here first. Nothing below is automatically published,
            added to the app, or placed into The Thursday Venture.
          </p>
        </div>
        <nav>
          <Link href="/admin/newsletter/studio">Back to studio</Link>
          <Link href="/submit">Open public form</Link>
        </nav>
      </header>

      {result.error ? (
        <p className={styles.error}>Venture could not load the editorial inbox.</p>
      ) : null}

      <section className={styles.summary}>
        <strong>{tips.length}</strong>
        <span>recent public finds</span>
      </section>

      <section className={styles.inbox}>
        {tips.length ? tips.map((tip) => (
          <article key={tip.id}>
            <div className={styles.topline}>
              <span>{kindLabels[tip.kind] || tip.kind}</span>
              <small>{new Date(tip.created_at).toLocaleString("en-CA", { timeZone: "America/Winnipeg" })}</small>
            </div>
            <h2>{tip.title}</h2>
            {tip.note ? <p>{tip.note}</p> : null}
            {tip.source_url ? (
              <a href={tip.source_url} rel="noreferrer" target="_blank">
                Open source ↗
              </a>
            ) : null}
            <footer>
              <span>{tip.submitter_name}</span>
              <a href={`mailto:${tip.submitter_email}`}>{tip.submitter_email}</a>
              <b>{tip.status}</b>
            </footer>
          </article>
        )) : (
          <div className={styles.empty}>
            No public finds yet. When someone uses the Venture submission page, it will
            show up here.
          </div>
        )}
      </section>
    </main>
  );
}
