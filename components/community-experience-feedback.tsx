"use client";

import {
  type FormEvent,
  useState
} from "react";

import {
  getBetaSessionId,
  trackBetaEvent
} from "@/lib/beta/client";

import styles from "./community-experience-feedback.module.css";

type CommunityExperienceFeedbackProps = {
  experienceTitle: string;
  slug: string;
};

export function CommunityExperienceFeedback({
  experienceTitle,
  slug
}: CommunityExperienceFeedbackProps) {
  const [rating, setRating] =
    useState<number | null>(null);
  const [message, setMessage] =
    useState("");
  const [status, setStatus] =
    useState<
      "idle" |
      "sending" |
      "success" |
      "error"
    >("idle");
  const [responseMessage, setResponseMessage] =
    useState("");

  async function submitFeedback(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      status === "sending" ||
      rating === null
    ) {
      return;
    }

    setStatus("sending");
    setResponseMessage("");

    const pagePath =
      `/community/${slug}`;

    try {
      const response = await fetch(
        "/api/beta/feedback",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            sessionId:
              getBetaSessionId(),
            pagePath,
            category: "outing",
            rating,
            message:
              `COMMUNITY EXPERIENCE: ${experienceTitle}\n\n${message.trim()}`,
            contactEmail: null,
            permissionToContact:
              false,
            website: ""
          })
        }
      );

      const result =
        await response.json() as {
          ok?: boolean;
          message?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
          "Venture could not save your feedback."
        );
      }

      setStatus("success");
      setResponseMessage(
        "Thanks. This will help shape the next Venture build."
      );
      setMessage("");

      trackBetaEvent({
        eventName:
          "feedback_submitted",
        pagePath,
        properties: {
          category:
            "community_experience",
          rating,
          slug
        }
      });
    } catch (error) {
      setStatus("error");
      setResponseMessage(
        error instanceof Error
          ? error.message
          : "Venture could not save your feedback."
      );
    }
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby="community-feedback-title"
    >
      <div className={styles.intro}>
        <span>AFTER THE BUILD</span>
        <h2 id="community-feedback-title">
          How did the experience feel?
        </h2>
        <p>
          A quick note helps Venture make the
          next monthly plan more welcoming,
          smoother, and worth leaving the house
          for.
        </p>
      </div>

      {status === "success" ? (
        <div
          className={styles.success}
          role="status"
        >
          <strong>Feedback received.</strong>
          <p>{responseMessage}</p>
        </div>
      ) : (
        <form
          className={styles.form}
          onSubmit={submitFeedback}
        >
          <fieldset>
            <legend>
              Rate the overall experience
            </legend>

            <div className={styles.ratings}>
              {[1, 2, 3, 4, 5].map(
                (value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={`${value} out of 5`}
                    aria-pressed={
                      rating === value
                    }
                    className={
                      rating === value
                        ? styles.selected
                        : ""
                    }
                    onClick={() => {
                      setRating(value);
                      setStatus("idle");

                      trackBetaEvent({
                        eventName:
                          "feedback_opened",
                        pagePath:
                          `/community/${slug}`,
                        properties: {
                          source:
                            "community_experience"
                        }
                      });
                    }}
                  >
                    {value}
                  </button>
                )
              )}
            </div>

            <small>
              1 means it missed the mark. 5 means
              Venture should build more like it.
            </small>
          </fieldset>

          <label>
            What should Venture keep or change?
            <textarea
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              minLength={5}
              maxLength={1600}
              rows={4}
              required
              placeholder="The best part, an awkward moment, or one thing that would improve the next plan."
            />
          </label>

          {status === "error" ? (
            <p
              className={styles.error}
              role="alert"
            >
              {responseMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={
              status === "sending" ||
              rating === null
            }
          >
            {status === "sending"
              ? "Sending…"
              : "Share my experience"}
          </button>
        </form>
      )}
    </section>
  );
}
