"use client";

import {
  useCallback,
  useEffect,
  useState
} from "react";

import Link from "next/link";

import type {
  BudgetPreference
} from "@/lib/profile-preferences";

import {
  isOutingSaved,
  removeSavedOuting,
  saveOuting,
  type GeneratedOutingPlan
} from "@/lib/saved-outings";

const OUTING_DRAFT_KEY =
  "venture:outing-draft:v1";

const GENERATED_OUTING_KEY =
  "venture:generated-outing:v1";

type OutingDraft = {
  outingTypeId: string;
  outingTypeTitle: string;
  date: string;
  startTime: string;
  duration: string;
  interests: string[];
  neighbourhoods: string[];
  budget: BudgetPreference;
  transportation: string;
  alcoholFree: boolean;
  createdAt: string;
};

type PageStatus =
  | "loading"
  | "ready"
  | "missing"
  | "error";

function formatPlanDate(
  dateValue: string
): string {
  const [
    year,
    month,
    day
  ] = dateValue
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone:
        "America/Winnipeg"
    }
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12
      )
    )
  );
}

function formatCost(
  value: number | null
): string {
  if (value === null) {
    return "Price not confirmed";
  }

  if (value === 0) {
    return "Free";
  }

  return new Intl.NumberFormat(
    "en-CA",
    {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0
    }
  ).format(value);
}

function buildShareText(
  plan: GeneratedOutingPlan
): string {
  const stopLines =
    plan.stops.map(
      (stop) =>
        `${stop.order}. ${stop.startTime}–${stop.endTime}: ${stop.listing.name}`
    );

  return [
    plan.title,
    formatPlanDate(plan.date),
    "",
    ...stopLines,
    "",
    "Built with Venture Winnipeg"
  ].join("\n");
}

