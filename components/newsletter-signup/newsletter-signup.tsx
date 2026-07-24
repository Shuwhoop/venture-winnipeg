"use client";

import {
  FormEvent,
  useState
} from "react";

import Link from "next/link";

import {
  trackBetaEvent
} from "@/lib/beta/client";

import styles from "./newsletter-signup.module.css";


type NewsletterSignupProps = {
  placement?:
    | "home"
    | "profile"
    | "page";
};


type FormState =
  | "idle"
  | "submitting"
  | "success"
  | "error";


export default function NewsletterSignup({
  placement =
    "page"
}: NewsletterSignupProps) {
  const [
    formState,
    setFormState
  ] = useState<FormState>(
    "idle"
  );

  const [
    message,
    setMessage
  ] = useState("");


  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      formState ===
      "submitting"
    ) {
      return;
    }

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    setFormState(
      "submitting"
    );

    setMessage(
      "Sending your confirmation link..."
    );

    try {
      const response =
        await fetch(
          "/api/newsletter/subscribe",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                firstName:
                  formData.get(
                    "firstName"
                  ),
                email:
                  formData.get(
                    "email"
                  ),
                consent:
                  formData.get(
                    "consent"
                  ) ===
                  "on",
                website:
                  formData.get(
                    "website"
                  ),
                source:
                  placement
              })
          }
        );

      const result =
        await response.json() as {
          message?: string;
          error?: string;
          alreadySubscribed?: boolean;
          pendingConfirmation?: boolean;
        };

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Venture could not complete the signup."
        );
      }

      setFormState(
        "success"
      );

      setMessage(
        result.message ||
        "Check your inbox to confirm your subscription."
      );

      form.reset();

      trackBetaEvent({
        eventName:
          "newsletter_signup",
        pagePath:
          window.location.pathname,
        properties: {
          placement,
          alreadySubscribed:
            Boolean(
              result.alreadySubscribed
            ),
          pendingConfirmation:
            Boolean(
              result.pendingConfirmation
            )
        }
      });
    } catch (error) {
      setFormState(
        "error"
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Venture could not complete the signup."
      );
    }
  }


  return (
    <section
      className={`${styles.card} ${styles[placement]}`}
    >
      <div
        className={styles.graphics}
        aria-hidden="true"
      >
        <span>
          🍽️
        </span>

        <span>
          🎟️
        </span>

        <span>
          🗺️
        </span>

        <i />
      </div>

      <div className={styles.copy}>
        <span className={styles.eyebrow}>
          EVERY THURSDAY
        </span>

        <h2>
          Winnipeg plans,
          delivered warm.
        </h2>

        <p>
          Standout events, local food and drink spots, complete outing ideas, and meaningful Venture updates.
        </p>

        <div className={styles.promiseRow}>
          <span>
            One useful email
          </span>

          <span>
            No disguised ads
          </span>

          <span>
            Leave anytime
          </span>
        </div>
      </div>

      <form
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <label>
          <span>
            First name
          </span>

          <input
            autoComplete="given-name"
            disabled={
              formState ===
              "submitting"
            }
            maxLength={60}
            name="firstName"
            placeholder="Your first name"
            required
            type="text"
          />
        </label>

        <label>
          <span>
            Email address
          </span>

          <input
            autoComplete="email"
            disabled={
              formState ===
              "submitting"
            }
            inputMode="email"
            maxLength={254}
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </label>

        <label className={styles.consent}>
          <input
            disabled={
              formState ===
              "submitting"
            }
            name="consent"
            required
            type="checkbox"
          />

          <span>
            I agree to receive The Thursday Venture from Venture by Boogie Bangers. I understand that I can unsubscribe at any time. Read the <Link href="/privacy">privacy notice</Link>.
          </span>
        </label>

        <label
          className={styles.honeypot}
          aria-hidden="true"
        >
          Website

          <input
            autoComplete="off"
            name="website"
            tabIndex={-1}
            type="text"
          />
        </label>

        <button
          disabled={
            formState ===
            "submitting"
          }
          type="submit"
        >
          {formState ===
          "submitting"
            ? "Sending confirmation..."
            : "Join The Thursday Venture"}

          <span aria-hidden="true">
            →
          </span>
        </button>
      </form>

      {message ? (
        <div
          className={`${styles.message} ${
            formState ===
            "error"
              ? styles.error
              : formState ===
                  "success"
                ? styles.success
                : ""
          }`}
          role="status"
        >
          <strong>
            {formState === "success"
              ? "Check your inbox"
              : formState === "error"
                ? "Something needs attention"
                : "Working on it"}
          </strong>

          <span>
            {message}
          </span>
        </div>
      ) : null}

      <footer className={styles.footer}>
        <span>
          The Thursday Venture
        </span>

        <a href="mailto:venturebangers@gmail.com">
          venturebangers@gmail.com
        </a>

        {placement !== "page" ? (
          <Link href="/newsletter">
            Newsletter details
          </Link>
        ) : null}
      </footer>
    </section>
  );
}
