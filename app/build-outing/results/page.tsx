"use client";

import type {
  PointerEvent as ReactPointerEvent
} from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  OutingRouteMap
} from "@/components/outing-route-map";
import {
  VisitButton
} from "@/components/visit-button";
import Link from "next/link";
import { createPortal } from "react-dom";

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
  getOutingStopKey,
  reorderOutingPlan
} from "@/lib/outing-reorder";

import {
  repairOutingSchedule,
  validateOutingSchedule
} from "@/lib/outing-schedule-validation";

import {
  isOutingSaved,
  removeSavedOuting,
  saveOuting,
  type GeneratedOutingPlan
} from "@/lib/saved-outings";

import {
  addVisits,
  getVisitHistory,
  getVisitedEventOccurrenceKeys,
  getVisitedListingKeys,
  VISIT_HISTORY_EVENT
} from "@/lib/visit-history";

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
  discoveryPreference?:
    | "best"
    | "new-only"
    | "mix";
  visitedListingKeys?: string[];
  visitedEventOccurrenceKeys?: string[];
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

type AddStopOption = {
  key: string;
  kind: StopKind;
  name: string;
  category: string;
  subtitle: string;
  neighbourhood: string;
  startTime: string;
  endTime: string;
  insertionIndex: number;
  positionLabel: string;
  estimatedCostCad: number | null;
  travelMinutes: number;
  fitReason: string;
};

