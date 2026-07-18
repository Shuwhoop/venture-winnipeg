"use client";

import {
  FormEvent,
  useState
} from "react";

import Link from "next/link";

import {
  getSupabaseBrowserClient
} from "@/lib/supabase/client";

import styles from "./page.module.css";


type FormState =
  | "idle"
  | "sending"
  | "sent"
  | "error";


export default function ForgotAdminPasswordPage() {
  const [
    formState,
    setFormState
  ] =
    useState<FormState>(
      "idle"
    );

  const [
    message,
    setMessage
  ] =
    useState("");

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      formState ===
      "sending"
    ) {
      return;
    }

    /*
     * Read FormData at submit time.
     * This also captures browser-autofilled
     * values that may not trigger onChange.
     */
    const formData =
      new FormData(
        event.currentTarget
      );

    const emailValue =
      formData.get(
        "email"
      );

    const email =
      typeof emailValue ===
        "string"
        ? emailValue
            .trim()
            .toLowerCase()
        : "";

    if (!email) {
      setFormState(
        "error"
      );

      setMessage(
        "Enter your administrator email before requesting a reset link."
      );

      return;
    }

    setFormState(
      "sending"
    );

    setMessage(
      "Sending a secure reset link..."
    );

    try {
      const supabase =
        getSupabaseBrowserClient();

      const redirectTo =
        `${window.location.origin}/admin/reset-password`;

      const {
        error
      } =
        await supabase
          .auth
          .resetPasswordForEmail(
            email,
            {
              redirectTo
            }
          );

      if (error) {
        const normalizedMessage =
          error.message
            .toLowerCase();

        if (
          normalizedMessage.includes(
            "rate limit"
          )
        ) {
          setFormState(
            "error"
          );

          setMessage(
            "Supabase has temporarily paused recovery emails because too many were requested. Wait about an hour, then press the button once."
          );

          return;
        }

        throw error;
      }

      setFormState(
        "sent"
      );

      setMessage(
        "Check your email for a fresh password-reset link. Use only the newest message."
      );
    } catch {
      /*
       * Expected Auth errors are shown in
       * the page instead of console.error,
       * which prevents the Next.js dev
       * overlay from covering the form.
       */
      setFormState(
        "error"
      );

      setMessage(
        "The reset email could not be sent. Confirm the email and try again later."
      );
    }
  }

  return (
    <main
      className={
        styles.page
      }
    >
      <section
        className={
          styles.card
        }
      >
        <span
          className={
            styles.eyebrow
          }
        >
          VENTURE ADMIN
        </span>

        <h1>
          Reset your password
        </h1>

        <p
          className={
            styles.intro
          }
        >
          Enter the email used for
          your authorized Venture
          administrator account.
        </p>

        <form
          className={
            styles.form
          }
          onSubmit={
            handleSubmit
          }
        >
          <label>
            <span>
              Admin email
            </span>

            <input
              autoComplete="email"
              disabled={
                formState ===
                  "sending" ||
                formState ===
                  "sent"
              }
              inputMode="email"
              name="email"
              required
              type="email"
            />
          </label>

          <button
            disabled={
              formState ===
                "sending" ||
              formState ===
                "sent"
            }
            type="submit"
          >
            {
              formState ===
              "sending"
                ? "Sending..."
                : formState ===
                    "sent"
                  ? "Email sent"
                  : "Send reset link"
            }
          </button>
        </form>

        {message ? (
          <p
            className={`${styles.message} ${
              formState ===
              "sent"
                ? styles.success
                : formState ===
                    "error"
                  ? styles.error
                  : ""
            }`}
            role="status"
          >
            {message}
          </p>
        ) : null}

        <Link
          className={
            styles.back
          }
          href="/admin/login"
        >
          Return to admin sign in
        </Link>
      </section>
    </main>
  );
}
