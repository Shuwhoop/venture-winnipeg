"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import styles from "./page.module.css";

type FormStatus = "idle" | "submitting" | "success" | "error";

type SubmissionType = "event" | "place" | "find" | "other";

export default function SubmitToVenturePage() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const [submissionType, setSubmissionType] = useState<SubmissionType>("find");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [whenText, setWhenText] = useState("");
  const [whereText, setWhereText] = useState("");
  const [whyText, setWhyText] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [website, setWebsite] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setMessage("Sending it to the Venture desk...");

    try {
      const response = await fetch("/api/newsletter/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionType,
          title,
          sourceUrl,
          whenText,
          whereText,
          whyText,
          submitterName,
          submitterEmail,
          website
        })
      });

      const result = (await response.json()) as {
        ok?: boolean;
        reference?: string;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Venture could not receive that find.");
      }

      setStatus("success");
      setMessage(
        `Got it. It is in the Venture editorial inbox${result.reference ? ` · ${result.reference}` : ""}.`
      );
      setTitle("");
      setSourceUrl("");
      setWhenText("");
      setWhereText("");
      setWhyText("");
      setWebsite("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Venture could not receive that find.");
    }
  }

  return (
    <main className={styles.page}>
      <nav className={styles.topbar} aria-label="Venture website">
        <Link href="/newsletter" className={styles.brand}>Venture</Link>
        <Link href="/newsletter" className={styles.back}>← The Thursday Venture</Link>
      </nav>

      <header className={styles.hero}>
        <div className={styles.sticker}>SEND US THE GOOD STUFF</div>
        <h1>Found something Winnipeg should know about?</h1>
        <p>
          A party in a tiny room. A new food spot. A gallery night. A run club. A weird pop-up.
          Drop it here and Venture will take a look for an upcoming Thursday issue.
        </p>
        <div className={styles.marquee} aria-hidden="true">
          EVENTS ✦ FOOD ✦ CULTURE ✦ NIGHTLIFE ✦ COMMUNITY ✦ SMALL WEIRD THINGS ✦
        </div>
      </header>

      <section className={styles.layout}>
        <aside className={styles.sideNote}>
          <span>HOW IT WORKS</span>
          <strong>You send the lead. We do the digging.</strong>
          <p>
            You do not need an account, and submitting something does not automatically put it on Venture.
            It lands in our editorial inbox first.
          </p>
          <div className={styles.doodle}>↳ keep it simple</div>
        </aside>

        <form className={styles.form} onSubmit={handleSubmit}>
          <fieldset className={styles.typeRow}>
            <legend>What is it?</legend>
            {([
              ["find", "✨ Find"],
              ["event", "🎟 Event"],
              ["place", "📍 Place"],
              ["other", "🌀 Other"]
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={submissionType === value ? styles.activeType : ""}
                onClick={() => setSubmissionType(value)}
              >
                {label}
              </button>
            ))}
          </fieldset>

          <label className={styles.bigField}>
            <span>Name / title *</span>
            <input
              required
              maxLength={180}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What should we look up?"
            />
          </label>

          <div className={styles.twoCol}>
            <label>
              <span>Link</span>
              <input
                type="url"
                maxLength={600}
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="Instagram, Eventbrite, website..."
              />
            </label>
            <label>
              <span>Where</span>
              <input
                maxLength={220}
                value={whereText}
                onChange={(event) => setWhereText(event.target.value)}
                placeholder="Venue, neighbourhood, address..."
              />
            </label>
          </div>

          <label>
            <span>When</span>
            <input
              maxLength={180}
              value={whenText}
              onChange={(event) => setWhenText(event.target.value)}
              placeholder="Saturday night, Sept 19 at 8 PM..."
            />
          </label>

          <label className={styles.bigField}>
            <span>Why should Venture know about it? *</span>
            <textarea
              required
              rows={6}
              maxLength={1800}
              value={whyText}
              onChange={(event) => setWhyText(event.target.value)}
              placeholder="Give us the quick version. What makes it worth putting on someone’s radar?"
            />
          </label>

          <details className={styles.contactDetails}>
            <summary>Want us to know who sent it?</summary>
            <div className={styles.twoCol}>
              <label>
                <span>Your name</span>
                <input
                  maxLength={150}
                  value={submitterName}
                  onChange={(event) => setSubmitterName(event.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  maxLength={320}
                  value={submitterEmail}
                  onChange={(event) => setSubmitterEmail(event.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>
          </details>

          <label className={styles.honeypot} aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
          </label>

          <button className={styles.submitButton} disabled={status === "submitting"} type="submit">
            {status === "submitting" ? "Sending..." : "Send it to Venture →"}
          </button>

          {message ? (
            <p className={`${styles.message} ${status === "success" ? styles.success : status === "error" ? styles.error : ""}`} role="status">
              {message}
            </p>
          ) : null}
        </form>
      </section>

      <footer className={styles.footer}>
        <strong>Venture by Boogie Bangers</strong>
        <span>Winnipeg, edited into one useful Thursday read.</span>
      </footer>
    </main>
  );
}
