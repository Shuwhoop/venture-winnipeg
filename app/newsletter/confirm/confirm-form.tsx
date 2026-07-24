"use client";

import {
  useState
} from "react";

import Link from "next/link";

import styles from "../page.module.css";


type ConfirmFormProps = {
  token: string;
};


export default function ConfirmForm({
  token
}: ConfirmFormProps) {
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


  async function handleConfirm() {
    if (
      state ===
      "submitting"
    ) {
      return;
    }

    setState(
      "submitting"
    );

    setMessage(
      "Confirming your place on the list..."
    );

    try {
      const response =
        await fetch(
          "/api/newsletter/confirm",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                token
              })
          }
        );

      const result =
        await response.json() as {
          message?: string;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Venture could not confirm this subscription."
        );
      }

      setState(
        "done"
      );

      setMessage(
        result.message ||
        "You’re confirmed."
      );
    } catch (error) {
      setState(
        "error"
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Venture could not confirm this subscription."
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
          You’re on the Thursday list.
        </h2>

        <p role="status">
          {message}
        </p>

        <div className={styles.preferenceActions}>
          <Link href="/explore">
            Explore Winnipeg
          </Link>

          <Link href="/build-outing">
            Build an outing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.preferencePanel}>
      <p>
        Confirm that you want one useful Winnipeg discovery email each Thursday.
      </p>

      <button
        disabled={
          state ===
          "submitting"
        }
        onClick={
          handleConfirm
        }
        type="button"
      >
        {state ===
        "submitting"
          ? "Confirming..."
          : "Confirm my subscription"}
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

      <Link href="/newsletter">
        Return to newsletter details
      </Link>
    </div>
  );
}
