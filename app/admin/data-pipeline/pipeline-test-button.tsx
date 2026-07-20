"use client";

import {
  useRouter
} from "next/navigation";
import {
  useState
} from "react";

import {
  getBetaIdentity
} from "@/lib/beta/client";

import styles from "./data-pipeline.module.css";

export function PipelineTestButton() {
  const router = useRouter();
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState(
    "Send one harmless test event through Venture's normal browser ingestion route."
  );

  async function sendTest() {
    setStatus("sending");
    setMessage("Sending the test event through /api/beta/event...");

    try {
      const identity =
        getBetaIdentity();
      const testId =
        crypto.randomUUID();
      const response = await fetch(
        "/api/beta/event",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            sessionId:
              identity.sessionId,
            visitorId:
              identity.visitorId,
            eventName:
              "pipeline_test",
            pagePath:
              window.location.pathname,
            clientCreatedAt:
              new Date().toISOString(),
            eventVersion: 2,
            properties: {
              testId,
              pipelineTest: true,
              eventSource: "client",
              initiatedFrom:
                "admin-data-pipeline"
            }
          })
        }
      );

      const result =
        await response.json() as {
          ok?: boolean;
          error?: string;
        };

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
          "The test event was rejected."
        );
      }

      setStatus("success");
      setMessage(
        `Test ${testId.slice(0, 8)} was accepted. Refreshing the report now.`
      );

      window.setTimeout(() => {
        router.refresh();
      }, 700);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The pipeline test failed."
      );
    }
  }

  return (
    <div className={styles.testPanel}>
      <button
        className={styles.actionButton}
        type="button"
        onClick={sendTest}
        disabled={status === "sending"}
      >
        {status === "sending"
          ? "Sending test..."
          : "Send pipeline test"}
      </button>

      <p
        className={`${styles.testMessage} ${
          status === "success"
            ? styles.success
            : status === "error"
              ? styles.error
              : ""
        }`}
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}
