"use client";

import {
  useEffect,
  useId,
  useState
} from "react";
import {
  usePathname
} from "next/navigation";

import {
  getBetaSessionId,
  trackBetaEvent
} from "@/lib/beta/client";
import type {
  BetaFeedbackCategory
} from "@/lib/beta/types";

import styles from "./beta-feedback.module.css";

const CATEGORY_OPTIONS: Array<{
  value: BetaFeedbackCategory;
  label: string;
}> = [
  { value: "bug", label: "Something broke" },
  { value: "confusing", label: "Something was confusing" },
  { value: "idea", label: "I have an idea" },
  { value: "listing", label: "Listing information" },
  { value: "outing", label: "Outing builder" },
  { value: "other", label: "Something else" }
];

export function BetaFeedback() {
  const pathname = usePathname();
  const titleId = useId();

  const [open, setOpen] = useState(false);
  const [category, setCategory] =
    useState<BetaFeedbackCategory>("idea");
  const [rating, setRating] =
    useState<number | null>(null);
  const [message, setMessage] =
    useState("");
  const [contactEmail, setContactEmail] =
    useState("");
  const [permissionToContact, setPermissionToContact] =
    useState(false);
  const [website, setWebsite] =
    useState("");
  const [status, setStatus] =
    useState<"idle" | "sending" | "success" | "error">("idle");
  const [responseMessage, setResponseMessage] =
    useState("");

  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    const timeout = window.setTimeout(() => {
      trackBetaEvent({
        eventName: "page_view",
        pagePath: pathname
      });
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [isAdmin, pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (isAdmin) {
    return null;
  }

  function openFeedback() {
    setOpen(true);
    setStatus("idle");
    setResponseMessage("");

    trackBetaEvent({
      eventName: "feedback_opened",
      pagePath: pathname
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (status === "sending") {
      return;
    }

    setStatus("sending");
    setResponseMessage("");

    try {
      const response = await fetch("/api/beta/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: getBetaSessionId(),
          pagePath: pathname,
          category,
          rating,
          message,
          contactEmail:
            contactEmail.trim() || null,
          permissionToContact,
          website
        })
      });

      const result = await response.json() as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "Venture could not save this feedback."
        );
      }

      setStatus("success");
      setResponseMessage(
        result.message || "Thanks for helping Venture improve."
      );
      setMessage("");
      setContactEmail("");
      setPermissionToContact(false);
      setRating(null);

      trackBetaEvent({
        eventName: "feedback_submitted",
        pagePath: pathname,
        properties: {
          category,
          rating
        }
      });
    } catch (error) {
      setStatus("error");
      setResponseMessage(
        error instanceof Error
          ? error.message
          : "Venture could not save this feedback."
      );
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        onClick={openFeedback}
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">✦</span>
        Feedback
      </button>

      {open ? (
        <div
          className={styles.backdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <section
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header className={styles.header}>
              <div>
                <p>VENTURE BETA</p>
                <h2 id={titleId}>Help shape what comes next</h2>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close feedback form"
              >
                ×
              </button>
            </header>

            {status === "success" ? (
              <div className={styles.success} role="status">
                <strong>Feedback received.</strong>
                <p>{responseMessage}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Done
                </button>
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit}>
                <label>
                  What is this about?
                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target.value as BetaFeedbackCategory
                      )
                    }
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset>
                  <legend>How useful was this page?</legend>
                  <div className={styles.ratings}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        type="button"
                        key={value}
                        className={rating === value ? styles.selected : ""}
                        aria-pressed={rating === value}
                        onClick={() => setRating(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <small>1 means not useful. 5 means excellent.</small>
                </fieldset>

                <label>
                  Tell us what happened or what would improve it
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    minLength={5}
                    maxLength={2000}
                    required
                    rows={5}
                    placeholder="A specific moment is especially helpful."
                  />
                </label>

                <label>
                  Email, optional
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </label>

                <label className={styles.consent}>
                  <input
                    type="checkbox"
                    checked={permissionToContact}
                    onChange={(event) =>
                      setPermissionToContact(event.target.checked)
                    }
                  />
                  <span>
                    Venture may contact me about this feedback. Required only
                    when an email is included.
                  </span>
                </label>

                <label className={styles.honeypot} aria-hidden="true">
                  Website
                  <input
                    type="text"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>

                {status === "error" ? (
                  <p className={styles.error} role="alert">
                    {responseMessage}
                  </p>
                ) : null}

                <button
                  className={styles.submit}
                  type="submit"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? "Sending…" : "Send feedback"}
                </button>

                <p className={styles.privacy}>
                  Venture records the page path and an anonymous browser session
                  ID. It does not store your IP address in the feedback tables.
                </p>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