export default function OutingResultsPage() {
  const [
    status,
    setStatus
  ] =
    useState<PageStatus>(
      "loading"
    );

  const [
    plan,
    setPlan
  ] =
    useState<GeneratedOutingPlan | null>(
      null
    );

  const [
    errorMessage,
    setErrorMessage
  ] = useState("");

  const [
    saved,
    setSaved
  ] = useState(false);

  const [
    actionMessage,
    setActionMessage
  ] = useState("");

  const generateOuting =
    useCallback(async () => {
      const storedDraft =
        window.localStorage.getItem(
          OUTING_DRAFT_KEY
        );

      if (!storedDraft) {
        setStatus("missing");
        setPlan(null);
        return;
      }

      let draft: OutingDraft;

      try {
        draft =
          JSON.parse(
            storedDraft
          ) as OutingDraft;
      } catch {
        setStatus("error");

        setErrorMessage(
          "The saved outing setup could not be read."
        );

        return;
      }

      setStatus("loading");
      setErrorMessage("");
      setActionMessage("");

      try {
        const response =
          await fetch(
            "/api/outings/generate",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  draft
                )
            }
          );

        const result =
          (await response.json()) as
            | GeneratedOutingPlan
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            "error" in result &&
            result.error
              ? result.error
              : "Venture could not generate this outing."
          );
        }

        const generatedPlan =
          result as GeneratedOutingPlan;

        setPlan(generatedPlan);
        setSaved(
          isOutingSaved(
            generatedPlan.planId
          )
        );

        setStatus("ready");

        window.localStorage.setItem(
          GENERATED_OUTING_KEY,
          JSON.stringify(
            generatedPlan
          )
        );
      } catch (error) {
        setStatus("error");

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Venture could not generate this outing."
        );
      }
    }, []);

  useEffect(() => {
    void generateOuting();
  }, [generateOuting]);

  function handleSaveOuting() {
    if (!plan) {
      return;
    }

    if (saved) {
      removeSavedOuting(
        plan.planId
      );

      setSaved(false);
      setActionMessage(
        "Outing removed from Saved."
      );

      return;
    }

    saveOuting(plan);
    setSaved(true);

    setActionMessage(
      "Outing saved."
    );
  }

  async function handleShareOuting() {
    if (!plan) {
      return;
    }

    const shareText =
      buildShareText(plan);

    try {
      if (
        typeof navigator.share ===
        "function"
      ) {
        await navigator.share({
          title: plan.title,
          text: shareText
        });

        setActionMessage(
          "Outing shared."
        );

        return;
      }

      await navigator.clipboard.writeText(
        shareText
      );

      setActionMessage(
        "Outing copied to your clipboard."
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      setActionMessage(
        "The outing could not be shared."
      );
    }
  }

  return (
    <main className="outing-results-page">
      <header className="outing-results-heading">
        <span>
          VENTURE BUILDER
        </span>

        <h1>
          {plan
            ? plan.title
            : "Building your outing"}
        </h1>

        <p>
          A Winnipeg plan based on
          your timing, interests,
          budget, travel choice, and
          verified listings.
        </p>
      </header>

      {status === "loading" ? (
        <section className="outing-loading-card">
          <span
            className="outing-loading-spinner"
            aria-hidden="true"
          />

          <div>
            <strong>
              Connecting the evening
            </strong>

            <p>
              Checking event times,
              opening hours, prices,
              and travel between stops.
            </p>
          </div>
        </section>
      ) : null}

      {status === "missing" ? (
        <section className="outing-state-card">
          <span aria-hidden="true">
            ?
          </span>

          <h2>
            No outing setup found
          </h2>

          <p>
            Choose the type of outing
            and customize the evening
            before generating a plan.
          </p>

          <Link href="/build-outing">
            Build an outing
          </Link>
        </section>
      ) : null}

      {status === "error" ? (
        <section className="outing-state-card error">
          <span aria-hidden="true">
            !
          </span>

          <h2>
            The plan hit a pothole
          </h2>

          <p>{errorMessage}</p>

          <div className="outing-state-actions">
            <button
              type="button"
              onClick={() => {
                void generateOuting();
              }}
            >
              Try again
            </button>

            <Link href="/build-outing">
              Edit outing
            </Link>
          </div>
        </section>
      ) : null}

      {status === "ready" &&
      plan ? (
        <>
          <section className="outing-plan-summary">
            <div>
              <span>DATE</span>

              <strong>
                {formatPlanDate(
                  plan.date
                )}
              </strong>
            </div>

            <div>
              <span>START</span>

              <strong>
                {
                  plan.requestedStartTime
                }
              </strong>
            </div>

            <div>
              <span>LENGTH</span>

              <strong>
                {
                  plan.requestedDuration
                }
              </strong>
            </div>

            <div>
              <span>TRAVEL</span>

              <strong>
                {plan.transportation}
              </strong>
            </div>

            <div>
              <span>
                ESTIMATED TOTAL
              </span>

              <strong>
                {formatCost(
                  plan.estimatedTotalCad
                )}
              </strong>
            </div>
          </section>

          <section className="outing-quick-actions">
            <button
              className={
                saved
                  ? "saved"
                  : ""
              }
              type="button"
              onClick={
                handleSaveOuting
              }
            >
              <span aria-hidden="true">
                {saved ? "♥" : "♡"}
              </span>

              {saved
                ? "Saved"
                : "Save outing"}
            </button>

            <button
              type="button"
              onClick={() => {
                void handleShareOuting();
              }}
            >
              <span aria-hidden="true">
                ↗
              </span>

              Share outing
            </button>
          </section>

          {actionMessage ? (
            <p
              className="outing-action-message"
              role="status"
            >
              {actionMessage}
            </p>
          ) : null}

          {plan.warnings.length >
          0 ? (
            <section className="outing-warning-list">
              {plan.warnings.map(
                (warning) => (
                  <p key={warning}>
                    <span
                      aria-hidden="true"
                    >
                      !
                    </span>

                    {warning}
                  </p>
                )
              )}
            </section>
          ) : null}

          {plan.stops.length >
          0 ? (
            <section className="outing-timeline">
              <div className="section-heading">
                <div>
                  <span>
                    YOUR PLAN
                  </span>

                  <h2>
                    {plan.stops.length}{" "}
                    {plan.stops.length ===
                    1
                      ? "stop"
                      : "stops"}
                  </h2>
                </div>
              </div>

              {plan.stops.map(
                (stop) => (
                  <div
                    className="outing-stop-wrapper"
                    key={`${stop.listing.type}-${stop.listing.id}`}
                  >
                    {stop.travelFromPreviousMinutes !==
                    null ? (
                      <div className="outing-travel-row">
                        <span
                          aria-hidden="true"
                        >
                          ↓
                        </span>

                        <p>
                          About{" "}
                          {
                            stop.travelFromPreviousMinutes
                          }{" "}
                          minutes by{" "}
                          {plan.transportation.toLowerCase()}
                        </p>
                      </div>
                    ) : null}

                    <article className="outing-stop-card">
                      <div className="outing-stop-order">
                        {stop.order}
                      </div>

                      <div className="outing-stop-content">
                        <div className="outing-stop-topline">
                          <span>
                            {stop.startTime}–
                            {stop.endTime}
                          </span>

                          <small>
                            {stop.listing.type ===
                            "event"
                              ? "EVENT"
                              : "PLACE"}
                          </small>
                        </div>

                        <h2>
                          {
                            stop.listing
                              .name
                          }
                        </h2>

                        <p className="outing-stop-subtitle">
                          {
                            stop.listing
                              .subtitle
                          }
                        </p>

                        <p className="outing-stop-reason">
                          {stop.reason}
                        </p>

                        <div className="outing-stop-details">
                          <span>
                            {
                              stop.listing
                                .neighbourhood
                            }
                          </span>

                          <span>
                            {formatCost(
                              stop.estimatedCostCad
                            )}
                          </span>

                          <span>
                            {
                              stop.listing
                                .timeOrHours
                            }
                          </span>
                        </div>

                        <Link
                          className="outing-stop-link"
                          href={`/listings/${stop.listing.slug}`}
                        >
                          View details
                        </Link>
                      </div>
                    </article>
                  </div>
                )
              )}
            </section>
          ) : (
            <section className="outing-state-card">
              <span aria-hidden="true">
                ✦
              </span>

              <h2>
                No trustworthy match yet
              </h2>

              <p>
                Try another date, a
                longer outing, a more
                flexible budget, or
                fewer neighbourhood
                restrictions.
              </p>

              <Link href="/build-outing">
                Edit outing
              </Link>
            </section>
          )}

          <div className="outing-result-actions">
            <button
              type="button"
              onClick={() => {
                void generateOuting();
              }}
            >
              Generate another version
            </button>

            <Link href="/build-outing">
              Change preferences
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}