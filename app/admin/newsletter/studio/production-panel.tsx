"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Resource = { id: string; name: string };
type Overview = {
  activeSubscribers: number;
  subscriberError: string;
  resources: { segment: Resource | null; topic: Resource | null; error: string };
  deliveryConfigured: boolean;
  webhookConfigured: boolean;
  postalAddressConfigured: boolean;
};

async function post(path: string, body: unknown = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Venture could not complete that action.");
  }
  return data;
}

export function NewsletterProductionPanel({ initialOverview }: { initialOverview: Overview }) {
  const [resources, setResources] = useState(initialOverview.resources);
  const [busy, setBusy] = useState<"setup" | "sync" | "">("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function setup() {
    setBusy("setup"); setNotice(null);
    try {
      const result = await post("/api/admin/newsletter/setup");
      setResources({ segment: result.segment || null, topic: result.topic || null, error: "" });
      setNotice({ tone: "success", text: "Resend segment and topic are ready." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Setup failed." });
    } finally { setBusy(""); }
  }

  async function sync() {
    setBusy("sync"); setNotice(null);
    try {
      const result = await post("/api/admin/newsletter/sync", { offset: 0 });
      setNotice({ tone: result.failed ? "error" : "success", text: `Synced ${result.succeeded || 0} subscriber${result.succeeded === 1 ? "" : "s"}. ${result.failed || 0} failed.` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Sync failed." });
    } finally { setBusy(""); }
  }

  return <>
    <section className={styles.readiness} aria-label="Newsletter readiness">
      <article className={initialOverview.deliveryConfigured ? styles.ready : styles.blocked}><span>DELIVERY</span><strong>{initialOverview.deliveryConfigured ? "Resend connected" : "Resend incomplete"}</strong><p>Sender: venture@updates.boogiebangers.com</p></article>
      <article className={resources.segment && resources.topic ? styles.ready : styles.warning}><span>AUDIENCE</span><strong>{resources.segment && resources.topic ? "Segment and topic ready" : "Setup required"}</strong><p>{resources.segment?.name || "No segment"} · {resources.topic?.name || "No topic"}</p></article>
      <article className={initialOverview.webhookConfigured ? styles.ready : styles.warning}><span>DELIVERY SAFETY</span><strong>{initialOverview.webhookConfigured ? "Webhook connected" : "Webhook not connected"}</strong><p>Bounces, complaints and opt-outs stay synced.</p></article>
      <article className={initialOverview.postalAddressConfigured ? styles.ready : styles.blocked}><span>FOOTER</span><strong>{initialOverview.postalAddressConfigured ? "Mailing address present" : "Mailing address missing"}</strong><p>Required contact information for public sends.</p></article>
    </section>
    <section className={styles.commandBar}>
      <div><span>CONFIRMED AUDIENCE</span><strong>{initialOverview.activeSubscribers}</strong><small>active subscriber{initialOverview.activeSubscribers === 1 ? "" : "s"}</small></div>
      <button disabled={busy !== ""} onClick={setup} type="button">{busy === "setup" ? "Preparing…" : "Prepare Resend audience"}</button>
      <button disabled={busy !== "" || !resources.segment || !resources.topic} onClick={sync} type="button">{busy === "sync" ? "Syncing…" : "Sync active subscribers"}</button>
    </section>
    {notice ? <div className={`${styles.notice} ${styles[notice.tone]}`} role="status">{notice.text}</div> : null}
    {resources.error || initialOverview.subscriberError ? <div className={`${styles.notice} ${styles.error}`}>{resources.error || initialOverview.subscriberError}</div> : null}
  </>;
}
