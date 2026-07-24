"use client";

import {
  useState
} from "react";

import Link from "next/link";

import styles from "../page.module.css";


type UnsubscribeFormProps = {
  token: string;
};


export default function UnsubscribeForm({
  token
}: UnsubscribeFormProps) {
  const [
    state,
    setState
  ] = useState<
    | "idle"
    | "submitting"
    | "done"
    | "error"
  >("idle");

  const [
    message,
    setMessage
  ] = useState("");


  async function handleUnsubscribe() {
    setState(
      "submitting"
    );

    setMessage(
      "Updating your email preferences..."
    );

    try {
      const response =
        await fetch(
          `/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`,
          {
            method:
              "POST"
          }
        );

      if (!response.ok) {
        const result =
          await response.json() as {
            error?: string;
          };

        throw new Error(
          result.error ||
          "Venture could not update this subscription."
        );
      }

      setState(
        "done"
      );

      setMessage(
        "You have been unsubscribed from The Thursday Venture."
      );
    } catch (error) {
      setState(
        "error"
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Venture could not update this subscription."
      );
    }
  }


  if (state === "done") {
    return (
      <div className={styles.preferencePanel}>
        <div className={styles.confirmedMark} aria-hidden="true">
          ✓
        </div>

        <h2>
          Your preferences are updated.
        </h2>

        <p>
          {message}
        </p>

        <Link href="/">
          Return to Venture
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.preferencePanel}>
      <p>
        Stop receiving The Thursday Venture at this email address.
      </p>

      <button
        disabled={
          state ===
          "submitting"
        }
        onClick={
          handleUnsubscribe
        }
        type="button"
      >
        {state ===
        "submitting"
          ? "Unsubscribing..."
          : "Unsubscribe me"}
      </button>

      {message ? (
        <p
          className={
            state === "error"
              ? styles.inlineError
              : styles.inlineNotice
          }
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Link href="/">
        Keep me subscribed
      </Link>
    </div>
  );
}
