"use client";

import { useState } from "react";
import styles from "./draft-vault.module.css";

type VaultResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  broadcastId?: string;
};

function readError(value: unknown): string {
  if (value && typeof value === "object" && "error" in value && typeof value.error === "string") {
    return value.error;
  }
  return "Venture could not complete that newsletter action.";
}

async function readJson(response: Response): Promise<VaultResult> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(readError(data));
  return data as VaultResult;
}

export function NewsletterDraftVault() {
  const [busy, setBusy] = useState<"test" | "broadcast" | "">("");
  const [notice, setNotice] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function sendEditorialTest() {
    if (busy) return;
    setBusy("test");
    setNotice(null);
    try {
      const result = await readJson(await fetch("/api/admin/newsletter/issues/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      }));
      setNotice({ tone: "success", text: result.message || "Full issue test sent to your admin email." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Venture could not send the issue test." });
    } finally {
      setBusy("");
    }
  }

  async function createEditorialBroadcast() {
    if (busy) return;
    setBusy("broadcast");
    setNotice(null);
    try {
      const result = await readJson(await fetch("/api/admin/newsletter/issues/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      }));
      setNotice({ tone: "success", text: result.message || "Editorial Resend draft created. Review it before sending." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Venture could not create the Resend draft." });
    } finally {
      setBusy("");
    }
  }

  return (
    <section className={styles.vault} aria-label="Newsletter review and handoff">
      <div className={styles.copy}>
        <span>REVIEW & HANDOFF</span>
        <strong>Save above. Review here. Send later.</strong>
        <p>
          The editorial builder is now the source of truth. Preview the exact saved issue,
          send yourself a private test, then create a Resend draft only when the issue feels finished.
        </p>
      </div>

      <div className={styles.actions}>
        <a className={styles.secondary} href="/api/admin/newsletter/issues/preview" rel="noreferrer" target="_blank">
          Preview full issue
        </a>
        <button className={styles.secondary} disabled={busy !== ""} onClick={sendEditorialTest} type="button">
          {busy === "test" ? "Sending test…" : "Send issue test to me"}
        </button>
        <button disabled={busy !== ""} onClick={createEditorialBroadcast} type="button">
          {busy === "broadcast" ? "Creating Resend draft…" : "Create Resend draft"}
        </button>
      </div>

      {notice ? <p className={`${styles.notice} ${styles[notice.tone]}`} role="status">{notice.text}</p> : null}
    </section>
  );
}