type ReplacementOption = {
  key: string;
  previousListingKey: string;
  kind: StopKind;
  name: string;
  category: string;
  subtitle: string;
  neighbourhood: string;
  startTime: string;
  endTime: string;
  estimatedCostCad: number | null;
  travelMinutes: number | null;
  fitReason: string;
  plan: GeneratedOutingPlan;
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

function getDirectionsUrl(
  listing: GeneratedOutingPlan["stops"][number]["listing"]
): string {
  const destination = [
    listing.name,
    listing.address,
    listing.neighbourhood,
    "Winnipeg"
  ]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination
  )}`;
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
} {
  if (kind === "event") {
    return { label: "EVENT" };
  }

  if (kind === "drinks") {
    return { label: "DRINKS" };
  }

  return { label: "FOOD" };
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
        d="M7.25 4.25h9.5c.83 0 1.5.67 1.5 1.5v14.1L12 16.35l-6.25 3.5V5.75c0-.83.67-1.5 1.5-1.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      {filled ? (
        <path
          d="m9.2 10.7 1.75 1.75 3.9-4.15"
          fill="none"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
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
      <path
        d="M12 15V3.75M7.75 8 12 3.75 16.25 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11.5H4.75A1.75 1.75 0 0 0 3 13.25v5A1.75 1.75 0 0 0 4.75 20h14.5A1.75 1.75 0 0 0 21 18.25v-5a1.75 1.75 0 0 0-1.75-1.75H18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
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

function StopFactIcon({
  kind
}: {
  kind: "location" | "price" | "time" | "duration";
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {kind === "location" ? (
        <>
          <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </>
      ) : null}
      {kind === "price" ? (
        <>
          <rect x="3.5" y="6" width="17" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6.5 9.5h.01M17.5 14.5h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "time" ? (
        <>
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7.5V12l3.2 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "duration" ? (
        <>
          <path d="M8 4h8M8 20h8M9 4c0 3.4 1.3 5.4 3 6.4 1.7 1 3 3 3 5.6M15 4c0 3.4-1.3 5.4-3 6.4-1.7 1-3 3-3 5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
    </svg>
  );
}

function LockRouteIcon({
  locked
}: {
  locked: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      {locked ? (
        <path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M9 10V7.5a4 4 0 0 1 7.3-2.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
      <circle cx="12" cy="15" r="1.2" fill="currentColor" />
    </svg>
  );
}

function CompleteRouteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.5 12.2 2.2 2.2 4.9-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReorderRouteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 6h11M8 12h11M8 18h11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="4.5" cy="6" r="1.1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1.1" fill="currentColor" />
    </svg>
  );
}

function getStopDomId(
  stop: GeneratedOutingPlan["stops"][number]
): string {
  return `outing-stop-${getOutingStopKey(stop).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
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
    sharing,
    setSharing
  ] = useState(false);

  const [
    removedStopUndo,
    setRemovedStopUndo
  ] = useState<{
    previousPlan: GeneratedOutingPlan;
    stopName: string;
  } | null>(null);

  const undoTimerRef =
    useRef<number | null>(null);

  const [
    completionSheetOpen,
    setCompletionSheetOpen
  ] = useState(false);

  const [
    completionSelections,
    setCompletionSelections
  ] = useState<string[]>([]);

  const [
    loggingCompletion,
    setLoggingCompletion
  ] = useState(false);

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
    addStopSheetKind,
    setAddStopSheetKind
  ] = useState<StopKind | null>(null);

  const [
    addStopOptions,
    setAddStopOptions
  ] = useState<AddStopOption[]>([]);

  const [
    loadingAddStopOptions,
    setLoadingAddStopOptions
  ] = useState(false);

  const [
    removingOrder,
    setRemovingOrder
  ] = useState<number | null>(null);

  const [
    replacementSheetOrder,
    setReplacementSheetOrder
  ] = useState<number | null>(null);

  const [
    replacementOptions,
    setReplacementOptions
  ] = useState<ReplacementOption[]>([]);

  const [
    loadingReplacementOptions,
    setLoadingReplacementOptions
  ] = useState(false);

  const [
    applyingReplacementKey,
    setApplyingReplacementKey
  ] = useState<string | null>(null);

  const [
    openStopMenuOrder,
    setOpenStopMenuOrder
  ] = useState<number | null>(null);

  const [
    dismissedScheduleSignature,
    setDismissedScheduleSignature
  ] = useState("");

  const [
    expandedOrders,
    setExpandedOrders
  ] = useState<number[]>([]);

  const [
    routeEditMode,
    setRouteEditMode
  ] = useState(false);

  const [
    draggingStopKey,
    setDraggingStopKey
  ] = useState<string | null>(null);

  const draggingStopKeyRef =
    useRef<string | null>(null);

  const planRef =
    useRef<GeneratedOutingPlan | null>(null);

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

      const personalizedDraft: OutingDraft = {
        ...parsedDraft,
        visitedListingKeys:
          getVisitedListingKeys(),
        visitedEventOccurrenceKeys:
          getVisitedEventOccurrenceKeys()
      };

      setDraft(
        personalizedDraft
      );

      window.localStorage.setItem(
        OUTING_DRAFT_KEY,
        JSON.stringify(personalizedDraft)
      );

      setStatus("loading");
      setErrorMessage("");
      setActionMessage("");
      setSharing(false);
      setRemovedStopUndo(null);
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
      setCompletionSheetOpen(false);
      setCompletionSelections([]);
      setLoggingCompletion(false);

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
                  personalizedDraft
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
        setAddStopSheetKind(null);
        setAddStopOptions([]);
        setLoadingAddStopOptions(false);
        setRemovingOrder(null);
        setReplacementSheetOrder(null);
        setReplacementOptions([]);
        setLoadingReplacementOptions(false);
        setApplyingReplacementKey(null);
        setOpenStopMenuOrder(null);
        setDismissedScheduleSignature("");
        setExpandedOrders([]);
        setRouteEditMode(false);
        setDraggingStopKey(null);
        draggingStopKeyRef.current = null;

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

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    if (!actionMessage || removedStopUndo) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActionMessage("");
    }, 4800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [actionMessage, removedStopUndo]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function refreshVisitKeys() {
      setDraft((current) => {
        if (!current) {
          return current;
        }

        const nextDraft: OutingDraft = {
          ...current,
          visitedListingKeys:
            getVisitedListingKeys(),
          visitedEventOccurrenceKeys:
            getVisitedEventOccurrenceKeys()
        };

        window.localStorage.setItem(
          OUTING_DRAFT_KEY,
          JSON.stringify(nextDraft)
        );

        return nextDraft;
      });
    }

    window.addEventListener(
      VISIT_HISTORY_EVENT,
      refreshVisitKeys
    );

    return () => {
      window.removeEventListener(
        VISIT_HISTORY_EVENT,
        refreshVisitKeys
      );
    };
  }, []);

  useEffect(() => {
    if (
      !addStopSheetKind &&
      replacementSheetOrder === null &&
      !completionSheetOpen
    ) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        addingKind === null &&
        applyingReplacementKey === null
      ) {
        setAddStopSheetKind(null);
        setAddStopOptions([]);
        setReplacementSheetOrder(null);
        setReplacementOptions([]);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    addStopSheetKind,
    addingKind,
    applyingReplacementKey,
    completionSheetOpen,
    replacementSheetOrder
  ]);

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

  const actualStopCount =
    plan?.stops.length ?? 0;

  const requestedStopCount =
    Math.max(
      actualStopCount,
      plan?.requestedStopCount ??
      (
        countRequestedStops(
          plan?.requestedMix
        ) ||
        draft?.totalStops ||
        actualStopCount
      )
    );

  const recipeItems =
    getRecipeItems(
      plan?.actualMix
    );

  const missingStopCount =
    Math.max(
      0,
      requestedStopCount -
        actualStopCount
    );

  const planStatus =
    actualStopCount === 0
      ? "empty"
      : missingStopCount > 0
        ? "partial"
        : "complete";

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

  const scheduleIssues = useMemo(
    () => (plan ? validateOutingSchedule(plan) : []),
    [plan]
  );

  const scheduleIssueSignature = useMemo(
    () => scheduleIssues.map((issue) => issue.id).join("|"),
    [scheduleIssues]
  );

  const visibleScheduleIssues =
    scheduleIssueSignature &&
    scheduleIssueSignature !== dismissedScheduleSignature
      ? scheduleIssues
      : [];

  const estimatedGroupTotal =
    plan?.estimatedTotalCad ===
      null ||
    plan?.estimatedTotalCad ===
      undefined
      ? null
      : plan.estimatedTotalCad *
        partySize;

  function applyPlanUpdate(
    nextPlan: GeneratedOutingPlan,
    message: string,
    resetLocks = true
  ) {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setRemovedStopUndo(null);

    planRef.current = nextPlan;
    setPlan(nextPlan);

    if (resetLocks) {
      setLockedOrders([]);
    }

    if (saved) {
      saveOuting(nextPlan);
      setSaved(true);
    } else {
      setSaved(false);
    }

    window.localStorage.setItem(
      GENERATED_OUTING_KEY,
      JSON.stringify(nextPlan)
    );

    setOpenStopMenuOrder(null);
    setDismissedScheduleSignature("");
    setActionMessage(message);
  }

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
    exclusions: string[],
    previewOnly = false
  ): Promise<{
    plan:
      GeneratedOutingPlan;
    previousListingKey:
      string;
    replacementListingKey:
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
                exclusions,
              previewOnly
            })
        }
      );

    const result =
      (await response.json()) as {
        plan?:
          GeneratedOutingPlan;
        previousListingKey?:
          string;
        replacementListingKey?:
          string;
        error?: string;
      };

    if (
      !response.ok ||
      !result.plan ||
      !result.previousListingKey ||
      !result.replacementListingKey
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
        result.previousListingKey,
      replacementListingKey:
        result.replacementListingKey
    };
  }

  async function openReplacementOptions(
    stopOrder: number
  ) {
    if (
      !plan ||
      replacingOrder !== null ||
      refreshingUnlocked ||
      loadingReplacementOptions ||
      removingOrder !== null ||
      addingKind !== null
    ) {
      return;
    }

    const currentStop = plan.stops.find(
      (stop) => stop.order === stopOrder
    );

    if (!currentStop) {
      return;
    }

    setOpenStopMenuOrder(null);
    setReplacementSheetOrder(stopOrder);
    setReplacementOptions([]);
    setLoadingReplacementOptions(true);
    setActionMessage(
      `Finding alternatives for ${currentStop.listing.name}...`
    );

    const options: ReplacementOption[] = [];
    let workingExclusions = [...excludedListingKeys];

    try {
      for (let index = 0; index < 4; index += 1) {
        try {
          const result = await requestReplacement(
            plan,
            stopOrder,
            workingExclusions,
            true
          );
          const replacementStop = result.plan.stops.find(
            (stop) => stop.order === stopOrder
          );

          if (!replacementStop) {
            break;
          }

          options.push({
            key: result.replacementListingKey,
            previousListingKey: result.previousListingKey,
            kind: getStopKind(replacementStop),
            name: replacementStop.listing.name,
            category: replacementStop.listing.category,
            subtitle: replacementStop.listing.subtitle,
            neighbourhood:
              replacementStop.listing.neighbourhood || "Winnipeg",
            startTime: replacementStop.startTime,
            endTime: replacementStop.endTime,
            estimatedCostCad: replacementStop.estimatedCostCad,
            travelMinutes: replacementStop.travelFromPreviousMinutes,
            fitReason: replacementStop.reason,
            plan: result.plan
          });

          workingExclusions = Array.from(
            new Set([
              ...workingExclusions,
              result.replacementListingKey
            ])
          );
        } catch {
          break;
        }
      }

      if (options.length === 0) {
        throw new Error(
          "No other verified listing fits this exact time, budget, and travel window."
        );
      }

      setReplacementOptions(options);
      setActionMessage(
        `${options.length} replacement ${
          options.length === 1 ? "option fits" : "options fit"
        } this time slot.`
      );
    } catch (error) {
      setReplacementSheetOrder(null);
      setReplacementOptions([]);
      setActionMessage(
        error instanceof Error
          ? error.message
          : "No suitable replacement was found."
      );
    } finally {
      setLoadingReplacementOptions(false);
    }
  }

  function applyReplacementOption(option: ReplacementOption) {
    if (replacementSheetOrder === null || applyingReplacementKey !== null) {
      return;
    }

    const stopOrder = replacementSheetOrder;
    setApplyingReplacementKey(option.key);
    setReplacingOrder(stopOrder);

    setExcludedListingKeys((current) =>
      Array.from(
        new Set([
          ...current,
          option.previousListingKey,
          option.key
        ])
      )
    );

    trackBetaEvent({
      eventName: "outing_stop_replaced",
      pagePath: "/build-outing/results",
      properties: {
        stopOrder,
        previousListingKey: option.previousListingKey,
        replacementListingKey: option.key,
        recommendationVersion:
          option.plan.recommendationVersion || "route-score-v1"
      }
    });

    applyPlanUpdate(
      option.plan,
      `Stop ${stopOrder} is now ${option.name}.`,
      false
    );
    setExpandedOrders([stopOrder]);
    setReplacementSheetOrder(null);
    setReplacementOptions([]);
    setApplyingReplacementKey(null);
    setReplacingOrder(null);
  }

  function handleFixSchedule() {
    if (!plan) {
      return;
    }

    const repairedPlan = repairOutingSchedule(plan);
    applyPlanUpdate(
      repairedPlan,
      "Timing adjusted around fixed events and route travel.",
      false
    );
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

      setExcludedListingKeys(
        workingExclusions
      );

      applyPlanUpdate(
        workingPlan,
        `Refreshed ${replacedCount} ${
          replacedCount === 1
            ? "stop"
            : "stops"
        }.`,
        false
      );
    } finally {
      setRefreshingUnlocked(
        false
      );
    }
  }

  async function openAddStopOptions(
    requestedKind: StopKind
  ) {
    if (
      !plan ||
      !draft ||
      addingKind !== null ||
      replacingOrder !== null ||
      refreshingUnlocked ||
      removingOrder !== null ||
      replacementSheetOrder !== null
    ) {
      return;
    }

    if (plan.stops.length >= 5) {
      setActionMessage(
        "This outing already has the current maximum of five stops."
      );
      return;
    }

    setAddStopSheetKind(requestedKind);
    setAddStopOptions([]);
    setLoadingAddStopOptions(true);
    setActionMessage(
      `Finding verified ${requestedKind} options...`
    );

    try {
      const response = await fetch(
        "/api/outings/generate/add-stop",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            draft,
            plan,
            requestedKind,
            excludedListingKeys,
            previewOnly: true
          })
        }
      );

      const result = (await response.json()) as {
        options?: AddStopOption[];
        error?: string;
      };

      if (
        !response.ok ||
        !result.options ||
        result.options.length === 0
      ) {
        throw new Error(
          result.error ||
          `No additional ${requestedKind} stop fits this outing.`
        );
      }

      setAddStopOptions(result.options);
      setActionMessage(
        `${result.options.length} ${requestedKind} ${
          result.options.length === 1
            ? "option fits"
            : "options fit"
        } this route.`
      );
    } catch (error) {
      setAddStopSheetKind(null);
      setAddStopOptions([]);
      setActionMessage(
        error instanceof Error
          ? error.message
          : "No suitable additional stop was found."
      );
    } finally {
      setLoadingAddStopOptions(false);
    }
  }

  async function handleAddStop(
    requestedKind: StopKind,
    selectedListingKey: string
  ) {
    if (
      !plan ||
      !draft ||
      addingKind !== null ||
      replacingOrder !== null ||
      refreshingUnlocked ||
      removingOrder !== null
    ) {
      return;
    }

    setAddingKind(requestedKind);
    setActionMessage(
      `Adding your selected ${requestedKind} stop...`
    );

    try {
      const response = await fetch(
        "/api/outings/generate/add-stop",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            draft,
            plan,
            requestedKind,
            selectedListingKey,
            excludedListingKeys
          })
        }
      );

      const result = (await response.json()) as {
        plan?: GeneratedOutingPlan;
        addedListingKey?: string;
        error?: string;
      };

      if (!response.ok || !result.plan) {
        throw new Error(
          result.error ||
          `No additional ${requestedKind} stop fits this outing.`
        );
      }

      if (result.addedListingKey) {
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

      const addedOrder =
        result.addedListingKey
          ? result.plan.stops.find(
              (stop) =>
                `${stop.listing.type}-${stop.listing.id}` ===
                result.addedListingKey
            )?.order
          : undefined;

      if (addedOrder) {
        setExpandedOrders([addedOrder]);
      }

      applyPlanUpdate(
        result.plan,
        `Added ${
          result.plan.stops.find(
            (stop) => stop.order === addedOrder
          )?.listing.name || `another ${requestedKind} stop`
        }. Your outing now has ${result.plan.stops.length} stops.`
      );

      setAddStopSheetKind(null);
      setAddStopOptions([]);
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

  async function handleRemoveStop(
    stopOrder: number
  ) {
    if (
      !plan ||
      !draft ||
      removingOrder !== null ||
      replacingOrder !== null ||
      refreshingUnlocked ||
      addingKind !== null
    ) {
      return;
    }

    const stop = plan.stops.find(
      (item) => item.order === stopOrder
    );

    if (!stop) {
      return;
    }

    if (plan.stops.length <= 1) {
      setActionMessage(
        "An outing needs at least one stop."
      );
      return;
    }

    const previousPlan = plan;

    setRemovedStopUndo(null);
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    setRemovingOrder(stopOrder);
    setActionMessage(
      `Removing ${stop.listing.name}...`
    );

    try {
      const response = await fetch(
        "/api/outings/generate/remove-stop",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            draft,
            plan,
            stopOrder
          })
        }
      );

      const result = (await response.json()) as {
        plan?: GeneratedOutingPlan;
        removedListingName?: string;
        error?: string;
      };

      if (!response.ok || !result.plan) {
        throw new Error(
          result.error ||
          "The stop could not be removed."
        );
      }

      const removedName =
        result.removedListingName ||
        stop.listing.name;

      setExpandedOrders([]);
      applyPlanUpdate(
        result.plan,
        `${removedName} was removed.`
      );

      setRemovedStopUndo({
        previousPlan,
        stopName: removedName
      });

      undoTimerRef.current = window.setTimeout(() => {
        setRemovedStopUndo(null);
        setActionMessage("");
        undoTimerRef.current = null;
      }, 8000);
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "The stop could not be removed."
      );
    } finally {
      setRemovingOrder(null);
    }
  }

  function handleUndoRemove() {
    if (!removedStopUndo) {
      return;
    }

    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    const { previousPlan, stopName } = removedStopUndo;
    setRemovedStopUndo(null);
    setExpandedOrders([]);
    applyPlanUpdate(
      previousPlan,
      `${stopName} is back in your route.`
    );
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

  function moveStopToTarget(
    sourceKey: string,
    targetKey: string,
    announce = false
  ) {
    const currentPlan = planRef.current;

    if (!currentPlan || sourceKey === targetKey) {
      return;
    }

    const lockedKeys = new Set(
      currentPlan.stops
        .filter((stop) =>
          lockedOrders.includes(stop.order)
        )
        .map(getOutingStopKey)
    );
    const expandedKeys = new Set(
      currentPlan.stops
        .filter((stop) =>
          expandedOrders.includes(stop.order)
        )
        .map(getOutingStopKey)
    );

    const nextPlan = reorderOutingPlan(
      currentPlan,
      sourceKey,
      targetKey
    );

    if (nextPlan === currentPlan) {
      return;
    }

    applyPlanUpdate(
      nextPlan,
      announce
        ? "Route order updated. Travel and timing were recalculated."
        : "",
      false
    );

    setLockedOrders(
      nextPlan.stops
        .filter((stop) =>
          lockedKeys.has(getOutingStopKey(stop))
        )
        .map((stop) => stop.order)
    );
    setExpandedOrders(
      nextPlan.stops
        .filter((stop) =>
          expandedKeys.has(getOutingStopKey(stop))
        )
        .map((stop) => stop.order)
    );
  }

  function moveStopByDirection(
    stopKey: string,
    direction: -1 | 1
  ) {
    if (!plan) {
      return;
    }

    const currentIndex = plan.stops.findIndex(
      (stop) => getOutingStopKey(stop) === stopKey
    );
    const targetIndex = currentIndex + direction;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= plan.stops.length
    ) {
      return;
    }

    moveStopToTarget(
      stopKey,
      getOutingStopKey(plan.stops[targetIndex]),
      true
    );
  }

  function handleStopDragStart(
    event: ReactPointerEvent<HTMLButtonElement>,
    stopKey: string
  ) {
    if (!routeEditMode) {
      return;
    }

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
    draggingStopKeyRef.current = stopKey;
    setDraggingStopKey(stopKey);
    document.body.classList.add(
      "venture-route-reordering"
    );
    setActionMessage(
      "Drag the stop to its new position."
    );
  }

  function handleStopDragMove(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    const sourceKey = draggingStopKeyRef.current;

    if (!sourceKey) {
      return;
    }

    if (event.clientY < 110) {
      window.scrollBy({ top: -12, behavior: "auto" });
    } else if (
      event.clientY > window.innerHeight - 130
    ) {
      window.scrollBy({ top: 12, behavior: "auto" });
    }

    const target = document
      .elementFromPoint(
        event.clientX,
        event.clientY
      )
      ?.closest<HTMLElement>(
        "[data-venture-stop-key]"
      );
    const targetKey =
      target?.dataset.ventureStopKey;

    if (!targetKey || targetKey === sourceKey) {
      return;
    }

    moveStopToTarget(
      sourceKey,
      targetKey
    );
  }

  function handleStopDragEnd(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    const hadActiveDrag =
      draggingStopKeyRef.current !== null;

    draggingStopKeyRef.current = null;
    setDraggingStopKey(null);
    document.body.classList.remove(
      "venture-route-reordering"
    );

    if (hadActiveDrag) {
      setActionMessage(
        "Route order updated. Venture recalculated travel and timing."
      );
    }
  }

  function openCompletionSheet() {
    if (!plan) {
      return;
    }

    setCompletionSelections(
      plan.stops.map(
        (stop) =>
          `${stop.listing.type}-${stop.listing.id}`
      )
    );
    setCompletionSheetOpen(true);
  }

  function toggleCompletionStop(
    listingKey: string
  ) {
    setCompletionSelections(
      (current) =>
        current.includes(listingKey)
          ? current.filter(
              (key) => key !== listingKey
            )
          : [...current, listingKey]
    );
  }

  function getCompletionVisitedAt(
    dateKey: string
  ) {
    const parsed = new Date(
      `${dateKey}T12:00:00`
    );

    return Number.isNaN(parsed.getTime())
      ? new Date().toISOString()
      : parsed.toISOString();
  }

  function handleConfirmCompletion() {
    if (
      !plan ||
      completionSelections.length === 0
    ) {
      setActionMessage(
        "Choose at least one stop you made it to."
      );
      return;
    }

    setLoggingCompletion(true);

    const existing = getVisitHistory();
    const selectedStops = plan.stops.filter(
      (stop) =>
        completionSelections.includes(
          `${stop.listing.type}-${stop.listing.id}`
        )
    );

    const newEntries = selectedStops
      .filter((stop) =>
        !existing.some(
          (visit) =>
            visit.outingId === plan.planId &&
            visit.listingKey ===
              `${stop.listing.type}-${stop.listing.id}`
        )
      )
      .map((stop) => ({
        listing: stop.listing,
        options: {
          source: "outing_complete" as const,
          outingId: plan.planId,
          fallbackEventDate: plan.date,
          visitedAt:
            getCompletionVisitedAt(plan.date)
        }
      }));

    if (newEntries.length > 0) {
      addVisits(newEntries);
    }

    setLoggingCompletion(false);
    setCompletionSheetOpen(false);
    setActionMessage(
      newEntries.length > 0
        ? `${newEntries.length} ${
            newEntries.length === 1
              ? "visit"
              : "visits"
          } added to My Venture.`
        : "Those stops are already in your Venture history."
    );

    trackBetaEvent({
      eventName: "outing_completed",
      pagePath: "/build-outing/results",
      properties: {
        planId: plan.planId,
        confirmedStopCount:
          selectedStops.length,
        newVisitCount:
          newEntries.length
      }
    });
  }

  async function handleShareOuting() {
  if (!plan || sharing) {
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

  setSharing(true);
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
  } finally {
    setSharing(false);
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
                <small>Keep it ready for later</small>
              </span>
            </button>

            <button
              type="button"
              className={styles.shareAction}
              disabled={sharing}
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
                <strong>{sharing ? "Creating link..." : "Share"}</strong>
                <small>{sharing ? "Getting the route ready" : "Send the full route"}</small>
              </span>
            </button>

            <button
              type="button"
              className={styles.completeAction}
              onClick={openCompletionSheet}
            >
              <span
                className={`${styles.actionIcon} ${styles.completeIcon}`}
                aria-hidden="true"
              >
                <CompleteRouteIcon />
              </span>

              <span className={styles.actionCopy}>
                <strong>Mark complete</strong>
                <small>Confirm where you went</small>
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
                <small>Keep favourites, switch the rest</small>
              </span>
            </button>
          </section>

          {actionMessage ? (
            <div
              className={`${styles.actionToast} ${removedStopUndo ? styles.undoToast : ""}`}
              aria-live="polite"
            >
              <span className={styles.actionToastIcon} aria-hidden="true">
                {removedStopUndo ? "−" : "✓"}
              </span>
              <p>{actionMessage}</p>
              {removedStopUndo ? (
                <button type="button" onClick={handleUndoRemove}>
                  Undo
                </button>
              ) : null}
            </div>
          ) : null}

          <nav className={styles.routeNavigator} aria-label="Jump to a stop">
            <div className={styles.routeNavigatorHeading}>
              <span>QUICK ROUTE</span>
              <strong>Tap a stop to jump there</strong>
            </div>
            <ol>
              {plan.stops.map((stop) => (
                <li key={`jump-${getOutingStopKey(stop)}`}>
                  <button
                    type="button"
                    onClick={() => {
                      document
                        .getElementById(getStopDomId(stop))
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center"
                        });
                    }}
                  >
                    <span>{stop.order}</span>
                    <div>
                      <small>{stop.startTime}</small>
                      <strong>{stop.listing.name}</strong>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <section className={styles.snapshotSection}>
            <div className={styles.snapshotHeading}>
              <div className={styles.snapshotBadge}>
                <span className={styles.snapshotSpark} aria-hidden="true">✦</span>
                <span>ADVENTURE SNAPSHOT</span>
              </div>
              <h2>The plan, without the clutter</h2>
              <p>Everything you need before you head out.</p>
            </div>

            <div className={styles.snapshotRouteLine} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="outing-plan-summary outing-plan-summary-v3">
              <div className={`${styles.statCard} ${styles.whenCard}`}>
                <div className={styles.whenMain}>
                  <span><i className={styles.statIcon} aria-hidden="true"><SnapshotIcon kind="date" /></i> DATE</span>
                  <strong>{formatPlanDate(plan.date)}</strong>
                  <small>Your Venture day</small>
                </div>

                <div className={styles.whenTime}>
                  <span><i className={styles.statIcon} aria-hidden="true"><SnapshotIcon kind="start" /></i> START</span>
                  <strong>{plan.requestedStartTime}</strong>
                  <small>Meet-up time</small>
                </div>
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
                <span>EXTEND THE ROUTE</span>

                <h2>
                  {planStatus ===
                  "partial"
                    ? "Fill the missing stop"
                    : "Add another stop"}
                </h2>

                <p>
                  {planStatus ===
                  "partial"
                    ? "Choose what is missing and Venture will place it where the route still works."
                    : "Add one more place without rebuilding the outing from scratch."}
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
                      removingOrder !== null ||
                      plan.stops.length >= 5 ||
                      (
                        option.kind ===
                          "drinks" &&
                        plan.alcoholFree
                      )
                    }
                    onClick={() => {
                      void openAddStopOptions(
                        option.kind
                      );
                    }}
                  >
                    <span className={styles.addStopIcon} aria-hidden="true">
                      <AddStopIcon kind={option.kind} />
                    </span>

                    <span className={styles.addStopCopy}>
                      <strong>
                        {loadingAddStopOptions &&
                        addStopSheetKind === option.kind
                          ? "Finding options..."
                          : `Choose ${option.label}`}
                      </strong>
                      <small>
                        {option.kind === "food"
                          ? "A nearby place to eat"
                          : option.kind === "event"
                            ? "An event that fits the timing"
                            : "A drinks stop near the route"}
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

          {visibleScheduleIssues.length > 0 ? (
            <section className={styles.scheduleCheckCard} aria-live="polite">
              <div className={styles.scheduleCheckHeader}>
                <span className={styles.scheduleCheckIcon} aria-hidden="true">!</span>
                <div>
                  <small>SMART ROUTE CHECK</small>
                  <h2>
                    {visibleScheduleIssues.some(
                      (issue) => issue.severity === "critical"
                    )
                      ? "This order needs attention"
                      : "A few timing details to check"}
                  </h2>
                  <p>
                    Venture checked fixed event times, travel gaps, and your selected outing window.
                  </p>
                </div>
              </div>

              <div className={styles.scheduleIssueList}>
                {visibleScheduleIssues.slice(0, 4).map((issue) => (
                  <article
                    key={issue.id}
                    className={
                      issue.severity === "critical"
                        ? styles.scheduleIssueCritical
                        : styles.scheduleIssueWarning
                    }
                  >
                    <span aria-hidden="true">
                      {issue.severity === "critical" ? "×" : "!"}
                    </span>
                    <div>
                      <strong>{issue.title}</strong>
                      <p>{issue.message}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className={styles.scheduleCheckActions}>
                <button type="button" onClick={handleFixSchedule}>
                  <span aria-hidden="true">↻</span>
                  Fix the timing
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDismissedScheduleSignature(scheduleIssueSignature)
                  }
                >
                  Keep this order
                </button>
              </div>
            </section>
          ) : null}

          {plan.stops.length > 0 ? (
            <section className="outing-timeline outing-timeline-v3">
              <div className={`section-heading ${styles.routeHeading}`}>
                <div>
                  <span>
                    YOUR ROUTE
                  </span>

                  <h2 aria-live="polite">
                    {planStatus === "partial" ? (
                      <>
                        <b
                          className={styles.liveStopCount}
                          key={`partial-${actualStopCount}`}
                        >
                          {actualStopCount}
                        </b>{" "}
                        of {requestedStopCount} stops found
                      </>
                    ) : (
                      <>
                        Your{" "}
                        <b
                          className={styles.liveStopCount}
                          key={`complete-${actualStopCount}`}
                        >
                          {actualStopCount}
                        </b>
                        -stop outing
                      </>
                    )}
                  </h2>

                  <p>
                    {routeEditMode
                      ? "Press and hold the grip, then drag each stop into your preferred order."
                      : "One smooth plan, with every stop in the order it makes sense."}
                  </p>
                </div>

                <button
                  type="button"
                  className={styles.routeEditButton}
                  aria-pressed={routeEditMode}
                  onClick={() => {
                    const nextMode = !routeEditMode;
                    setRouteEditMode(nextMode);
                    draggingStopKeyRef.current = null;
                    setDraggingStopKey(null);
                    document.body.classList.remove(
                      "venture-route-reordering"
                    );
                    setActionMessage(
                      nextMode
                        ? "Route editing is on. Drag the grip or use the arrow buttons."
                        : "Route order saved."
                    );
                  }}
                >
                  <span aria-hidden="true">
                    {routeEditMode ? "✓" : "↕"}
                  </span>
                  {routeEditMode
                    ? "Done"
                    : "Edit order"}
                </button>
              </div>

              {routeEditMode ? (
                <div
                  className={styles.routeEditNotice}
                  role="status"
                >
                  <span aria-hidden="true"><ReorderRouteIcon /></span>
                  <p>
                    Hold the dotted grip and drag. Venture updates the numbering, map, travel legs, timing, saved outing, and share data.
                  </p>
                </div>
              ) : null}

              {plan.stops.map(
                (stop, stopIndex) => {
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
                      id={getStopDomId(stop)}
                      className={`outing-stop-wrapper outing-kind-${kind} ${
                        routeEditMode
                          ? styles.reorderableStop
                          : ""
                      } ${
                        draggingStopKey === getOutingStopKey(stop)
                          ? styles.draggingStop
                          : ""
                      }`}
                      key={getOutingStopKey(stop)}
                      data-venture-stop-key={getOutingStopKey(stop)}
                      style={{
                        animationDelay: `${Math.min(stopIndex, 6) * 90}ms`
                      }}
                    >
                      {stop.travelFromPreviousMinutes !==
                      null ? (
                        <div className={styles.travelConnector}>
                          <span
                            className={styles.travelRail}
                            aria-hidden="true"
                          >
                            <i />
                            <b>
                              <TravelModeIcon mode={plan.transportation} />
                            </b>
                            <i />
                          </span>

                          <div className={styles.travelMain}>
                            <span>NEXT STOP</span>
                            <strong>
                              {stop.travelFromPreviousMinutes} min
                            </strong>
                            <small>
                              {plan.transportation} to {stop.listing.name}
                            </small>
                          </div>

                          <div className={styles.travelArrival}>
                            <span>EST. ARRIVAL</span>
                            <strong>{stop.startTime}</strong>
                          </div>
                        </div>
                      ) : null}

                      <article className="outing-stop-card outing-stop-card-v3">
                        {routeEditMode ? (
                          <div className={styles.routeDragTools}>
                            <button
                              type="button"
                              className={styles.routeDragHandle}
                              aria-label={`Drag ${stop.listing.name} to reorder the outing`}
                              onPointerDown={(event) =>
                                handleStopDragStart(
                                  event,
                                  getOutingStopKey(stop)
                                )
                              }
                              onPointerMove={handleStopDragMove}
                              onPointerUp={handleStopDragEnd}
                              onPointerCancel={handleStopDragEnd}
                            >
                              <span aria-hidden="true">
                                <i />
                                <i />
                                <i />
                                <i />
                                <i />
                                <i />
                              </span>
                            </button>

                            <div className={styles.routeMoveButtons}>
                              <button
                                type="button"
                                aria-label={`Move ${stop.listing.name} earlier`}
                                disabled={stopIndex === 0}
                                onClick={() =>
                                  moveStopByDirection(
                                    getOutingStopKey(stop),
                                    -1
                                  )
                                }
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                aria-label={`Move ${stop.listing.name} later`}
                                disabled={stopIndex === plan.stops.length - 1}
                                onClick={() =>
                                  moveStopByDirection(
                                    getOutingStopKey(stop),
                                    1
                                  )
                                }
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <div className="outing-stop-order">
                          {stop.order}
                        </div>

                        <div className="outing-stop-content">
                          <div className="outing-stop-topline">
                            <span>
                              {stop.startTime}–
                              {stop.endTime}
                            </span>

                            <span className={styles.stopTopActions}>
                              <small className={`outing-kind-badge kind-${kind}`}>
                                <i className={styles.kindBadgeIcon} aria-hidden="true">
                                  <AddStopIcon kind={kind} />
                                </i>
                                {kindDetails.label}
                              </small>

                              <button
                                type="button"
                                className={styles.stopMenuButton}
                                aria-label={`Edit ${stop.listing.name}`}
                                aria-expanded={openStopMenuOrder === stop.order}
                                onClick={() =>
                                  setOpenStopMenuOrder((current) =>
                                    current === stop.order ? null : stop.order
                                  )
                                }
                              >
                                <span aria-hidden="true">•••</span>
                              </button>
                            </span>
                          </div>

                          {openStopMenuOrder === stop.order ? (
                            <div className={styles.stopMenuPanel}>
                              <button
                                type="button"
                                disabled={
                                  lockedOrders.includes(stop.order) ||
                                  loadingReplacementOptions ||
                                  replacingOrder !== null ||
                                  refreshingUnlocked ||
                                  removingOrder !== null
                                }
                                onClick={() => {
                                  void openReplacementOptions(stop.order);
                                }}
                              >
                                <span aria-hidden="true">↻</span>
                                Replace stop
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  toggleStopDetails(stop.order);
                                  setOpenStopMenuOrder(null);
                                }}
                              >
                                <span aria-hidden="true">⌄</span>
                                {expanded ? "Hide details" : "View details"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRouteEditMode(true);
                                  setOpenStopMenuOrder(null);
                                  setActionMessage(
                                    "Route editing is on. Drag the grip or use the arrow buttons."
                                  );
                                }}
                              >
                                <span aria-hidden="true">↕</span>
                                Move in route
                              </button>

                              <a
                                href={getDirectionsUrl(stop.listing)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setOpenStopMenuOrder(null)}
                              >
                                <span aria-hidden="true">↗</span>
                                Open directions
                              </a>

                              <button
                                type="button"
                                className={styles.stopMenuRemove}
                                disabled={
                                  plan.stops.length <= 1 ||
                                  removingOrder !== null
                                }
                                onClick={() => {
                                  setOpenStopMenuOrder(null);
                                  void handleRemoveStop(stop.order);
                                }}
                              >
                                <span aria-hidden="true">−</span>
                                Remove stop
                              </button>
                            </div>
                          ) : null}

                          <h2>
                            {stop.listing.name}
                          </h2>

                          <p className="outing-stop-subtitle">
                            {stop.listing.subtitle}
                          </p>


                          <div className={styles.stopQuickFacts}>
                            <span>
                              <i aria-hidden="true"><StopFactIcon kind="location" /></i>
                              {stop.listing.neighbourhood || "Winnipeg"}
                            </span>

                            <span>
                              <i aria-hidden="true"><StopFactIcon kind="price" /></i>
                              {formatCost(
                                stop.estimatedCostCad
                              )}
                            </span>

                            <span>
                              <i aria-hidden="true"><StopFactIcon kind="duration" /></i>
                              {stop.durationMinutes} min
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
                                ? "Close stop plan"
                                : "Plan this stop"}
                            </span>
                            <i aria-hidden="true">
                              <DetailChevron expanded={expanded} />
                            </i>
                          </button>

                          {expanded ? (
                            <div className={styles.stopDetailsPanel}>
                              <div className={styles.hoursRow}>
                                <span aria-hidden="true"><StopFactIcon kind="time" /></span>
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
                                    <LockRouteIcon
                                      locked={lockedOrders.includes(stop.order)}
                                    />
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
                                    addingKind !== null ||
                                    removingOrder !== null
                                  }
                                  onClick={() => {
                                    void openReplacementOptions(
                                      stop.order
                                    );
                                  }}
                                >
                                  <span aria-hidden="true">
                                    ↻
                                  </span>

                                  {loadingReplacementOptions &&
                                  replacementSheetOrder === stop.order
                                    ? "Finding options..."
                                    : `Replace ${kind}`}
                                </button>


                                <button
                                  type="button"
                                  className={styles.removeStopButton}
                                  disabled={
                                    plan.stops.length <= 1 ||
                                    replacingOrder !== null ||
                                    refreshingUnlocked ||
                                    addingKind !== null ||
                                    removingOrder !== null
                                  }
                                  onClick={() => {
                                    void handleRemoveStop(
                                      stop.order
                                    );
                                  }}
                                >
                                  <span aria-hidden="true">
                                    −
                                  </span>

                                  {removingOrder === stop.order
                                    ? "Removing..."
                                    : "Remove stop"}
                                </button>
                              </div>

                              <VisitButton
                                listing={stop.listing}
                                fallbackEventDate={plan.date}
                                compact
                              />

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
              Build a fresh version
            </button>

            <Link href="/build-outing">
              <span aria-hidden="true">✎</span>
              Edit preferences
            </Link>
          </div>

          {/* VENTURE RESULTS FLOW POLISH V1.3 */}
          <aside
            className={styles.routeEstimateNote}
            aria-label="Planning estimates"
          >
            <span
              className={styles.routeEstimateIcon}
              aria-hidden="true"
            >
              i
            </span>

            <div>
              <strong>Plan with a little wiggle room.</strong>
              <p>
                Route order, travel and arrival times, prices, and outing totals are estimates based on the latest information Venture has available. Traffic, transit delays, venue availability, menu prices, tickets, cover charges, taxes, tips, and other costs can change. Check final hours, reservations, prices, and directions with the venue or your navigation app before heading out.
              </p>
            </div>
          </aside>
        </>
      ) : null}
      {completionSheetOpen &&
      plan &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              className={styles.completionBackdrop}
              onMouseDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  !loggingCompletion
                ) {
                  setCompletionSheetOpen(false);
                }
              }}
            >
              <section
                className={styles.completionSheet}
                role="dialog"
                aria-modal="true"
                aria-labelledby="completion-sheet-title"
              >
                <span
                  className={styles.completionHandle}
                  aria-hidden="true"
                />

                <button
                  type="button"
                  className={styles.completionClose}
                  aria-label="Close outing completion"
                  disabled={loggingCompletion}
                  onClick={() =>
                    setCompletionSheetOpen(false)
                  }
                >
                  ×
                </button>

                <header className={styles.completionHeader}>
                  <span>MY VENTURE</span>
                  <h2 id="completion-sheet-title">
                    Which stops did you make it to?
                  </h2>
                  <p>
                    Uncheck anything you skipped. Only confirmed stops shape New to Me recommendations.
                  </p>
                </header>

                <div className={styles.completionList}>
                  {plan.stops.map((stop) => {
                    const key =
                      `${stop.listing.type}-${stop.listing.id}`;
                    const selected =
                      completionSelections.includes(key);

                    return (
                      <label
                        className={`${styles.completionStop} ${
                          selected
                            ? styles.completionStopSelected
                            : ""
                        }`}
                        key={key}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            toggleCompletionStop(key)
                          }
                        />
                        <span className={styles.completionCheck}>
                          {selected ? "✓" : ""}
                        </span>
                        <span className={styles.completionOrder}>
                          {stop.order}
                        </span>
                        <span className={styles.completionCopy}>
                          <strong>{stop.listing.name}</strong>
                          <small>
                            {stop.startTime}–{stop.endTime} · {stop.listing.neighbourhood || "Winnipeg"}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <footer className={styles.completionFooter}>
                  <span>
                    {completionSelections.length} of {plan.stops.length} selected
                  </span>
                  <button
                    type="button"
                    disabled={
                      loggingCompletion ||
                      completionSelections.length === 0
                    }
                    onClick={handleConfirmCompletion}
                  >
                    {loggingCompletion
                      ? "Saving visits…"
                      : "Add to My Venture"}
                  </button>
                </footer>
              </section>
            </div>,
            document.body
          )
        : null}

      {addStopSheetKind && typeof document !== "undefined"
        ? createPortal(
            <div
              className={styles.addStopSheetBackdrop}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              addingKind === null
            ) {
              setAddStopSheetKind(null);
              setAddStopOptions([]);
            }
          }}
        >
          <section
            className={styles.addStopSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-stop-sheet-title"
          >
            <span
              className={styles.addStopSheetHandle}
              aria-hidden="true"
            />

            <button
              type="button"
              className={styles.addStopSheetClose}
              aria-label="Close stop options"
              disabled={addingKind !== null}
              onClick={() => {
                setAddStopSheetKind(null);
                setAddStopOptions([]);
              }}
            >
              ×
            </button>

            <header className={styles.addStopSheetHeader}>
              <span>BEST VERIFIED FITS</span>
              <h2 id="add-stop-sheet-title">
                Choose a {addStopSheetKind} stop
              </h2>
              <p>
                Venture checked the timing, route, travel limit, and your preferences.
              </p>
            </header>

            {loadingAddStopOptions ? (
              <div
                className={styles.addStopSheetLoading}
                aria-live="polite"
              >
                {[0, 1, 2].map((item) => (
                  <span key={item} />
                ))}
                <p>Finding stops that genuinely fit...</p>
              </div>
            ) : (
              <div className={styles.addStopOptionList}>
                {addStopOptions.map((option, optionIndex) => (
                  <button
                    type="button"
                    className={styles.addStopOptionCard}
                    key={option.key}
                    disabled={addingKind !== null}
                    style={{
                      animationDelay: `${optionIndex * 70}ms`
                    }}
                    onClick={() => {
                      void handleAddStop(
                        addStopSheetKind,
                        option.key
                      );
                    }}
                  >
                    <span className={styles.addStopOptionNumber}>
                      {optionIndex + 1}
                    </span>

                    <span className={styles.addStopOptionMain}>
                      <small>
                        {option.category} · {option.neighbourhood}
                      </small>
                      <strong>{option.name}</strong>
                      <em>{option.subtitle}</em>

                      <span className={styles.addStopOptionFacts}>
                        <i>
                          {option.startTime}–{option.endTime}
                        </i>
                        <i>{option.positionLabel}</i>
                        <i>
                          {option.travelMinutes} min route travel
                        </i>
                      </span>

                      <span className={styles.addStopOptionFit}>
                        Fits the current time window and keeps the route moving smoothly.
                      </span>
                    </span>

                    <span className={styles.addStopOptionPrice}>
                      <small>EST.</small>
                      <strong>
                        {formatCost(option.estimatedCostCad)}
                      </strong>
                      <i aria-hidden="true">
                        {addingKind === addStopSheetKind
                          ? "…"
                          : "→"}
                      </i>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!loadingAddStopOptions && addStopOptions.length > 0 ? (
              <p className={styles.addStopSheetNote}>
                Choose one option. Venture will insert it in the correct place and refresh the whole route.
              </p>
            ) : null}
          </section>
            </div>,
            document.body
          )
        : null}

      {replacementSheetOrder !== null && typeof document !== "undefined"
        ? createPortal(
            <div
              className={styles.addStopSheetBackdrop}
              onMouseDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  applyingReplacementKey === null
                ) {
                  setReplacementSheetOrder(null);
                  setReplacementOptions([]);
                }
              }}
            >
              <section
                className={`${styles.addStopSheet} ${styles.replacementSheet}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="replacement-sheet-title"
              >
                <span
                  className={styles.addStopSheetHandle}
                  aria-hidden="true"
                />

                <button
                  type="button"
                  className={styles.addStopSheetClose}
                  aria-label="Close replacement options"
                  disabled={applyingReplacementKey !== null}
                  onClick={() => {
                    setReplacementSheetOrder(null);
                    setReplacementOptions([]);
                  }}
                >
                  ×
                </button>

                <header className={styles.addStopSheetHeader}>
                  <span>SWAP THIS STOP</span>
                  <h2 id="replacement-sheet-title">
                    Choose a better fit
                  </h2>
                  <p>
                    Each option keeps the same route position and has been checked against timing, budget, and travel.
                  </p>
                </header>

                {loadingReplacementOptions ? (
                  <div
                    className={styles.addStopSheetLoading}
                    aria-live="polite"
                  >
                    {[0, 1, 2].map((item) => (
                      <span key={item} />
                    ))}
                    <p>Finding verified alternatives...</p>
                  </div>
                ) : (
                  <div className={styles.addStopOptionList}>
                    {replacementOptions.map((option, optionIndex) => (
                      <button
                        type="button"
                        className={`${styles.addStopOptionCard} ${styles.replacementOptionCard}`}
                        key={option.key}
                        disabled={applyingReplacementKey !== null}
                        style={{
                          animationDelay: `${optionIndex * 70}ms`
                        }}
                        onClick={() => applyReplacementOption(option)}
                      >
                        <span className={styles.addStopOptionNumber}>
                          {optionIndex + 1}
                        </span>

                        <span className={styles.addStopOptionMain}>
                          <small>
                            {option.category} · {option.neighbourhood}
                          </small>
                          <strong>{option.name}</strong>
                          <em>{option.subtitle}</em>

                          <span className={styles.addStopOptionFacts}>
                            <i>
                              {option.startTime}–{option.endTime}
                            </i>
                            <i>
                              {option.travelMinutes === null
                                ? "First stop"
                                : `${option.travelMinutes} min from previous`}
                            </i>
                          </span>

                          <span className={styles.addStopOptionFit}>
                            Keeps this part of the outing in the same time window.
                          </span>
                        </span>

                        <span className={styles.addStopOptionPrice}>
                          <small>EST.</small>
                          <strong>
                            {formatCost(option.estimatedCostCad)}
                          </strong>
                          <i aria-hidden="true">
                            {applyingReplacementKey === option.key ? "…" : "→"}
                          </i>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {!loadingReplacementOptions && replacementOptions.length > 0 ? (
                  <p className={styles.addStopSheetNote}>
                    Pick one option. Venture will update the map, timing, saved outing, and share data.
                  </p>
                ) : null}
              </section>
            </div>,
            document.body
          )
        : null}

    </main>
  );
}
