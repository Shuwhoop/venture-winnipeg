"use client";

import {
  useEffect,
  useState
} from "react";

import Link from "next/link";

import {
  useParams,
  useRouter
} from "next/navigation";

import {
  getSavedOutings,
  removeSavedOuting,
  type GeneratedOutingPlan
} from "@/lib/saved-outings";

type PageStatus =
  | "loading"
  | "ready"
  | "missing";

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

export default function SavedOutingPage() {
  const params = useParams();
  const router = useRouter();

  const planId =
    typeof params.planId ===
    "string"
      ? params.planId
      : "";

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

  useEffect(() => {
    if (!planId) {
      setStatus("missing");
      return;
    }

    const savedPlan =
      getSavedOutings().find(
        (outing) =>
          outing.planId === planId
      );

    if (!savedPlan) {
      setPlan(null);
      setStatus("missing");
      return;
    }

    setPlan(savedPlan);
    setStatus("ready");
  }, [planId]);

  function handleRemove() {
    if (!plan) {
      return;
    }

    removeSavedOuting(
      plan.planId
    );

    router.push("/saved");
  }

  if (status === "loading") {
    return (
      <section className="empty-state">
        <div>✦</div>

        <h1>
          Opening your outing
        </h1>
      </section>
    );
  }

  if (
    status === "missing" ||
    !plan
  ) {
    return (
      <section className="empty-state">
        <div>?</div>

        <h1>
          Saved outing not found
        </h1>

        <p>
          It may have been removed or
          saved in a different browser.
        </p>

        <Link href="/saved">
          Return to Saved
        </Link>
      </section>
    );
  }

  return (
    <main className="saved-outing-detail-page">
      <Link
        className="saved-outing-back-link"
        href="/saved"
      >
        ← Back to Saved
      </Link>

      <header className="saved-outing-detail-heading">
        <span>SAVED OUTING</span>

        <h1>{plan.title}</h1>

        <p>
          {formatPlanDate(
            plan.date
          )}
        </p>
      </header>

      <section className="outing-plan-summary">
        <div>
          <span>START</span>

          <strong>
            {plan.requestedStartTime}
          </strong>
        </div>

        <div>
          <span>LENGTH</span>

          <strong>
            {plan.requestedDuration}
          </strong>
        </div>

        <div>
          <span>TRAVEL</span>

          <strong>
            {plan.transportation}
          </strong>
        </div>

        <div>
          <span>STOPS</span>

          <strong>
            {plan.stops.length}
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

      <section className="outing-timeline">
        <div className="section-heading">
          <div>
            <span>YOUR PLAN</span>

            <h2>
              {plan.stops.length}{" "}
              {plan.stops.length === 1
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
                    {stop.listing.name}
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
                  </div>

                  <Link
                    className="outing-stop-link"
                    href={`/listings/${stop.listing.slug}`}
                  >
                    View listing
                  </Link>
                </div>
              </article>
            </div>
          )
        )}
      </section>

      <div className="saved-outing-detail-actions">
        <Link href="/build-outing">
          Build another outing
        </Link>

        <button
          type="button"
          onClick={handleRemove}
        >
          Remove saved outing
        </button>
      </div>
    </main>
  );
}