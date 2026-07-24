"use client";

import type {
  ReactNode
} from "react";

import Link from "next/link";

import {
  OutingRouteMap
} from "@/components/outing-route-map";

import type {
  GeneratedOutingPlan
} from "@/lib/saved-outings";

import styles from "./outing-detail-experience.module.css";

type OutingDetailExperienceProps = {
  plan: GeneratedOutingPlan;
  eyebrow: string;
  intro: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
};

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

function getStopKind(
  stop:
    GeneratedOutingPlan["stops"][number]
): {
  label: string;
  icon: string;
  className: string;
} {
  if (
    stop.kind === "event" ||
    stop.listing.type === "event"
  ) {
    return {
      label: "Event",
      icon: "🎟️",
      className:
        styles.eventStop
    };
  }

  if (stop.kind === "drinks") {
    return {
      label: "Drinks",
      icon: "🍸",
      className:
        styles.drinksStop
    };
  }

  return {
    label: "Food",
    icon: "🍽️",
    className:
      styles.foodStop
  };
}

export function OutingDetailExperience({
  plan,
  eyebrow,
  intro,
  backHref,
  backLabel,
  actions
}: OutingDetailExperienceProps) {
  const orderedStops =
    [...plan.stops].sort(
      (first, second) =>
        first.order -
        second.order
    );

  const partySize =
    Math.max(
      1,
      plan.partySize ?? 1
    );

  const groupEstimate =
    plan.estimatedGroupTotalCad ??
    (plan.estimatedTotalCad === null
      ? null
      : plan.estimatedTotalCad *
        partySize);

  return (
    <main className={styles.page}>
      {backHref && backLabel ? (
        <Link
          className={styles.backLink}
          href={backHref}
        >
          <span aria-hidden="true">
            ←
          </span>
          {backLabel}
        </Link>
      ) : null}

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span>{eyebrow}</span>

          <h1>{plan.title}</h1>

          <p>{intro}</p>

          <div className={styles.datePill}>
            <i aria-hidden="true">
              📅
            </i>
            {formatPlanDate(
              plan.date
            )}
          </div>
        </div>

        <div
          className={styles.heroRoute}
          aria-hidden="true"
        >
          {orderedStops
            .slice(0, 5)
            .map((stop, index, routeStops) => (
              <span
                key={`${stop.listing.type}-${stop.listing.id}-${stop.order}`}
              >
                <b>{index + 1}</b>
                {index < routeStops.length - 1 ? (
                  <i />
                ) : null}
              </span>
            ))}
        </div>
      </header>

      <OutingRouteMap plan={plan} />

      <section className={styles.snapshotSection}>
        <div className={styles.sectionHeading}>
          <span>ADVENTURE SNAPSHOT</span>
          <h2>Your plan at a glance</h2>
          <p>
            The key details before you head out.
          </p>
        </div>

        <div className={styles.snapshotGrid}>
          <article className={styles.startCard}>
            <i aria-hidden="true">🕒</i>
            <span>START</span>
            <strong>
              {plan.requestedStartTime}
            </strong>
          </article>

          <article className={styles.lengthCard}>
            <i aria-hidden="true">⌛</i>
            <span>LENGTH</span>
            <strong>
              {plan.requestedDuration}
            </strong>
          </article>

          <article className={styles.peopleCard}>
            <i aria-hidden="true">👥</i>
            <span>PEOPLE</span>
            <strong>{partySize}</strong>
          </article>

          <article className={styles.travelCard}>
            <i aria-hidden="true">🧭</i>
            <span>TRAVEL</span>
            <strong>
              {plan.transportation}
            </strong>
          </article>

          <article className={styles.stopsCard}>
            <i aria-hidden="true">📍</i>
            <span>STOPS</span>
            <strong>
              {orderedStops.length}
            </strong>
          </article>

          <article className={styles.priceCard}>
            <i aria-hidden="true">💵</i>
            <span>PER PERSON</span>
            <strong>
              {formatCost(
                plan.estimatedTotalCad
              )}
            </strong>
          </article>

          {partySize > 1 ? (
            <article className={styles.groupCard}>
              <i aria-hidden="true">🧾</i>
              <span>GROUP ESTIMATE</span>
              <strong>
                {formatCost(
                  groupEstimate
                )}
              </strong>
            </article>
          ) : null}
        </div>
      </section>

      {plan.warnings.length > 0 ? (
        <section className={styles.warningList}>
          {plan.warnings.map(
            (warning) => (
              <p key={warning}>
                <span aria-hidden="true">
                  !
                </span>
                {warning}
              </p>
            )
          )}
        </section>
      ) : null}

      <section className={styles.timelineSection}>
        <div className={styles.sectionHeading}>
          <span>STOP BY STOP</span>
          <h2>
            {orderedStops.length}{" "}
            {orderedStops.length === 1
              ? "place"
              : "places"}
            , one smooth route
          </h2>
          <p>
            Open a listing when you need hours, directions, or the full description.
          </p>
        </div>

        <div className={styles.timeline}>
          {orderedStops.map(
            (stop, stopIndex) => {
              const kind =
                getStopKind(stop);

              return (
                <div
                  className={styles.stopWrapper}
                  key={`${stop.listing.type}-${stop.listing.id}-${stop.order}`}
                  style={{
                    animationDelay: `${Math.min(stopIndex, 6) * 90}ms`
                  }}
                >
                  {stop.travelFromPreviousMinutes !==
                  null ? (
                    <div className={styles.travelRow}>
                      <span aria-hidden="true">
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

                  <article
                    className={`${styles.stopCard} ${kind.className}`}
                  >
                    <div className={styles.stopOrder}>
                      <span>{stop.order}</span>
                      <i aria-hidden="true">
                        {kind.icon}
                      </i>
                    </div>

                    <div className={styles.stopCopy}>
                      <div className={styles.stopTopline}>
                        <span>
                          {stop.startTime}–{stop.endTime}
                        </span>
                        <small>
                          {kind.label}
                        </small>
                      </div>

                      <h3>
                        {stop.listing.name}
                      </h3>

                      {stop.listing.subtitle ? (
                        <p className={styles.subtitle}>
                          {stop.listing.subtitle}
                        </p>
                      ) : null}

                      <div className={styles.stopFacts}>
                        <span>
                          📍{" "}
                          {stop.listing.neighbourhood ||
                            "Winnipeg"}
                        </span>
                        <span>
                          💵{" "}
                          {formatCost(
                            stop.estimatedCostCad
                          )}
                        </span>
                      </div>

                      <Link
                        className={styles.listingLink}
                        href={`/listings/${stop.listing.slug}`}
                      >
                        View listing
                        <span aria-hidden="true">
                          →
                        </span>
                      </Link>
                    </div>
                  </article>
                </div>
              );
            }
          )}
        </div>
      </section>

      {actions ? (
        <section className={styles.actions}>
          {actions}
        </section>
      ) : null}
    </main>
  );
}
