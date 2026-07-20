"use client";

import Link from "next/link";
import {
  useMemo,
  useState
} from "react";

import type {
  InventoryImportCommitResult,
  InventoryImportEntityType,
  InventoryImportPreview
} from "@/lib/admin/inventory-import-types";

import styles from "./page.module.css";

const MAX_CLIENT_BYTES = 750_000;

function statusLabel(status: string): string {
  if (status === "ready") return "Ready";
  if (status === "warning") return "Review";
  if (status === "duplicate") return "Duplicate";
  return "Error";
}

export default function InventoryImportWorkbench() {
  const [entityType, setEntityType] =
    useState<InventoryImportEntityType>("place");
  const [filename, setFilename] = useState("");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] =
    useState<InventoryImportPreview | null>(null);
  const [commitResult, setCommitResult] =
    useState<InventoryImportCommitResult | null>(null);
  const [busyAction, setBusyAction] =
    useState<"preview" | "commit" | null>(null);
  const [message, setMessage] = useState("");

  const canPreview = Boolean(csvText && filename && !busyAction);
  const canCommit = Boolean(
    preview &&
      preview.importableRows > 0 &&
      !busyAction &&
      !commitResult
  );

  const templateHref = useMemo(
    () =>
      entityType === "place"
        ? "/templates/venture-place-import.csv"
        : "/templates/venture-event-import.csv",
    [entityType]
  );

  function resetResults() {
    setPreview(null);
    setCommitResult(null);
    setMessage("");
  }

  async function handleFile(file: File | undefined) {
    resetResults();

    if (!file) {
      setFilename("");
      setCsvText("");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setMessage("Choose a file ending in .csv.");
      setFilename("");
      setCsvText("");
      return;
    }

    if (file.size > MAX_CLIENT_BYTES) {
      setMessage("Keep each CSV below 750 KB.");
      setFilename("");
      setCsvText("");
      return;
    }

    try {
      const content = await file.text();
      setFilename(file.name);
      setCsvText(content);
      setMessage(`${file.name} is ready for a dry-run preview.`);
    } catch {
      setMessage("The browser could not read that CSV file.");
    }
  }

  async function previewCsv() {
    if (!canPreview) return;

    setBusyAction("preview");
    setCommitResult(null);
    setMessage("Checking every row against Venture's current inventory...");

    try {
      const response = await fetch("/api/admin/import/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          entityType,
          filename,
          csvText
        })
      });

      const result = (await response.json()) as
        | InventoryImportPreview
        | { error?: string };

      if (!response.ok || !("rows" in result)) {
        throw new Error(
          "error" in result && result.error
            ? result.error
            : "Venture could not preview this CSV."
        );
      }

      setPreview(result);
      setMessage(
        result.importableRows > 0
          ? `${result.importableRows} rows can be imported as drafts.`
          : "No rows are currently safe to import."
      );
    } catch (error) {
      setPreview(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "Venture could not preview this CSV."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function commitCsv() {
    if (!canCommit || !preview) return;

    const confirmed = window.confirm(
      `Import ${preview.importableRows} ${entityType === "place" ? "place" : "event"} rows as drafts? Duplicates and invalid rows will be skipped.`
    );

    if (!confirmed) return;

    setBusyAction("commit");
    setMessage("Importing draft records and attaching their source links...");

    try {
      const response = await fetch("/api/admin/import/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          entityType,
          filename,
          csvText
        })
      });

      const result = (await response.json()) as
        | InventoryImportCommitResult
        | { error?: string };

      if (!response.ok || !("batchId" in result)) {
        throw new Error(
          "error" in result && result.error
            ? result.error
            : "Venture could not complete this import."
        );
      }

      setCommitResult(result);
      setMessage(result.message);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Venture could not complete this import."
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <section className={styles.instructions}>
        <div>
          <p className={styles.eyebrow}>SAFE BULK WORKFLOW</p>
          <h2>Import drafts, never instant publications</h2>
          <p>
            Venture previews every row, checks for duplicates, and requires a
            source URL. Successful rows enter the repair queue as unverified
            drafts.
          </p>
        </div>

        <ol>
          <li>Download the matching template.</li>
          <li>Fill it with legally sourced Winnipeg information.</li>
          <li>Preview errors and duplicates.</li>
          <li>Import valid rows as drafts.</li>
          <li>Verify each record before publishing.</li>
        </ol>
      </section>

      <section className={styles.workbench}>
        <div className={styles.typePicker}>
          <button
            type="button"
            className={entityType === "place" ? styles.activeType : ""}
            onClick={() => {
              setEntityType("place");
              resetResults();
            }}
          >
            Places
          </button>
          <button
            type="button"
            className={entityType === "event" ? styles.activeType : ""}
            onClick={() => {
              setEntityType("event");
              resetResults();
            }}
          >
            Events
          </button>
        </div>

        <a className={styles.templateLink} href={templateHref} download>
          Download {entityType} CSV template
        </a>

        <label className={styles.filePicker}>
          <span>Choose {entityType} CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
            }}
          />
          <strong>{filename || "No file selected"}</strong>
          <small>Maximum 250 data rows and 750 KB per import.</small>
        </label>

        <div className={styles.primaryActions}>
          <button
            type="button"
            onClick={() => {
              void previewCsv();
            }}
            disabled={!canPreview}
          >
            {busyAction === "preview" ? "Previewing..." : "Preview import"}
          </button>

          <button
            type="button"
            className={styles.commitButton}
            onClick={() => {
              void commitCsv();
            }}
            disabled={!canCommit}
          >
            {busyAction === "commit" ? "Importing..." : "Import safe rows"}
          </button>
        </div>

        {message ? (
          <p className={styles.statusMessage} role="status">
            {message}
          </p>
        ) : null}
      </section>

      {preview ? (
        <section className={styles.previewSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>DRY-RUN RESULT</p>
              <h2>{preview.totalRows} CSV rows checked</h2>
            </div>
            <Link href="/admin/import/history">View import history</Link>
          </div>

          <div className={styles.previewMetrics}>
            <article>
              <span>Ready</span>
              <strong>{preview.readyRows}</strong>
            </article>
            <article>
              <span>Review</span>
              <strong>{preview.warningRows}</strong>
            </article>
            <article>
              <span>Duplicates</span>
              <strong>{preview.duplicateRows}</strong>
            </article>
            <article>
              <span>Errors</span>
              <strong>{preview.errorRows}</strong>
            </article>
          </div>

          <div className={styles.rowList}>
            {preview.rows.map((row) => (
              <article className={styles.previewRow} key={row.rowNumber}>
                <header>
                  <div>
                    <span>Row {row.rowNumber}</span>
                    <strong>{row.displayName}</strong>
                    <small>{row.slug || "No slug"}</small>
                  </div>
                  <b className={styles[row.status]}>{statusLabel(row.status)}</b>
                </header>

                {row.messages.length > 0 ? (
                  <ul>
                    {row.messages.map((currentMessage) => (
                      <li key={currentMessage}>{currentMessage}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No blocking issues were found.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {commitResult ? (
        <section className={styles.commitResult}>
          <p className={styles.eyebrow}>IMPORT COMPLETE</p>
          <h2>{commitResult.message}</h2>
          <p>
            Batch {commitResult.batchId.slice(0, 8)} imported {commitResult.importedRows},
            skipped {commitResult.skippedRows}, and failed {commitResult.failedRows}.
          </p>
          <div className={styles.resultActions}>
            <Link href="/admin/data-health">Open repair queue</Link>
            <Link href="/admin/import/history">View import history</Link>
          </div>
        </section>
      ) : null}
    </>
  );
}
