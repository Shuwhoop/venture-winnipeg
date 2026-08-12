"use client";

import { FormEvent, useState } from "react";
import styles from "./support.module.css";

type FormState = "idle" | "sending" | "sent" | "error";

export function SupportForm() {
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;

    setState("sending");
    setMessage("");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      category: String(form.get("category") ?? "General help").trim(),
      message: String(form.get("message") ?? "").trim(),
      website: String(form.get("website") ?? "").trim()
    };

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message ?? "Venture could not send your message.");
      }

      setState("sent");
      setMessage(result.message ?? "Your message went through.");
      formElement.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Venture could not send your message.");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.fieldGrid}>
        <label><span>Your name</span><input name="name" type="text" autoComplete="name" maxLength={80} placeholder="Optional" /></label>
        <label><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={180} required placeholder="you@example.com" /></label>
      </div>
      <label><span>What can we help with?</span><select name="category" defaultValue="General help"><option>General help</option><option>Account or sign-in</option><option>Listing correction</option><option>Explore or map</option><option>Build an outing</option><option>Bug or technical issue</option><option>Business or partnership</option></select></label>
      <label><span>Message</span><textarea name="message" required minLength={8} maxLength={4000} rows={7} placeholder="Tell us what happened or what you need help with." /></label>
      <label className={styles.honeypot} aria-hidden="true">Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
      <button className={styles.submit} type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending..." : "Send to Venture"}</button>
      {message ? <p className={state === "sent" ? styles.success : styles.error} role={state === "error" ? "alert" : "status"}>{message}</p> : null}
    </form>
  );
}
