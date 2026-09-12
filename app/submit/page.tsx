"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import styles from "./page.module.css";

type Status = "idle" | "submitting" | "success" | "error";

const kinds = [
  ["event", "🎟️", "Event"],
  ["food", "🍜", "Food"],
  ["nightlife", "🪩", "Nightlife"],
  ["culture", "🎨", "Culture"],
  ["community", "🤝", "Community"],
  ["place", "📍", "Place"],
  ["other", "✦", "Something else"]
] as const;

export default function SubmitFindPage() {
  const [kind, setKind] = useState("event");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [note, setNote] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setMessage("Dropping it into the Venture edit room…");

    try {
      const response = await fetch("/api/newsletter/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title,
          sourceUrl,
          note,
          submitterName,
          submitterEmail,
          website
        })
      });

      const result = await response.json() as {
        ok?: boolean;
        reference?: string;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Venture could not save that find.");
      }

      setStatus("success");
      setMessage(
        `Got it. It is in the editorial pile${result.reference ? ` · ${result.reference}` : ""}. Nothing is published automatically.`
      );
      setTitle("");
      setSourceUrl("");
      setNote("");
      setWebsite("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Venture could not save that find.");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.backRow}>
        <Link href="/newsletter">← Back to Thursday Venture</Link>
        <span>WINNIPEG → VENTURE</span>
      </div>

      <header className={styles.hero}>
        <div>
          <span>PUT US ON</span>
          <h1>Know something Winnipeg should know?</h1>
          <p>
            Send Venture the breadcrumb. A party, pop-up, restaurant thing, run club,
            gallery night, market, tiny community event, strange new place, whatever.
            You do not need to write the listing for us. We will do the digging.
          </p>
        </div>

        <aside>
          <strong>Keep it easy.</strong>
          <p>
            A name and a link can be enough. Every find lands in Venture&apos;s private
            editorial inbox. It never goes straight onto the site or into an email.
          </p>
        </aside>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.kindSection}>
          <span className={styles.eyebrow}>WHAT KIND OF THING?</span>
          <div className={styles.kindGrid}>
            {kinds.map(([value, emoji, label]) => (
              <button
                className={kind === value ? styles.activeKind : ""}
                key={value}
                onClick={() => setKind(value)}
                type="button"
              >
                <span>{emoji}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.formCard}>
          <div className={styles.sectionHeading}>
            <span>THE BREADCRUMB</span>
            <h2>Give us just enough to chase it.</h2>
          </div>

          <label className={styles.field}>
            <span>What is it?</span>
            <input
              maxLength={200}
              placeholder="Lucky Duck Night Market, new ramen spot, Sunday run club…"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Link · optional</span>
            <input
              maxLength={700}
              placeholder="Instagram, Eventbrite, website, post, flyer link…"
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>What should we know? · optional if you gave us a link</span>
            <textarea
              maxLength={2400}
              placeholder="Why it caught your eye, date/time, where it is, who is behind it, or just: 'this looks sick.'"
              rows={5}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </section>

        <section className={styles.contactCard}>
          <div className={styles.sectionHeading}>
            <span>WHO PUT US ON?</span>
            <h2>So we know who sent it.</h2>
          </div>

          <div className={styles.two}>
            <label className={styles.field}>
              <span>Your name</span>
              <input
                autoComplete="name"
                maxLength={120}
                required
                value={submitterName}
                onChange={(event) => setSubmitterName(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Your email</span>
              <input
                autoComplete="email"
                maxLength={320}
                required
                type="email"
                value={submitterEmail}
                onChange={(event) => setSubmitterEmail(event.target.value)}
              />
            </label>
          </div>

          <label className={styles.honeypot} aria-hidden="true">
            Website
            <input
              autoComplete="off"
              tabIndex={-1}
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </label>

          <p className={styles.finePrint}>
            This does not subscribe you to the newsletter. Venture may use the contact
            info only to follow up about this submission.
          </p>
        </section>

        {message ? (
          <p className={`${styles.message} ${styles[status]}`} role="status">
            {message}
          </p>
        ) : null}

        <button className={styles.submitButton} disabled={status === "submitting"} type="submit">
          {status === "submitting" ? "Sending to the edit room…" : "Put Venture on →"}
        </button>
      </form>
    </main>
  );
}
