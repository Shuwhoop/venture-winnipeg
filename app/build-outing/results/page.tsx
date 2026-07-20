"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  OutingRouteMap
} from "@/components/outing-route-map";
import Link from "next/link";

import {
  trackBetaEvent
} from "@/lib/beta/client";
import {
  useExperimentAssignment
} from "@/lib/experiments/client";

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

type StopKind =
  | "food"
  | "event"
  | "drinks";

type StopMix = {
  food: number;
  events: number;
  drinks: number;
};

type OutingDraft = {
  planningMode:
    | "solo"
    | "group";
  buildMethod?:
    | "surprise"
    | "mix"
    | "anchor";
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
  partySize?: number;
  maxTravelMinutes?: number;
  mustIncludeTerms?: string[];
  avoidTerms?: string[];
  stopMix?: StopMix;
  totalStops?: number;
  allowedKinds?: StopKind[];
  anchorListingKey?:
    | string
    | null;
  anchorListingName?:
    | string
    | null;
  soloVibe?: string | null;
  soloPace?: string | null;
  groupVibe?: string | null;
  groupPriority?: string | null;
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

function getListingSearchText(
  listing: GeneratedOutingPlan["stops"][number]["listing"]
): string {
  return [
    listing.name,
    listing.category,
    listing.subtitle,
    listing.description,
    listing.neighbourhood,
    listing.venueName ?? "",
    listing.address ?? "",
    listing.placeType ?? "",
    ...(listing.searchTerms ?? [])
  ]
    .join(" ")
    .toLowerCase();
}

function getStopKind(
  stop:
    GeneratedOutingPlan["stops"][number]
): StopKind {
  if (stop.kind) {
    return stop.kind;
  }

  if (
    stop.listing.type ===
    "event"
  ) {
    return "event";
  }

  const text =
    getListingSearchText(
      stop.listing
    );

  return (
    stop.listing.placeType ===
      "bar_pub" ||
    stop.listing.placeType ===
      "brewery" ||
    [
      "bar",
      "pub",
      "cocktail",
      "brewery",
      "nightclub",
      "nightlife"
    ].some(
      (keyword) =>
        text.includes(keyword)
    )
  )
    ? "drinks"
    : "food";
}

function getKindDetails(
  kind: StopKind
): {
  label: string;
  icon: string;
} {
  if (kind === "event") {
    return {
      label: "EVENT",
      icon: "🎟"
    };
  }

  if (kind === "drinks") {
    return {
      label: "DRINKS",
      icon: "🍸"
    };
  }

  return {
    label: "FOOD",
    icon: "🍽"
  };
}

function getBuildMethodLabel(
  method:
    GeneratedOutingPlan["buildMethod"]
): string {
  if (method === "anchor") {
    return "Built around a starting point";
  }

  if (method === "mix") {
    return "Your exact stop mix";
  }

  return "Venture surprise route";
}

function formatMixSummary(
  mix:
    | StopMix
    | undefined
): string {
  if (!mix) {
    return "Flexible route";
  }

  const parts = [
    mix.food > 0
      ? `${mix.food} food`
      : "",
    mix.events > 0
      ? `${mix.events} ${
          mix.events === 1
            ? "event"
            : "events"
        }`
      : "",
    mix.drinks > 0
      ? `${mix.drinks} drinks`
      : ""
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(" • ")
    : "Flexible route";
}

function countRequestedStops(
  mix:
    | StopMix
    | undefined
): number {
  if (!mix) {
    return 0;
  }

  return (
    mix.food +
    mix.events +
    mix.drinks
  );
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

  const [
    draft,
    setDraft
  ] =
    useState<OutingDraft | null>(
      null
    );

  const [
    lockedOrders,
    setLockedOrders
  ] = useState<number[]>([]);

  const [
    replacingOrder,
    setReplacingOrder
  ] =
    useState<number | null>(
      null
    );

  const [
    refreshingUnlocked,
    setRefreshingUnlocked
  ] = useState(false);

  const [
    excludedListingKeys,
    setExcludedListingKeys
  ] = useState<string[]>([]);

  const [
    addingKind,
    setAddingKind
  ] =
    useState<StopKind | null>(
      null
    );

  const resultsExperiment =
    useExperimentAssignment(
      "outing-results-presentation-v1",
      status === "ready" &&
        Boolean(plan)
    );

  const showSummaryFirst =
    resultsExperiment.enabled &&
    resultsExperiment.variant ===
      "summary_first";

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

      let parsedDraft: OutingDraft;

      try {
        parsedDraft =
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

      setDraft(
        parsedDraft
      );

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
                  parsedDraft
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

        setLockedOrders([]);
        setExcludedListingKeys([]);
        setReplacingOrder(null);
        setRefreshingUnlocked(false);
        setAddingKind(null);

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

  const partySize =
    Math.max(
      1,
      Math.min(
        12,
        draft?.partySize ??
          1
      )
    );

  const maxTravelMinutes =
    Math.max(
      5,
      Math.min(
        90,
        draft?.maxTravelMinutes ??
          20
      )
    );

  const requestedStopCount =
    plan?.requestedStopCount ??
    (
      countRequestedStops(
        plan?.requestedMix
      ) ||
      draft?.totalStops ||
      plan?.stops.length ||
      0
    );

  const actualStopCount =
    plan?.actualStopCount ??
    plan?.stops.length ??
    0;

  const missingStopCount =
    plan?.missingStopCount ??
    Math.max(
      0,
      requestedStopCount -
        actualStopCount
    );

  const planStatus =
    plan?.planStatus ??
    (actualStopCount === 0
      ? "empty"
      : missingStopCount > 0
        ? "partial"
        : "complete");

  const preferenceWarnings =
    useMemo(
      () => {
        if (!plan) {
          return [];
        }

        const warnings:
          string[] = [];

        const longLegs =
          plan.stops.filter(
            (stop) =>
              stop
                .travelFromPreviousMinutes !==
                null &&
              stop
                .travelFromPreviousMinutes >
                maxTravelMinutes
          );

        if (
          longLegs.length >
          0
        ) {
          warnings.push(
            `${longLegs.length} travel ${
              longLegs.length === 1
                ? "leg is"
                : "legs are"
            } longer than your ${maxTravelMinutes}-minute comfort limit.`
          );
        }

        const mustIncludeTerms =
          draft
            ?.mustIncludeTerms ??
          [];

        if (
          mustIncludeTerms.length >
          0
        ) {
          const combinedText =
            plan.stops
              .map(
                (stop) =>
                  getListingSearchText(
                    stop.listing
                  )
              )
              .join(" ");

          const missingTerms =
            mustIncludeTerms.filter(
              (term) =>
                !combinedText.includes(
                  term.toLowerCase()
                )
            );

          if (
            missingTerms.length >
            0
          ) {
            warnings.push(
              `Venture could not confidently include: ${missingTerms.join(", ")}.`
            );
          }
        }

        return warnings;
      },
      [
        draft,
        maxTravelMinutes,
        plan
      ]
    );

  const allWarnings =
    useMemo(
      () =>
        Array.from(
          new Set([
            ...(plan?.warnings ?? []),
            ...preferenceWarnings
          ])
        ),
      [
        plan,
        preferenceWarnings
      ]
    );

  const estimatedGroupTotal =
    plan?.estimatedTotalCad ===
      null ||
    plan?.estimatedTotalCad ===
      undefined
      ? null
      : plan.estimatedTotalCad *
        partySize;

  function handleSaveOuting() {
    if (!plan) {
      return;
    }

    if (saved) {
      removeSavedOuting(
        plan.planId
      );

      trackBetaEvent({
        eventName:
          "outing_unsaved",
        pagePath:
          "/build-outing/results",
        properties: {
          planId:
            plan.planId,
          planStatus:
            plan.planStatus ||
            "unknown",
          recommendationVersion:
            plan.recommendationVersion ||
            "legacy",
          experimentSlug:
            resultsExperiment
              .experimentSlug,
          experimentVariant:
            resultsExperiment
              .variant
        }
      });

      setSaved(false);
      setActionMessage(
        "Outing removed from Saved."
      );

      return;
    }

    saveOuting(plan);

    trackBetaEvent({
      eventName:
        "outing_saved",
      pagePath:
        "/build-outing/results",
      properties: {
        planId:
          plan.planId,
        planStatus:
          plan.planStatus ||
          "unknown",
        stopCount:
          plan.stops.length,
        recommendationVersion:
          plan.recommendationVersion ||
          "legacy",
        experimentSlug:
          resultsExperiment
            .experimentSlug,
        experimentVariant:
          resultsExperiment
            .variant
      }
    });

    setSaved(true);

    setActionMessage(
      "Outing saved."
    );
  }

  function toggleLock(
    stopOrder: number
  ) {
    setLockedOrders(
      (current) =>
        current.includes(
          stopOrder
        )
          ? current.filter(
              (order) =>
                order !==
                stopOrder
            )
          : [
              ...current,
              stopOrder
            ]
    );
  }

  async function requestReplacement(
    currentPlan:
      GeneratedOutingPlan,
    stopOrder: number,
    exclusions: string[]
  ): Promise<{
    plan:
      GeneratedOutingPlan;
    previousListingKey:
      string;
  }> {
    if (!draft) {
      throw new Error(
        "The outing setup could not be found."
      );
    }

    const response =
      await fetch(
        "/api/outings/generate/replace-stop",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              draft,
              plan:
                currentPlan,
              stopOrder,

              excludedListingKeys:
                exclusions
            })
        }
      );

    const result =
      (await response.json()) as {
        plan?:
          GeneratedOutingPlan;
        previousListingKey?:
          string;
        error?: string;
      };

    if (
      !response.ok ||
      !result.plan ||
      !result.previousListingKey
    ) {
      throw new Error(
        result.error ||
        "No suitable replacement was found."
      );
    }

    return {
      plan:
        result.plan,

      previousListingKey:
        result.previousListingKey
    };
  }

  async function handleReplaceStop(
    stopOrder: number
  ) {
    if (
      !plan ||
      replacingOrder !==
        null ||
      refreshingUnlocked
    ) {
      return;
    }

    setReplacingOrder(
      stopOrder
    );

    setActionMessage(
      `Finding a new option for stop ${stopOrder}...`
    );

    try {
      const result =
        await requestReplacement(
          plan,
          stopOrder,
          excludedListingKeys
        );

      const updatedExclusions =
        Array.from(
          new Set([
            ...excludedListingKeys,
            result
              .previousListingKey
          ])
        );

      setPlan(
        result.plan
      );

      setExcludedListingKeys(
        updatedExclusions
      );

      setSaved(false);

      window.localStorage.setItem(
        GENERATED_OUTING_KEY,
        JSON.stringify(
          result.plan
        )
      );

      setActionMessage(
        `Stop ${stopOrder} was replaced.`
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "The stop could not be replaced."
      );
    } finally {
      setReplacingOrder(
        null
      );
    }
  }

  async function handleRefreshUnlocked() {
    if (
      !plan ||
      !draft ||
      refreshingUnlocked ||
      replacingOrder !==
        null
    ) {
      return;
    }

    const unlockedOrders =
      plan.stops
        .map(
          (stop) =>
            stop.order
        )
        .filter(
          (order) =>
            !lockedOrders.includes(
              order
            )
        );

    if (
      unlockedOrders.length ===
      0
    ) {
      setActionMessage(
        "Every stop is locked. Unlock at least one stop first."
      );

      return;
    }

    setRefreshingUnlocked(
      true
    );

    setActionMessage(
      `Refreshing ${unlockedOrders.length} unlocked ${
        unlockedOrders.length ===
        1
          ? "stop"
          : "stops"
      }...`
    );

    let workingPlan =
      plan;

    let workingExclusions = [
      ...excludedListingKeys
    ];

    let replacedCount =
      0;

    try {
      for (
        const stopOrder
        of unlockedOrders
      ) {
        try {
          const result =
            await requestReplacement(
              workingPlan,
              stopOrder,
              workingExclusions
            );

          workingPlan =
            result.plan;

          workingExclusions =
            Array.from(
              new Set([
                ...workingExclusions,
                result
                  .previousListingKey
              ])
            );

          replacedCount += 1;
        } catch {
          /*
           * Keep the current stop when
           * no trustworthy replacement
           * fits its exact window.
           */
        }
      }

      if (
        replacedCount ===
        0
      ) {
        setActionMessage(
          "No other verified listings fit the unlocked time slots."
        );

        return;
      }

      setPlan(
        workingPlan
      );

      setExcludedListingKeys(
        workingExclusions
      );

      setSaved(false);

      window.localStorage.setItem(
        GENERATED_OUTING_KEY,
        JSON.stringify(
          workingPlan
        )
      );

      setActionMessage(
        `Refreshed ${replacedCount} ${
          replacedCount === 1
            ? "stop"
            : "stops"
        }.`
      );
    } finally {
      setRefreshingUnlocked(
        false
      );
    }
  }

  async function handleAddStop(
    requestedKind: StopKind
  ) {
    if (
      !plan ||
      !draft ||
      addingKind !== null ||
      replacingOrder !== null ||
      refreshingUnlocked
    ) {
      return;
    }

    if (
      plan.stops.length >= 5
    ) {
      setActionMessage(
        "This outing already has the current maximum of five stops."
      );
      return;
    }

    setAddingKind(
      requestedKind
    );

    setActionMessage(
      `Finding another ${requestedKind} stop...`
    );

    try {
      const response =
        await fetch(
          "/api/outings/generate/add-stop",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                draft,
                plan,
                requestedKind,
                excludedListingKeys
              })
          }
        );

      const result =
        (await response.json()) as {
          plan?:
            GeneratedOutingPlan;
          addedListingKey?:
            string;
          error?: string;
        };

      if (
        !response.ok ||
        !result.plan
      ) {
        throw new Error(
          result.error ||
          `No additional ${requestedKind} stop fits this outing.`
        );
      }

      setPlan(
        result.plan
      );
      setSaved(false);
      setLockedOrders([]);

      if (
        result.addedListingKey
      ) {
        setExcludedListingKeys(
          (current) =>
            Array.from(
              new Set([
                ...current,
                result.addedListingKey!
              ])
            )
        );
      }

      window.localStorage.setItem(
        GENERATED_OUTING_KEY,
        JSON.stringify(
          result.plan
        )
      );

      setActionMessage(
        `Added another ${requestedKind} stop. Stop numbers were refreshed.`
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "The stop could not be added."
      );
    } finally {
      setAddingKind(null);
    }
  }

  async function handleShareOuting() {
  if (!plan) {
    return;
  }

  const storedDraft =
    window.localStorage.getItem(
      OUTING_DRAFT_KEY
    );

  if (!storedDraft) {
    setActionMessage(
      "The outing setup could not be found."
    );

    return;
  }

  let draft: OutingDraft;

  try {
    draft =
      JSON.parse(
        storedDraft
      ) as OutingDraft;
  } catch {
    setActionMessage(
      "The outing setup could not be read."
    );

    return;
  }

  setActionMessage(
    "Creating your share link..."
  );

  try {
    const response =
      await fetch(
        "/api/outings/share",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              draft,
              plan
            })
        }
      );

    const responseText =
      await response.text();

    let result: {
      shareUrl?: string;
      shareCode?: string;
      error?: string;
    };

    try {
      result =
        JSON.parse(responseText);
    } catch {
      throw new Error(
        `Share request failed with status ${response.status}.`
      );
    }

    if (
      !response.ok ||
      !result.shareUrl
    ) {
      throw new Error(
        result.error ||
        "The share link could not be created."
      );
    }

    const shareText =
      buildShareText(plan);

    if (
      typeof navigator.share ===
      "function"
    ) {
      await navigator.share({
        title:
          plan.title,

        text:
          shareText,

        url:
          result.shareUrl
      });

      setActionMessage(
        "Outing shared."
      );

      return;
    }

    await navigator.clipboard.writeText(
      `${shareText}\n\n${result.shareUrl}`
    );

    setActionMessage(
      "Share link copied to your clipboard."
    );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      setActionMessage("");
      return;
    }

    setActionMessage(
      error instanceof Error
        ? error.message
        : "The outing could not be shared."
    );
  }
}
  return (
    <main
      className="outing-results-page outing-results-v3"
      data-experiment-variant={
        resultsExperiment.variant ||
        "unassigned"
      }
    >
      <header className="outing-results-heading outing-results-hero-v3">
        <div className="outing-results-hero-copy">
          <span>
            VENTURE BUILDER
          </span>

          <h1>
            {plan
              ? plan.title
              : "Building your outing"}
          </h1>

          <p>
            {plan
              ? getBuildMethodLabel(
                  plan.buildMethod
                )
              : "Connecting verified Winnipeg listings into one route."}
          </p>
        </div>

        <div
          className="outing-results-route-art"
          aria-hidden="true"
        >
          <span>1</span>
          <i />
          <span>2</span>
          <i />
          <span>3</span>
        </div>
      </header>

      {status === "loading" ? (
        <section className="outing-loading-card">
          <span
            className="outing-loading-spinner"
            aria-hidden="true"
          />

          <div>
            <strong>
              Connecting the outing
            </strong>

            <p>
              Checking event times,
              opening hours, requested
              categories, prices, and
              travel between stops.
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
            Choose how Venture should
            build the route before
            generating a plan.
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
          {showSummaryFirst ? (
            <section className="outing-experiment-preview">
              <div className="outing-experiment-preview-heading">
                <span>
                  YOUR OUTING AT A GLANCE
                </span>
                <strong>
                  Start with the plan,
                  then explore the map
                </strong>
                <small>
                  See the order and timing before opening the full route.
                </small>
              </div>

              <ol>
                {plan.stops
                  .slice(0, 4)
                  .map((stop) => (
                    <li
                      key={`${stop.order}-${stop.listing.id}`}
                    >
                      <span>
                        {stop.startTime}
                      </span>
                      <strong>
                        {stop.listing.name}
                      </strong>
                      <small>
                        {stop.listing.neighbourhood ||
                          stop.listing.category}
                      </small>
                    </li>
                  ))}
              </ol>
            </section>
          ) : null}

          <section className="outing-map-first-stage">
            <OutingRouteMap
              plan={plan}
            />

            <div className="outing-map-caption-card">
              <span>
                YOUR ROUTE RECIPE
              </span>

              <strong>
                {formatMixSummary(
                  plan.actualMix
                )}
              </strong>

              <small>
                {planStatus ===
                "partial"
                  ? `${actualStopCount} of ${requestedStopCount} requested stops fit the current window`
                  : plan.anchorListingName
                    ? `Anchored by ${plan.anchorListingName}`
                    : `${actualStopCount} verified ${
                        actualStopCount === 1
                          ? "stop"
                          : "stops"
                      } connected in itinerary order`}
              </small>
            </div>
          </section>

          <section
            className={`outing-completeness-card ${planStatus}`}
          >
            <div>
              <span>
                {planStatus ===
                "complete"
                  ? "FULL ROUTE READY"
                  : planStatus ===
                      "partial"
                    ? "PARTIAL ROUTE"
                    : "NO ROUTE YET"}
              </span>

              <strong>
                {planStatus ===
                "complete"
                  ? `All ${requestedStopCount} requested ${
                      requestedStopCount === 1
                        ? "stop is"
                        : "stops are"
                    } ready.`
                  : planStatus ===
                      "partial"
                    ? `${actualStopCount} of ${requestedStopCount} stops found.`
                    : "No verified stops fit yet."}
              </strong>

              <p>
                {planStatus ===
                "complete"
                  ? "Times, travel, and current listing details were checked before building this route."
                  : planStatus ===
                      "partial"
                    ? "The current filters were too tight to safely fill every slot. Edit the search or add a stop below."
                    : "Try a wider area, longer outing, larger travel limit, or more flexible budget."}
              </p>
            </div>

            {planStatus !==
            "complete" ? (
              <Link href="/build-outing">
                Edit search
              </Link>
            ) : null}
          </section>

          <section className="outing-action-dock">
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
                : "Save"}
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

              Share
            </button>

            <button
              type="button"
              disabled={
                refreshingUnlocked ||
                replacingOrder !== null ||
                addingKind !== null
              }
              onClick={() => {
                void handleRefreshUnlocked();
              }}
            >
              <span aria-hidden="true">
                ↻
              </span>

              {refreshingUnlocked
                ? "Refreshing"
                : "Refresh"}
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

          <section className="outing-plan-summary outing-plan-summary-v3">
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
                {plan.requestedStartTime}
              </strong>
            </div>

            <div>
              <span>PEOPLE</span>
              <strong>
                {partySize}
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
              <small>
                Max {maxTravelMinutes} min
                per leg
              </small>
            </div>

            <div>
              <span>
                PER PERSON
              </span>
              <strong>
                {formatCost(
                  plan.estimatedTotalCad
                )}
              </strong>
            </div>

            {partySize > 1 ? (
              <div>
                <span>
                  GROUP ESTIMATE
                </span>
                <strong>
                  {formatCost(
                    estimatedGroupTotal
                  )}
                </strong>
              </div>
            ) : null}
          </section>

          <section className="outing-add-stop-panel">
            <div>
              <span>
                KEEP BUILDING
              </span>

              <h2>
                {planStatus ===
                "partial"
                  ? "Fill the missing stop"
                  : "Add another stop"}
              </h2>

              <p>
                {planStatus ===
                "partial"
                  ? "Try a category below. Venture will keep the current route and use a safe available gap."
                  : "Venture will place it in an available gap without breaking the existing route."}
              </p>
            </div>

            <div className="outing-add-stop-grid">
              {(
                [
                  {
                    kind:
                      "food" as const,
                    icon: "🍽",
                    label: "Food"
                  },
                  {
                    kind:
                      "event" as const,
                    icon: "🎟",
                    label: "Event"
                  },
                  {
                    kind:
                      "drinks" as const,
                    icon: "🍸",
                    label: "Drinks"
                  }
                ]
              ).map(
                (option) => (
                  <button
                    type="button"
                    key={option.kind}
                    disabled={
                      addingKind !== null ||
                      replacingOrder !== null ||
                      refreshingUnlocked ||
                      plan.stops.length >= 5 ||
                      (
                        option.kind ===
                          "drinks" &&
                        plan.alcoholFree
                      )
                    }
                    onClick={() => {
                      void handleAddStop(
                        option.kind
                      );
                    }}
                  >
                    <span
                      aria-hidden="true"
                    >
                      {option.icon}
                    </span>

                    <strong>
                      {addingKind ===
                      option.kind
                        ? "Adding..."
                        : `Add ${option.label}`}
                    </strong>
                  </button>
                )
              )}
            </div>
          </section>

          {allWarnings.length > 0 ? (
            <section className="outing-warning-list">
              {allWarnings.map(
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

          {plan.stops.length > 0 ? (
            <section className="outing-timeline outing-timeline-v3">
              <div className="section-heading">
                <div>
                  <span>
                    PLAN DETAILS
                  </span>

                  <h2>
                    {planStatus ===
                    "partial"
                      ? `${actualStopCount} of ${requestedStopCount} stops found`
                      : `Your ${actualStopCount}-stop outing`}
                  </h2>

                  <p>
                    Lock favourites, replace
                    anything uncertain, or
                    open each listing for
                    full details.
                  </p>
                </div>
              </div>

              {plan.stops.map(
                (stop) => {
                  const kind =
                    getStopKind(stop);

                  const kindDetails =
                    getKindDetails(kind);

                  return (
                    <div
                      className={`outing-stop-wrapper outing-kind-${kind}`}
                      key={`${stop.listing.type}-${stop.listing.id}-${stop.order}`}
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
                            {stop.travelFromPreviousMinutes}{" "}
                            minutes by{" "}
                            {plan.transportation.toLowerCase()}
                          </p>
                        </div>
                      ) : null}

                      <article className="outing-stop-card outing-stop-card-v3">
                        <div className="outing-stop-order">
                          {stop.order}
                        </div>

                        <div className="outing-stop-content">
                          <div className="outing-stop-topline">
                            <span>
                              {stop.startTime}–
                              {stop.endTime}
                            </span>

                            <small className={`outing-kind-badge kind-${kind}`}>
                              <i
                                aria-hidden="true"
                              >
                                {kindDetails.icon}
                              </i>
                              {kindDetails.label}
                            </small>
                          </div>

                          <h2>
                            {stop.listing.name}
                          </h2>

                          <p className="outing-stop-subtitle">
                            {stop.listing.subtitle}
                          </p>

                          <p className="outing-stop-reason">
                            {stop.reason}
                          </p>

                          <div className="outing-stop-details">
                            <span>
                              {stop.listing.neighbourhood}
                            </span>

                            <span>
                              {formatCost(
                                stop.estimatedCostCad
                              )}
                            </span>

                            <span>
                              {stop.listing.timeOrHours}
                            </span>
                          </div>

                          <div className="outing-stop-controls">
                            <button
                              type="button"
                              className={
                                lockedOrders.includes(
                                  stop.order
                                )
                                  ? "locked"
                                  : ""
                              }
                              aria-pressed={
                                lockedOrders.includes(
                                  stop.order
                                )
                              }
                              onClick={() =>
                                toggleLock(
                                  stop.order
                                )
                              }
                            >
                              <span aria-hidden="true">
                                {lockedOrders.includes(
                                  stop.order
                                )
                                  ? "🔒"
                                  : "🔓"}
                              </span>

                              {lockedOrders.includes(
                                stop.order
                              )
                                ? "Locked"
                                : "Lock"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                lockedOrders.includes(
                                  stop.order
                                ) ||
                                replacingOrder !== null ||
                                refreshingUnlocked ||
                                addingKind !== null
                              }
                              onClick={() => {
                                void handleReplaceStop(
                                  stop.order
                                );
                              }}
                            >
                              <span aria-hidden="true">
                                ↻
                              </span>

                              {replacingOrder ===
                              stop.order
                                ? "Replacing..."
                                : `Replace ${kind}`}
                            </button>
                          </div>

                          <Link
                            className="outing-stop-link"
                            href={`/listings/${stop.listing.slug}`}
                          >
                            View full listing
                          </Link>
                        </div>
                      </article>
                    </div>
                  );
                }
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
                fewer category requests.
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
