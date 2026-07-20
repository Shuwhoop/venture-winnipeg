"use client";

import {
  useState
} from "react";
import {
  useRouter
} from "next/navigation";

import type {
  ExperimentStatus
} from "@/lib/experiments/types";

import styles from "./experiment-lab.module.css";

const ACTIONS: Array<{
  status: ExperimentStatus;
  label: string;
  danger?: boolean;
}> = [
  {
    status: "running",
    label: "Start"
  },
  {
    status: "paused",
    label: "Pause"
  },
  {
    status: "archived",
    label: "Archive",
    danger: true
  }
];

export function ExperimentStatusControls({
  experimentId,
  currentStatus
}: {
  experimentId: string;
  currentStatus: ExperimentStatus;
}) {
  const router =
    useRouter();

  const [
    pending,
    setPending
  ] =
    useState<ExperimentStatus | null>(
      null
    );

  const [
    message,
    setMessage
  ] = useState("");

  async function updateStatus(
    status: ExperimentStatus
  ) {
    setPending(status);
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/experiments/${experimentId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                status
              })
          }
        );

      const result =
        await response
          .json() as {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          result.error ||
          "The experiment could not be updated."
        );
      }

      setMessage(
        `Experiment set to ${status}.`
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The experiment could not be updated."
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div className={styles.statusControls}>
        {ACTIONS.map((action) => (
          <button
            key={action.status}
            type="button"
            className={
              action.danger
                ? styles.danger
                : ""
            }
            disabled={
              pending !== null ||
              currentStatus ===
                action.status
            }
            onClick={() => {
              void updateStatus(
                action.status
              );
            }}
          >
            {pending ===
            action.status
              ? "Updating..."
              : action.label}
          </button>
        ))}
      </div>

      {message ? (
        <p className={styles.muted}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
