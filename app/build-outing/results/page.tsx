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

import styles from "./results-refresh.module.css";

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

function getRecipeItems(
  mix:
    | StopMix
    | undefined
): {
  key: string;
  icon: string;
  label: string;
}[] {
  if (!mix) {
    return [
      { key: "flexible", icon: "✦", label: "Flexible" }
    ];
  }

  const items: { key: string; icon: string; label: string }[] = [];

  for (let index = 0; index < mix.food; index += 1) {
    items.push({ key: `food-${index}`, icon: "🍽", label: "Food" });
  }

  for (let index = 0; index < mix.events; index += 1) {
    items.push({ key: `event-${index}`, icon: "🎟", label: "Event" });
  }

  for (let index = 0; index < mix.drinks; index += 1) {
    items.push({ key: `drinks-${index}`, icon: "🍸", label: "Drinks" });
  }

  return items.length > 0
    ? items
    : [{ key: "flexible", icon: "✦", label: "Flexible" }];
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

function SaveRouteIcon({
  filled = false
}: {
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6.75 4.5h10.5a1.5 1.5 0 0 1 1.5 1.5v14.25l-6.75-3.9-6.75 3.9V6a1.5 1.5 0 0 1 1.5-1.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9.2 10.9 1.65 1.65 3.95-4.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareRouteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="18" cy="5" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m8 10.95 7.8-4.7M8 13.05l7.8 4.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshRouteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M19.25 8.25A7.75 7.75 0 1 0 19 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M15.5 8.25h3.75V4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m10.1 9.2 1.15 2.35 2.6.38-1.88 1.83.44 2.59-2.31-1.22-2.32 1.22.45-2.59-1.89-1.83 2.61-.38L10.1 9.2Z"
        fill="currentColor"
      />
    </svg>
  );
}


function SnapshotIcon({
  kind
}: {
  kind:
    | "date"
    | "start"
    | "people"
    | "length"
    | "travel"
    | "price"
    | "group";
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {kind === "date" ? (
        <>
          <rect x="4" y="5.5" width="16" height="14" rx="3" {...common} />
          <path d="M8 3.8v3.4M16 3.8v3.4M4 9.5h16" {...common} />
          <path d="M8 13h2M14 13h2M8 16.5h2" {...common} />
        </>
      ) : null}
      {kind === "start" ? (
        <>
          <circle cx="12" cy="12" r="8" {...common} />
          <path d="M12 7.5V12l3.2 2" {...common} />
        </>
      ) : null}
      {kind === "people" ? (
        <>
          <circle cx="9" cy="9" r="3" {...common} />
          <circle cx="16.5" cy="10" r="2.3" {...common} />
          <path d="M4.8 19c.4-3.3 2.1-5 4.2-5s3.8 1.7 4.2 5M13.2 15.2c.8-.8 1.8-1.2 3-1.2 1.9 0 3.2 1.5 3.5 4" {...common} />
        </>
      ) : null}
      {kind === "length" ? (
        <>
          <path d="M8 4h8M8 20h8M9 4c0 3.4 1.3 5.4 3 6.4 1.7 1 3 3 3 5.6M15 4c0 3.4-1.3 5.4-3 6.4-1.7 1-3 3-3 5.6" {...common} />
        </>
      ) : null}
      {kind === "travel" ? (
        <>
          <circle cx="12" cy="12" r="8" {...common} />
          <path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1Z" {...common} />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </>
      ) : null}
      {kind === "price" ? (
        <>
          <rect x="3.5" y="6" width="17" height="12" rx="2.5" {...common} />
          <circle cx="12" cy="12" r="3" {...common} />
          <path d="M6.5 9.5h.01M17.5 14.5h.01" {...common} />
        </>
      ) : null}
      {kind === "group" ? (
        <>
          <path d="M5 5.5h14v13H5z" {...common} />
          <path d="M8 9h8M8 12h5M8 15h4" {...common} />
        </>
      ) : null}
    </svg>
  );
}

function AddStopIcon({
  kind
}: {
  kind: StopKind;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {kind === "food" ? (
        <>
          <path d="M7 3.5v7M4.5 3.5v4.2c0 1.6 1 2.8 2.5 2.8s2.5-1.2 2.5-2.8V3.5M7 10.5v10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15 3.5c2.8 1.4 3.8 4.3 2.8 7.1-.6 1.6-1.8 2.8-3.3 3.4V20.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {kind === "event" ? (
        <>
          <path d="M4.5 7.5h15v9h-15z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 7.5V5.2M16 7.5V5.2M8.2 11h2.2M13.6 11h2.2M8.2 14h2.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "drinks" ? (
        <>
          <path d="M6 4h12l-5 7v8M9 20h6M8.1 7h7.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
    </svg>
  );
}

function DetailChevron({
  expanded
}: {
  expanded: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={expanded ? "m7 14 5-5 5 5" : "m7 10 5 5 5-5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TravelModeIcon({
  mode
}: {
  mode: string;
}) {
  const normalized = mode.toLowerCase();

  if (normalized.includes("walk")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="13" cy="4.5" r="2" fill="currentColor" />
        <path d="m11.5 8 3 2 2.2 3.1M11.5 8 9 12l3 2.2-2 5.3M12 14.2l4 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (normalized.includes("transit") || normalized.includes("bus")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="5" y="3.5" width="14" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 7h8M7.5 13.5h9M8 18.5v2M16 18.5v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8.5" cy="15.5" r="1" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (normalized.includes("ride")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="m5 14 2-5h10l2 5v4H5v-4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 9 9.2 6.5h5.6L16 9M7 18v2M17 18v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="15" r="1" fill="currentColor" />
        <circle cx="16" cy="15" r="1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m4.5 14 2.2-5.25h10.6L19.5 14v4.25h-15V14Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7.8 8.75 9 5.8h6l1.2 2.95M7 18.25v1.95M17 18.25v1.95" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="15" r="1.15" fill="currentColor" />
      <circle cx="16" cy="15" r="1.15" fill="currentColor" />
    </svg>
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

  const [
    expandedOrders,
    setExpandedOrders
  ] = useState<number[]>([]);

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
        setExpandedOrders([]);

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

  const recipeItems =
    getRecipeItems(
      plan?.actualMix
    );

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

  function toggleStopDetails(
    stopOrder: number
  ) {
    setExpandedOrders(
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
      className={`outing-results-page outing-results-v3 ${styles.refreshRoot}`}
      data-experiment-variant={
        resultsExperiment.variant ||
        "unassigned"
      }
      data-plan-status={
        status === "ready"
          ? planStatus
          : status
      }
    >
      <header className="outing-results-heading outing-results-hero-v3">
        <div className="outing-results-hero-copy">
          <div className={styles.heroEyebrowRow}>
            <span>
              VENTURE BUILDER
            </span>

            {status === "ready" && plan ? (
              <span
                className={`${styles.statusPill} ${styles[planStatus]}`}
              >
                {planStatus === "complete"
                  ? "✓ Complete"
                  : planStatus === "partial"
                    ? "◒ Partial"
                    : "! Needs changes"}
              </span>
            ) : null}
          </div>

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

            <div className={styles.routeRecipeCard}>
              <div className={styles.routeRecipeCopy}>
                <span>TONIGHT&apos;S ROUTE RECIPE</span>

                <strong>
                  {formatMixSummary(plan.actualMix)}
                </strong>

                <small>
                  {planStatus === "partial"
                    ? `${actualStopCount} of ${requestedStopCount} requested stops fit the current window`
                    : plan.anchorListingName
                      ? `Built around ${plan.anchorListingName}`
                      : `${actualStopCount} verified ${actualStopCount === 1 ? "stop" : "stops"} connected in itinerary order`}
                </small>
              </div>

              <div
                className={styles.routeRecipeIcons}
                aria-label={formatMixSummary(plan.actualMix)}
              >
                {recipeItems.map((item, index) => (
                  <span
                    key={item.key}
                    title={item.label}
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    {item.icon}
                  </span>
                ))}
              </div>
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
                  ? `saved ${styles.primaryAction}`
                  : styles.primaryAction
              }
              type="button"
              onClick={
                handleSaveOuting
              }
            >
              <span
                className={`${styles.actionIcon} ${styles.saveIcon}`}
                aria-hidden="true"
              >
                <SaveRouteIcon filled={saved} />
              </span>

              <span className={styles.actionCopy}>
                <strong>
                  {saved
                    ? "Saved"
                    : "Save outing"}
                </strong>
                <small>Keep this route for later</small>
              </span>
            </button>

            <button
              type="button"
              className={styles.shareAction}
              onClick={() => {
                void handleShareOuting();
              }}
            >
              <span
                className={`${styles.actionIcon} ${styles.shareIcon}`}
                aria-hidden="true"
              >
                <ShareRouteIcon />
              </span>

              <span className={styles.actionCopy}>
                <strong>Share</strong>
                <small>Send the plan to your people</small>
              </span>
            </button>

            <button
              type="button"
              className={styles.refreshAction}
              disabled={
                refreshingUnlocked ||
                replacingOrder !== null ||
                addingKind !== null
              }
              onClick={() => {
                void handleRefreshUnlocked();
              }}
            >
              <span
                className={`${styles.actionIcon} ${styles.refreshIcon} ${refreshingUnlocked ? styles.spinning : ""}`}
                aria-hidden="true"
              >
                <RefreshRouteIcon />
              </span>

              <span className={styles.actionCopy}>
                <strong>
                  {refreshingUnlocked
                    ? "Refreshing"
                    : "Refresh unlocked"}
                </strong>
                <small>Keep locked stops, remix the rest</small>
              </span>
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

          <section className={styles.snapshotSection}>
            <div className={styles.snapshotHeading}>
              <div className={styles.snapshotBadge}>
                <span className={styles.snapshotSpark} aria-hidden="true">✦</span>
                <span>ADVENTURE SNAPSHOT</span>
              </div>
              <h2>Your night&apos;s little blueprint</h2>
              <p>The useful details, dressed for the occasion.</p>
            </div>

            <div className={styles.snapshotRouteLine} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="outing-plan-summary outing-plan-summary-v3">
              <div className={`${styles.statCard} ${styles.dateCard}`}>
                <span><i className={styles.statIcon} aria-hidden="true"><SnapshotIcon kind="date" /></i> DATE</span>
                <strong>{formatPlanDate(plan.date)}</strong>
                <small>Your Venture day</small>
              </div>

              <div className={`${styles.statCard} ${styles.startCard}`}>
                <span><i className={styles.statIcon} aria-hidden="true"><SnapshotIcon kind="start" /></i> START</span>
                <strong>{plan.requestedStartTime}</strong>
                <small>Meet-up time</small>
              </div>

              <div className={`${styles.statCard} ${styles.peopleCard}`}>
                <span><i className={styles.statIcon} aria-hidden="true"><SnapshotIcon kind="people" /></i> PEOPLE</span>
                <strong>{partySize}</strong>
                <small>{partySize === 1 ? "Solo mission" : "Adventure crew"}</small>
              </div>

              <div className={`${styles.statCard} ${styles.lengthCard}`}>
                <span><i className={styles.statIcon} aria-hidden="true"><SnapshotIcon kind="length" /></i> LENGTH</span>
                <strong>{plan.requestedDuration}</strong>
                <small>Time carved out</small>
              </div>

              <div className={`${styles.statCard} ${styles.travelCard}`}>
                <span><i className={styles.statIcon} aria-hidden="true"><SnapshotIcon kind="travel" /></i> TRAVEL</span>
                <strong>{plan.transportation}</strong>
                <small>Up to {maxTravelMinutes} min between stops</small>
              </div>

              <div className={`${styles.statCard} ${styles.priceCard}`}>
                <span><i className={styles.statIcon} aria-hidden="true"><SnapshotIcon kind="price" /></i> PER PERSON</span>
                <strong>{formatCost(plan.estimatedTotalCad)}</strong>
                <small>Estimated route total</small>
              </div>

              {partySize > 1 ? (
                <div className={`${styles.statCard} ${styles.groupCard}`}>
                  <span><i className={styles.statIcon} aria-hidden="true"><SnapshotIcon kind="group" /></i> GROUP ESTIMATE</span>
                  <strong>{formatCost(estimatedGroupTotal)}</strong>
                  <small>For the whole crew</small>
                </div>
              ) : null}
            </div>
          </section>

          <section className={`outing-add-stop-panel ${styles.addStopPanel}`}>
            <div className={styles.addStopIntro}>
              <span className={styles.addStopSpark} aria-hidden="true">+</span>
              <div>
                <span>KEEP THE NIGHT GOING</span>

                <h2>
                  {planStatus ===
                  "partial"
                    ? "Complete the story"
                    : "One more memory?"}
                </h2>

                <p>
                  {planStatus ===
                  "partial"
                    ? "Pick a category and Venture will fill the safest available gap."
                    : "Drop in one more stop without unravelling the route you already love."}
                </p>
              </div>
            </div>

            <div className={`outing-add-stop-grid ${styles.addStopGrid}`}>
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
                    className={`${styles.addStopChoice} ${
                      option.kind === "food"
                        ? styles.foodChoice
                        : option.kind === "event"
                          ? styles.eventChoice
                          : styles.drinksChoice
                    }`}
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
                    <span className={styles.addStopIcon} aria-hidden="true">
                      <AddStopIcon kind={option.kind} />
                    </span>

                    <span className={styles.addStopCopy}>
                      <strong>
                        {addingKind ===
                        option.kind
                          ? "Adding..."
                          : `Add ${option.label}`}
                      </strong>
                      <small>
                        {option.kind === "food"
                          ? "A bite worth the detour"
                          : option.kind === "event"
                            ? "Give the night a headline"
                            : "Finish with a proper toast"}
                      </small>
                    </span>

                    <span className={styles.addStopArrow} aria-hidden="true">→</span>
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
                    YOUR NIGHT, SCENE BY SCENE
                  </span>

                  <h2>
                    {planStatus ===
                    "partial"
                      ? `${actualStopCount} of ${requestedStopCount} stops found`
                      : `Your ${actualStopCount}-stop outing`}
                  </h2>

                  <p>
                    Follow the route, open each stop, and tune the night without rebuilding everything.
                  </p>
                </div>
              </div>

              {plan.stops.map(
                (stop) => {
                  const kind =
                    getStopKind(stop);

                  const kindDetails =
                    getKindDetails(kind);

                  const expanded =
                    expandedOrders.includes(
                      stop.order
                    );

                  return (
                    <div
                      className={`outing-stop-wrapper outing-kind-${kind}`}
                      key={`${stop.listing.type}-${stop.listing.id}-${stop.order}`}
                    >
                      {stop.travelFromPreviousMinutes !==
                      null ? (
                        <div className="outing-travel-row">
                          <span
                            className="outing-travel-icon"
                            aria-hidden="true"
                          >
                            <TravelModeIcon mode={plan.transportation} />
                          </span>

                          <div className="outing-travel-copy">
                            <strong>Next stop</strong>
                            <p>
                              About{" "}
                              {stop.travelFromPreviousMinutes}{" "}
                              minutes by{" "}
                              {plan.transportation.toLowerCase()}
                            </p>
                          </div>

                          <i className="outing-travel-pulse" aria-hidden="true" />
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

                          <div className={styles.stopQuickFacts}>
                            <span>
                              <i aria-hidden="true">📍</i>
                              {stop.listing.neighbourhood || "Winnipeg"}
                            </span>

                            <span>
                              <i aria-hidden="true">💵</i>
                              {formatCost(
                                stop.estimatedCostCad
                              )}
                            </span>
                          </div>

                          <button
                            type="button"
                            className={styles.detailsToggle}
                            aria-expanded={expanded}
                            onClick={() =>
                              toggleStopDetails(
                                stop.order
                              )
                            }
                          >
                            <span>
                              {expanded
                                ? "Hide details"
                                : "Show details"}
                            </span>
                            <i aria-hidden="true">
                              <DetailChevron expanded={expanded} />
                            </i>
                          </button>

                          {expanded ? (
                            <div className={styles.stopDetailsPanel}>
                              <div className={styles.hoursRow}>
                                <span aria-hidden="true">🕒</span>
                                <div>
                                  <small>Hours or event time</small>
                                  <strong>
                                    {stop.listing.timeOrHours}
                                  </strong>
                                </div>
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
                                    : "Lock stop"}
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
                                <span>View full listing</span>
                                <i aria-hidden="true">→</i>
                              </Link>
                            </div>
                          ) : null}
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
              <span aria-hidden="true">↻</span>
              Generate another version
            </button>

            <Link href="/build-outing">
              <span aria-hidden="true">✎</span>
              Change preferences
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}
