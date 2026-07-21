"use client";

import {
  FormEvent,
  useState
} from "react";

import {
  trackBetaEvent
} from "@/lib/beta/client";

import styles from "./claim-listing-form.module.css";

type SubmissionState =
  | "idle"
  | "submitting"
  | "success"
  | "error";

export function ClaimListingForm({
  placeId,
  listingName
}: {
  placeId: string;
  listingName: string;
}) {
  const [isOpen, setIsOpen] =
    useState(false);
  const [state, setState] =
    useState<SubmissionState>("idle");
  const [message, setMessage] =
    useState("");

  async function submitClaim(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (state === "submitting") {
      return;
    }

    const formElement =
      event.currentTarget;
    const form =
      new FormData(formElement);

    setState("submitting");
    setMessage("");

    try {
      const response = await fetch(
        "/api/claims",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            placeId,
            claimantName:
              form.get("claimantName"),
            claimantRole:
              form.get("claimantRole"),
            businessEmail:
              form.get("businessEmail"),
            businessPhone:
              form.get("businessPhone"),
            officialWebsite:
              form.get("officialWebsite"),
            evidence:
              form.get("evidence"),
            website:
              form.get("website")
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
            "The claim request could not be submitted."
        );
      }

      formElement.reset();
      setState("success");
      setMessage(
        result.message ||
          "Claim request submitted for verification."
      );

      trackBetaEvent({
        eventName:
          "listing_claim_requested",
        pagePath:
          window.location.pathname,
        properties: {
          placeId,
          listingName
        }
      });
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The claim request could not be submitted."
      );
    }
  }

  return (
    <section className={styles.panel}>
      <button
        className={styles.toggle}
        type="button"
        aria-expanded={isOpen}
        onClick={() =>
          setIsOpen((current) => !current)
        }
      >
        <span className={styles.icon}>
          ✓
        </span>

        <span>
          <strong>Claim this listing</strong>
          <small>
            Owners and authorized managers can request verified control.
          </small>
        </span>

        <b>{isOpen ? "−" : "+"}</b>
      </button>

      {isOpen ? (
        <form
          className={styles.form}
          onSubmit={submitClaim}
        >
          <label>
            Your name
            <input
              name="claimantName"
              maxLength={120}
              required
            />
          </label>

          <label>
            Your role
            <select
              name="claimantRole"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Choose your role
              </option>
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="marketing">Marketing or communications</option>
              <option value="authorized_representative">Authorized representative</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label>
            Business email
            <input
              name="businessEmail"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>

          <label>
            Business phone, optional
            <input
              name="businessPhone"
              type="tel"
              autoComplete="tel"
              maxLength={40}
            />
          </label>

          <label>
            Official website
            <input
              name="officialWebsite"
              type="url"
              inputMode="url"
              placeholder="https://official-business-site.ca"
              maxLength={500}
              required
            />
          </label>

          <label>
            How can Venture verify you?
            <textarea
              name="evidence"
              maxLength={1500}
              minLength={20}
              placeholder="For example: I manage the email domain, can answer the official phone, or can provide business documentation."
              required
            />
          </label>

          <label className={styles.honeypot}>
            Website confirmation
            <input
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </label>

          <p className={styles.note}>
            Claims are free. Submitting does not automatically change the listing or affect organic ranking. Venture verifies each request before granting control.
          </p>

          <button
            type="submit"
            disabled={state === "submitting"}
          >
            {state === "submitting"
              ? "Submitting…"
              : "Submit claim request"}
          </button>

          {message ? (
            <p
              className={`${styles.message} ${
                state === "error"
                  ? styles.error
                  : styles.success
              }`}
              role={
                state === "error"
                  ? "alert"
                  : "status"
              }
            >
              {message}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
