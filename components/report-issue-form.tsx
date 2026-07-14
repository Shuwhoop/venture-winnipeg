"use client";

import {
  FormEvent,
  useState
} from "react";

type ReportIssueFormProps = {
  entityId: string;
  entityType: "event" | "place";
  listingName: string;
};

type SubmissionState =
  | "idle"
  | "submitting"
  | "success"
  | "error";

export function ReportIssueForm({
  entityId,
  entityType,
  listingName
}: ReportIssueFormProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [
    submissionState,
    setSubmissionState
  ] = useState<SubmissionState>("idle");

  const [message, setMessage] =
    useState("");

    async function submitReport(
    event: FormEvent<HTMLFormElement>
    ) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setSubmissionState("submitting");
    setMessage("");

    try {
        const response = await fetch(
        "/api/reports",
        {
            method: "POST",
            headers: {
            "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
            entityId,
            entityType,
            reason: form.get("reason"),
            details: form.get("details"),
            website: form.get("website")
            })
        }
        );

        const result = await response.json();

        if (!response.ok) {
        setSubmissionState("error");
        setMessage(
            result.error ??
            "The report could not be submitted."
        );

        return;
        }
        formElement.reset();

        setSubmissionState("success");
        setMessage(
        result.message ??
            "Thanks. Your report was submitted for review."
        );

        setTimeout(() => {
        setIsOpen(false);
        setSubmissionState("idle");
        setMessage("");
        }, 1000);
    } catch (error) {
        console.error(
        "Report form error:",
        error
        );

        setSubmissionState("error");
        setMessage(
        "The report could not be submitted. Please try again."
        );
    }
    }

  return (
    <section className="report-panel">
      <button
        className="report-toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={() =>
          setIsOpen((current) => !current)
        }
      >
        <span>!</span>

        <div>
          <strong>Report an issue</strong>

          <small>
            Help correct information about{" "}
            {listingName}
          </small>
        </div>

        <b>{isOpen ? "−" : "+"}</b>
      </button>

      {isOpen ? (
        <form
          className="report-form"
          onSubmit={submitReport}
        >
          <label>
            What is wrong?

            <select
              name="reason"
              required
              defaultValue=""
            >
              <option
                value=""
                disabled
              >
                Select a reason
              </option>

              <option value="cancelled">
                Event cancelled
              </option>

              <option value="incorrect_hours">
                Incorrect opening hours
              </option>

              <option value="wrong_address">
                Wrong address
              </option>

              <option value="incorrect_details">
                Incorrect information
              </option>

              <option value="duplicate">
                Duplicate listing
              </option>

              <option value="inappropriate">
                Inappropriate content
              </option>

              <option value="other">
                Something else
              </option>
            </select>
          </label>

          <label>
            Details

            <textarea
              name="details"
              maxLength={1000}
              rows={4}
              placeholder="Explain what should be checked or corrected."
            />
          </label>

          <label className="report-honeypot">
            Website

            <input
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </label>

          <button
            className="primary-action"
            type="submit"
            disabled={
              submissionState ===
              "submitting"
            }
          >
            {submissionState ===
            "submitting"
              ? "Submitting…"
              : "Submit report"}
          </button>

          {message ? (
            <p
              className={`report-message ${submissionState}`}
              role={
                submissionState ===
                "error"
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