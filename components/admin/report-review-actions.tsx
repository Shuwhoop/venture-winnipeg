"use client";

import {
  FormEvent,
  useState
} from "react";
import {
  useRouter
} from "next/navigation";

import styles from "./queue-review-actions.module.css";

export function ReportReviewActions({
  reportId,
  currentStatus,
  currentNotes
}: {
  reportId: string;
  currentStatus: string;
  currentNotes: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState(false);

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError(false);

    const form =
      new FormData(event.currentTarget);

    try {
      const response = await fetch(
        `/api/admin/reports/${reportId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            status: form.get("status"),
            resolutionNotes:
              form.get("resolutionNotes")
          })
        }
      );
      const result =
        await response.json() as {
          error?: string;
          message?: string;
        };

      if (!response.ok) {
        throw new Error(
          result.error ||
            "The report could not be updated."
        );
      }

      setMessage(
        result.message ||
          "Report updated."
      );
      router.refresh();
    } catch (caught) {
      setError(true);
      setMessage(
        caught instanceof Error
          ? caught.message
          : "The report could not be updated."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={submit}
    >
      <select
        name="status"
        defaultValue={currentStatus}
      >
        <option value="open">Open</option>
        <option value="triaged">Triaged</option>
        <option value="investigating">Investigating</option>
        <option value="resolved">Resolved</option>
        <option value="rejected">Rejected</option>
      </select>
      <textarea
        name="resolutionNotes"
        defaultValue={currentNotes ?? ""}
        maxLength={1500}
        placeholder="What was checked or changed?"
      />
      <button
        type="submit"
        disabled={saving}
      >
        {saving ? "Saving…" : "Update report"}
      </button>
      {message ? (
        <p
          className={`${styles.message} ${
            error
              ? styles.error
              : styles.success
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
