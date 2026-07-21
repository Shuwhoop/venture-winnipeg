"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState
} from "react";

import type {
  QuickRepairBatchResult,
  QuickRepairChange,
  QuickRepairRecord
} from "@/lib/admin/quick-repair-types";
import {
  QUICK_REPAIR_VERIFICATION_OPTIONS
} from "@/lib/admin/quick-repair-types";
import {
  WINNIPEG_NEIGHBOURHOOD_GROUPS
} from "@/lib/winnipeg-neighbourhoods";

import styles from "./page.module.css";

type EditableRecord = {
  neighbourhood: string;
  primaryCategory: string;
  verificationStatus: string;
  sourceUrl: string;
  sourceCheckedAt: string;
  applyWinnipegDefaults: boolean;
};

type SaveState = {
  tone: "idle" | "saving" | "success" | "error";
  message: string;
};

function dateInputValue(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? parsed.toISOString().slice(0, 10)
    : "";
}

function todayValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function createEditable(record: QuickRepairRecord): EditableRecord {
  return {
    neighbourhood: record.neighbourhood ?? "",
    primaryCategory: record.category,
    verificationStatus: record.verificationStatus,
    sourceUrl: record.primarySourceUrl ?? "",
    sourceCheckedAt: dateInputValue(record.sourceCheckedAt),
    applyWinnipegDefaults: false
  };
}

function sameEditable(left: EditableRecord, right: EditableRecord): boolean {
  return (
    left.neighbourhood === right.neighbourhood &&
    left.primaryCategory === right.primaryCategory &&
    left.verificationStatus === right.verificationStatus &&
    left.sourceUrl === right.sourceUrl &&
    left.sourceCheckedAt === right.sourceCheckedAt &&
    left.applyWinnipegDefaults === right.applyWinnipegDefaults
  );
}

