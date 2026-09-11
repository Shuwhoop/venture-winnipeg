"use client";

import { useState } from "react";

import type { VentureNewsletterDraft } from "@/lib/newsletter/campaign-draft";

import styles from "./draft-vault.module.css";

const STORAGE_KEY = "venture-newsletter-draft-v1";

type VaultResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  draft?: VentureNewsletterDraft | null;
  savedAt?: string | null;
  broadcastId?: string;
};

function readError(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return "Venture could not complete that draft action.";
}

async function readJson(response: Response): Promise<VaultResult> {
  let data: unknown = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(readError(data));
  }

  return data as VaultResult;
}

export function NewsletterDraftVault() {
  const [busy, setBusy] = useState<"save" | "restore" | "broadcast" | "">("");
  const [notice, setNotice] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function saveDraft() {
    if (busy) {
      return;
    }

    setBusy("save");
    setNotice(null);

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        throw new Error(
          "No browser draft was found yet. Make one edit in the studio, then save again."
        );
      }

      const draft = JSON.parse(stored) as VentureNewsletterDraft;
      const response = await fetch("/api/admin/newsletter/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ draft })
      });

      const result = await readJson(response);

      setNotice({
        tone: "success",
        text: result.message || "Draft saved to Venture."
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Venture could not save the draft."
      });
    } finally {
      setBusy("");
    }
  }

  async function restoreLatest() {
    if (busy) {
      return;
    }

    setBusy("restore");
    setNotice(null);

    try {
      const response = await fetch("/api/admin/newsletter/issues", {
        method: "GET",
        cache: "no-store"
      });

      const result = await readJson(response);

      if (!result.draft) {
        setNotice({
          tone: "info",
          text: "No saved Venture draft exists yet."
        });
        return;
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.draft));
      window.location.reload();
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Venture could not restore the latest draft."
      });
    } finally {
      setBusy("");
    }
  }

  async function createEditorialBroadcast() {
    if (busy) {
      return;
    }

    setBusy("broadcast");
    setNotice(null);

    try {
      const response = await fetch(
        "/api/admin/newsletter/issues/broadcast",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        }
      );

      const result = await readJson(response);

      setNotice({
        tone: "success",
        text:
          result.message ||
          "Editorial Resend draft created. Review it before sending."
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Venture could not create the Resend draft."
      });
    } finally {
      setBusy("");
    }
  }

  return (
    <section className={styles.vault} aria-label="Newsletter draft vault">
      <div className={styles.copy}>
        <span>DRAFT VAULT</span>
        <strong>Keep Issue 001 in Venture, not only this browser.</strong>
        <p>
          The studio still autosaves locally. The vault keeps durable Supabase
          issues, lets you preview the full saved edition, and can turn it into
          a reviewable Resend draft without sending it.
        </p>
      </div>

      <div className={styles.actions}>
        <button disabled={busy !== ""} onClick={saveDraft} type="button">
          {busy === "save" ? "Saving…" : "Save to Venture"}
        </button>

        <button
          className={styles.secondary}
          disabled={busy !== ""}
          onClick={restoreLatest}
          type="button"
        >
          {busy === "restore" ? "Restoring…" : "Restore latest"}
        </button>

        <a
          className={styles.secondary}
          href="/api/admin/newsletter/issues/preview"
          rel="noreferrer"
          target="_blank"
        >
          Preview full editorial issue
        </a>

        <button
          disabled={busy !== ""}
          onClick={createEditorialBroadcast}
          type="button"
        >
          {busy === "broadcast"
            ? "Creating Resend draft…"
            : "Create editorial Resend draft"}
        </button>
      </div>

      {notice ? (
        <p
          className={`${styles.notice} ${styles[notice.tone]}`}
          role="status"
        >
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}
