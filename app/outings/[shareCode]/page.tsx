import Link from "next/link";

import {
  notFound
} from "next/navigation";

import {
  OutingRouteMap
} from "@/components/outing-route-map";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import type {
  GeneratedOutingPlan
} from "@/lib/saved-outings";

export const dynamic =
  "force-dynamic";

type SharedOutingPageProps = {
  params: Promise<{
    shareCode: string;
  }>;
};

type SharedOutingRow = {
  share_code: string;
  planning_mode:
    | "solo"
    | "group";
  title: string;
  generated_plan:
    GeneratedOutingPlan;
};

function formatPlanDate(
  dateValue: string
): string {
  const [
    year,
    month,
    day
  ] =
    dateValue
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
      weekday:
        "long",

      month:
        "long",

      day:
        "numeric",

      year:
        "numeric",

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
      style:
        "currency",

      currency:
        "CAD",

      maximumFractionDigits:
        0
    }
  ).format(value);
}

async function getSharedOuting(
  shareCode: string
): Promise<SharedOutingRow | null> {
  if (
    !/^[a-f0-9]{12}$/.test(
      shareCode
    )
  ) {
    return null;
  }

  const supabase =
    getSupabaseAdminClient();

  const {
    data,
    error
  } =
    await supabase.rpc(
      "get_shared_outing",
      {
        requested_share_code:
          shareCode
      }
    );

  if (error) {
    console.error(
      "Could not read shared outing:",
      error
    );

    return null;
  }

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return null;
  }

  return data[0] as
    SharedOutingRow;
}

export default async function SharedOutingPage({
  params
}: SharedOutingPageProps) {
  const {
    shareCode
  } =
    await params;

  const sharedOuting =
    await getSharedOuting(
      shareCode
    );

  if (!sharedOuting) {
    notFound();
  }

  const plan =
    sharedOuting.generated_plan;

  return (
    <main className="outing-results-page">
      <header className="outing-results-heading">
        <span>
          {sharedOuting.planning_mode ===
          "group"
            ? "SHARED GROUP OUTING"
            : "SHARED SOLO OUTING"}
        </span>

        <h1>
          {plan.title}
        </h1>

        <p>
          A Venture plan created with
          real Winnipeg listings,
          opening hours, timing, and
          travel information.
        </p>
      </header>

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

      <OutingRouteMap
        plan={plan}
      />

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
                SHARED PLAN
              </span>

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
                        {stop.startTime}
                        {" – "}
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
            ?
          </span>

          <h2>
            This plan has no stops
          </h2>

          <p>
            The creator may need to
            generate another version.
          </p>
        </section>
      )}

      <div className="outing-result-actions">
        <Link href="/build-outing">
          Build your own outing
        </Link>

        <Link href="/explore">
          Explore Winnipeg
        </Link>
      </div>
    </main>
  );
}