function labelVerification(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function QuickRepairClient({
  records,
  categorySuggestions
}: {
  records: QuickRepairRecord[];
  categorySuggestions: string[];
}) {
  const router = useRouter();
  const [initial, setInitial] = useState<Record<string, EditableRecord>>(() =>
    Object.fromEntries(records.map((record) => [record.key, createEditable(record)]))
  );
  const [drafts, setDrafts] = useState<Record<string, EditableRecord>>(() =>
    Object.fromEntries(records.map((record) => [record.key, createEditable(record)]))
  );
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [batchState, setBatchState] = useState<SaveState>({
    tone: "idle",
    message: ""
  });

  useEffect(() => {
    setInitial((current) => {
      const next = { ...current };
      for (const record of records) {
        if (!next[record.key]) next[record.key] = createEditable(record);
      }
      return next;
    });

    setDrafts((current) => {
      const next = { ...current };
      for (const record of records) {
        if (!next[record.key]) next[record.key] = createEditable(record);
      }
      return next;
    });
  }, [records]);

  const changedKeys = useMemo(
    () =>
      records
        .map((record) => record.key)
        .filter((key) =>
          Boolean(drafts[key] && initial[key] && !sameEditable(drafts[key], initial[key]))
        ),
    [drafts, initial, records]
  );

  function updateField<K extends keyof EditableRecord>(
    key: string,
    field: K,
    value: EditableRecord[K]
  ) {
    setDrafts((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value
      }
    }));
    setStates((current) => ({
      ...current,
      [key]: { tone: "idle", message: "" }
    }));
  }

  function makeChange(record: QuickRepairRecord): QuickRepairChange {
    const draft = drafts[record.key];
    return {
      entityType: record.entityType,
      id: record.id,
      neighbourhood: draft.neighbourhood,
      primaryCategory: draft.primaryCategory,
      verificationStatus: draft.verificationStatus,
      sourceUrl: draft.sourceUrl,
      sourceCheckedAt: draft.sourceCheckedAt,
      applyWinnipegDefaults: draft.applyWinnipegDefaults
    };
  }

  async function sendChanges(changes: QuickRepairChange[]) {
    const response = await fetch("/api/admin/quick-repair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes })
    });

    const payload = (await response.json()) as
      | QuickRepairBatchResult
      | { error?: string };

    if (!response.ok && !("results" in payload)) {
      throw new Error(
        "error" in payload && payload.error
          ? payload.error
          : "Venture could not save the repair."
      );
    }

    return payload as QuickRepairBatchResult;
  }

  async function saveOne(record: QuickRepairRecord) {
    setStates((current) => ({
      ...current,
      [record.key]: { tone: "saving", message: "Saving…" }
    }));

    try {
      const result = await sendChanges([makeChange(record)]);
      const item = result.results[0];

      if (!item?.ok) {
        throw new Error(item?.message ?? "Venture could not save this listing.");
      }

      setInitial((current) => ({
        ...current,
        [record.key]: {
          ...drafts[record.key],
          applyWinnipegDefaults: false
        }
      }));
      setDrafts((current) => ({
        ...current,
        [record.key]: {
          ...current[record.key],
          applyWinnipegDefaults: false
        }
      }));
      setStates((current) => ({
        ...current,
        [record.key]: { tone: "success", message: item.message }
      }));
      router.refresh();
    } catch (error) {
      setStates((current) => ({
        ...current,
        [record.key]: {
          tone: "error",
          message:
            error instanceof Error ? error.message : "Venture could not save this listing."
        }
      }));
    }
  }

  async function saveAll() {
    const changedRecords = records.filter((record) => changedKeys.includes(record.key));

    if (changedRecords.length === 0) return;

    if (changedRecords.length > 50) {
      setBatchState({
        tone: "error",
        message: "Save no more than 50 listings at once."
      });
      return;
    }

    setBatchState({ tone: "saving", message: "Saving changed listings…" });

    try {
      const result = await sendChanges(changedRecords.map(makeChange));
      const resultMap = new Map(result.results.map((item) => [item.key, item]));

      setStates((current) => {
        const next = { ...current };
        for (const record of changedRecords) {
          const item = resultMap.get(record.key);
          next[record.key] = item?.ok
            ? { tone: "success", message: item.message }
            : { tone: "error", message: item?.message ?? "Save failed." };
        }
        return next;
      });

      setInitial((current) => {
        const next = { ...current };
        for (const record of changedRecords) {
          const item = resultMap.get(record.key);
          if (item?.ok) {
            next[record.key] = {
              ...drafts[record.key],
              applyWinnipegDefaults: false
            };
          }
        }
        return next;
      });

      setDrafts((current) => {
        const next = { ...current };
        for (const record of changedRecords) {
          const item = resultMap.get(record.key);
          if (item?.ok) {
            next[record.key] = {
              ...next[record.key],
              applyWinnipegDefaults: false
            };
          }
        }
        return next;
      });

      setBatchState({
        tone: result.failed > 0 ? "error" : "success",
        message:
          result.failed > 0
            ? `${result.saved} saved, ${result.failed} need attention.`
            : `${result.saved} listings saved.`
      });
      router.refresh();
    } catch (error) {
      setBatchState({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Venture could not save these repairs."
      });
    }
  }

  if (records.length === 0) {
    return (
      <section className={styles.emptyState}>
        <h2>No listings match these filters.</h2>
        <p>Change the issue or clear the search to widen the queue.</p>
      </section>
    );
  }

  return (
    <>
      <div className={styles.saveBar}>
        <div>
          <strong>{changedKeys.length} unsaved</strong>
          <span>{batchState.message || "Changes remain private until saved."}</span>
        </div>
        <button
          type="button"
          onClick={saveAll}
          disabled={changedKeys.length === 0 || batchState.tone === "saving"}
        >
          {batchState.tone === "saving" ? "Saving…" : "Save all changed"}
        </button>
      </div>

      <div className={styles.cards}>
        {records.map((record) => {
          const draft = drafts[record.key];
          const dirty = changedKeys.includes(record.key);
          const state = states[record.key] ?? { tone: "idle", message: "" };

          return (
            <article className={styles.card} key={record.key}>
              <header className={styles.cardHeader}>
                <div>
                  <div className={styles.cardTitleLine}>
                    <h2>{record.name}</h2>
                    {dirty ? <span className={styles.dirty}>Unsaved</span> : null}
                  </div>
                  <p>
                    {record.entityType === "place" ? "Place" : "Event"} · {record.status}
                  </p>
                </div>
                <div className={styles.issueChips}>
                  {record.issues.slice(0, 4).map((issue) => (
                    <span key={issue.code}>{issue.label}</span>
                  ))}
                </div>
              </header>

              <div className={styles.fields}>
                {record.entityType === "place" ? (
                  <label>
                    Neighbourhood
                    <select
                      value={draft.neighbourhood}
                      onChange={(event) =>
                        updateField(record.key, "neighbourhood", event.target.value)
                      }
                    >
                      <option value="">Choose neighbourhood</option>
                      {WINNIPEG_NEIGHBOURHOOD_GROUPS.map((group) => (
                        <optgroup label={group.label} key={group.label}>
                          {group.options.map((option) => (
                            <option value={option} key={option}>
                              {option}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className={styles.readOnlyField}>
                    <span>Venue neighbourhood</span>
                    <strong>{record.neighbourhood ?? "Missing"}</strong>
                    <small>Change the venue in the full editor.</small>
                  </div>
                )}

                <label>
                  Category
                  <input
                    type="text"
                    list="quick-repair-categories"
                    value={draft.primaryCategory}
                    onChange={(event) =>
                      updateField(record.key, "primaryCategory", event.target.value)
                    }
                  />
                </label>

                <label>
                  Verification
                  <select
                    value={draft.verificationStatus}
                    onChange={(event) =>
                      updateField(record.key, "verificationStatus", event.target.value)
                    }
                  >
                    {QUICK_REPAIR_VERIFICATION_OPTIONS.map((option) => (
                      <option value={option} key={option}>
                        {labelVerification(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.wideField}>
                  Official source URL
                  <input
                    type="url"
                    inputMode="url"
                    placeholder="https://official-site.example"
                    value={draft.sourceUrl}
                    onChange={(event) =>
                      updateField(record.key, "sourceUrl", event.target.value)
                    }
                  />
                </label>

                <label>
                  Source checked
                  <div className={styles.dateRow}>
                    <input
                      type="date"
                      value={draft.sourceCheckedAt}
                      onChange={(event) =>
                        updateField(record.key, "sourceCheckedAt", event.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField(record.key, "sourceCheckedAt", todayValue())
                      }
                    >
                      Today
                    </button>
                  </div>
                </label>

                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={draft.applyWinnipegDefaults}
                    onChange={(event) =>
                      updateField(
                        record.key,
                        "applyWinnipegDefaults",
                        event.target.checked
                      )
                    }
                  />
                  <span>
                    Apply Winnipeg defaults
                    <small>
                      {record.entityType === "place"
                        ? "City: Winnipeg · Province: Manitoba"
                        : "Timezone: America/Winnipeg"}
                    </small>
                  </span>
                </label>
              </div>

              <footer className={styles.cardFooter}>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    onClick={() => saveOne(record)}
                    disabled={!dirty || state.tone === "saving"}
                  >
                    {state.tone === "saving" ? "Saving…" : "Save listing"}
                  </button>
                  <Link href={`/admin/listings/${record.entityType}/${record.id}`}>
                    Full editor
                  </Link>
                  <Link href={record.publicPath}>View</Link>
                </div>
                {state.message ? (
                  <p
                    className={
                      state.tone === "error" ? styles.errorMessage : styles.successMessage
                    }
                  >
                    {state.message}
                  </p>
                ) : null}
              </footer>
            </article>
          );
        })}
      </div>

      <datalist id="quick-repair-categories">
        {categorySuggestions.map((category) => (
          <option value={category} key={category} />
        ))}
      </datalist>
    </>
  );
}
