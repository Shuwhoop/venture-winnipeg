"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";

import {
  PlanningModeIllustration
} from "@/components/planning-mode-illustration";

import NeighbourhoodPicker from "@/components/neighbourhood-picker";

import { OutingResultTransition } from "@/components/outing-result-transition";

import styles from "./build-outing-experience.module.css";

import {
  defaultPreferences,
  loadPreferences,
  type BudgetPreference,
  type VenturePreferences
} from "@/lib/profile-preferences";

import {
  getVisitedEventOccurrenceKeys,
  getVisitedListingKeys
} from "@/lib/visit-history";

const OUTING_DRAFT_KEY =
  "venture:outing-draft:v1";

const TOTAL_STEPS = 9;
const BUILDER_SESSION_KEY = "venture:builder-session:v1";

const STEP_VISUALS = [
  {
    icon: "👤",
    label: "Choose your crew",
    accent: "#dc2f3b",
    soft: "#ffd9dc"
  },
  {
    icon: "🧩",
    label: "Pick a build style",
    accent: "#dc2f3b",
    soft: "#eee3ff"
  },
  {
    icon: "🗓️",
    label: "Set the time",
    accent: "#dc7a00",
    soft: "#fff0c4"
  },
  {
    icon: "🗺️",
    label: "Shape the route",
    accent: "#0f7b67",
    soft: "#ddf7ef"
  },
  {
    icon: "🎭",
    label: "Choose the mood",
    accent: "#b62572",
    soft: "#ffe1f0"
  },
  {
    icon: "✨",
    label: "Add your interests",
    accent: "#1f65a8",
    soft: "#dff1ff"
  },
  {
    icon: "💸",
    label: "Set the budget",
    accent: "#9a5b00",
    soft: "#fff0bc"
  },
  {
    icon: "🚌",
    label: "Pick the area",
    accent: "#39791d",
    soft: "#e8f7dc"
  },
  {
    icon: "🚀",
    label: "Review and launch",
    accent: "#dc2f3b",
    soft: "#fff0b9"
  }
] as const;

type PlanningMode =
  | "solo"
  | "group";

type BuildMethod =
  | "surprise"
  | "mix"
  | "anchor";

type StopKind =
  | "food"
  | "event"
  | "drinks";

type DiscoveryPreference =
  | "best"
  | "new-only"
  | "mix";

type StopMix = {
  food: number;
  events: number;
  drinks: number;
};

type SoloVibe =
  | "slow-reset"
  | "curious-explorer"
  | "treat-myself"
  | "social-solo";

type SoloPace =
  | "relaxed"
  | "balanced"
  | "packed";

type GroupVibe =
  | "friends-night"
  | "date-night"
  | "celebration"
  | "family-plan"
  | "nightlife";

type GroupPriority =
  | "everyone-happy"
  | "budget-friendly"
  | "minimal-travel";

type AnchorOption = {
  key: string;
  id: string;
  slug: string;
  type:
    | "event"
    | "restaurant";
  kind: StopKind;
  name: string;
  category: string;
  subtitle: string;
  neighbourhood: string;
  timeOrHours: string;
  price: string;
  startAt?: string;
};

type OutingDraft = {
  planningMode: PlanningMode;
  buildMethod: BuildMethod;
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
  partySize: number;
  maxTravelMinutes: number;
  mustIncludeTerms: string[];
  avoidTerms: string[];
  discoveryPreference: DiscoveryPreference;
  visitedListingKeys: string[];
  visitedEventOccurrenceKeys: string[];
  stopMix: StopMix;
  totalStops: number;
  allowedKinds: StopKind[];
  anchorListingKey: string | null;
  anchorListingName: string | null;
  soloVibe: SoloVibe | null;
  soloPace: SoloPace | null;
  groupVibe: GroupVibe | null;
  groupPriority:
    | GroupPriority
    | null;
  createdAt: string;
};

const buildMethods = [
  {
    id:
      "surprise" as const,
    icon: "✨",
    title: "Surprise me",
    description:
      "Choose the number of stops and let Venture create a balanced route."
  },
  {
    id:
      "mix" as const,
    icon: "🧩",
    title: "Choose my mix",
    description:
      "Pick exactly how many food, event, and drinks stops you want."
  },
  {
    id:
      "anchor" as const,
    icon: "📍",
    title: "Start with a place",
    description:
      "Choose an existing restaurant, event, or drinks spot and build around it."
  }
];

const soloVibes = [
  {
    id:
      "slow-reset" as const,
    icon: "☕",
    title: "Slow reset",
    description:
      "Quiet, comfortable, and easy to enjoy alone.",
    outingTypeId:
      "solo-outing",
    outingTypeTitle:
      "Solo Reset"
  },
  {
    id:
      "curious-explorer" as const,
    icon: "🧭",
    title: "Curious explorer",
    description:
      "Try something new and see a different side of Winnipeg.",
    outingTypeId:
      "solo-outing",
    outingTypeTitle:
      "Curious Solo Adventure"
  },
  {
    id:
      "treat-myself" as const,
    icon: "🍰",
    title: "Treat myself",
    description:
      "Good food, a memorable activity, and a little indulgence.",
    outingTypeId:
      "date-night",
    outingTypeTitle:
      "Treat Myself Outing"
  },
  {
    id:
      "social-solo" as const,
    icon: "🎶",
    title: "Social solo",
    description:
      "Be around music, comedy, markets, or lively public spaces.",
    outingTypeId:
      "nightlife",
    outingTypeTitle:
      "Social Solo Adventure"
  }
];

const soloPaces = [
  {
    id:
      "relaxed" as const,
    title: "Relaxed",
    description:
      "More time at fewer places"
  },
  {
    id:
      "balanced" as const,
    title: "Balanced",
    description:
      "A comfortable city rhythm"
  },
  {
    id:
      "packed" as const,
    title: "Packed",
    description:
      "Fit more into the window"
  }
];

const groupVibes = [
  {
    id:
      "friends-night" as const,
    icon: "🎉",
    title: "Friends night",
    description:
      "Food, activities, laughs, and easy group energy.",
    outingTypeId:
      "friends-night",
    outingTypeTitle:
      "Friends Night"
  },
  {
    id:
      "date-night" as const,
    icon: "💘",
    title: "Date night",
    description:
      "A thoughtful route for two people.",
    outingTypeId:
      "date-night",
    outingTypeTitle:
      "Date Night"
  },
  {
    id:
      "celebration" as const,
    icon: "🥂",
    title: "Celebration",
    description:
      "Birthday, milestone, or a night worth making louder.",
    outingTypeId:
      "friends-night",
    outingTypeTitle:
      "Celebration Night"
  },
  {
    id:
      "family-plan" as const,
    icon: "👨‍👩‍👧‍👦",
    title: "Family plan",
    description:
      "Welcoming stops with practical timing.",
    outingTypeId:
      "family-plan",
    outingTypeTitle:
      "Family Outing"
  },
  {
    id:
      "nightlife" as const,
    icon: "🌃",
    title: "Nightlife",
    description:
      "Music, drinks, entertainment, and late-night energy.",
    outingTypeId:
      "nightlife",
    outingTypeTitle:
      "Nightlife Outing"
  }
];

const groupPriorities = [
  {
    id:
      "everyone-happy" as const,
    title: "Easy consensus",
    description:
      "Use broadly appealing, well-rated choices"
  },
  {
    id:
      "budget-friendly" as const,
    title: "Budget friendly",
    description:
      "Protect the per-person total"
  },
  {
    id:
      "minimal-travel" as const,
    title: "Keep it close",
    description:
      "Prefer less travel between stops"
  }
];

const standardInterestOptions = [
  "Food",
  "Live music",
  "Date nights",
  "Comedy",
  "Sports",
  "Markets",
  "Arts",
  "Gaming",
  "Nightlife",
  "Outdoor activities"
];

const discoveryPreferenceOptions: {
  id: DiscoveryPreference;
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    id: "best",
    icon: "★",
    title: "Best matches",
    description:
      "Use every strong option, including places you already know."
  },
  {
    id: "new-only",
    icon: "✨",
    title: "Only somewhere new",
    description:
      "Exclude restaurants and event occurrences already in My Venture."
  },
  {
    id: "mix",
    icon: "↔",
    title: "Familiar + new",
    description:
      "Prefer a new discovery while keeping room for one reliable favourite."
  }
];

const durationOptions = [
  "2 hours",
  "3 hours",
  "4 hours",
  "5+ hours"
];

const transportationOptions = [
  {
    value: "Walking",
    icon: "🚶",
    description:
      "Keep every stop close"
  },
  {
    value: "Transit",
    icon: "🚌",
    description:
      "Use Winnipeg Transit"
  },
  {
    value: "Driving",
    icon: "🚗",
    description:
      "Cover more of the city"
  },
  {
    value: "Rideshare",
    icon: "🚕",
    description:
      "Flexible door-to-door travel"
  }
];

const maxTravelOptions = [
  {
    value: 10,
    label: "10 min",
    description:
      "Very close stops"
  },
  {
    value: 20,
    label: "20 min",
    description:
      "Comfortable city hops"
  },
  {
    value: 35,
    label: "35 min",
    description:
      "More Winnipeg choices"
  },
  {
    value: 60,
    label: "60 min",
    description:
      "Distance is flexible"
  }
];

const budgetOptions: {
  value: BudgetPreference;
  label: string;
  amount: string;
  icon: string;
  description: string;
  helper: string;
}[] = [
  {
    value: "free",
    label: "Free",
    amount: "$0",
    icon: "🌱",
    description:
      "No admission cost",
    helper:
      "Big plans, no spend."
  },
  {
    value: "under-40",
    label: "Under $40",
    amount: "$40",
    icon: "🎟️",
    description:
      "Affordable per person",
    helper:
      "A flexible everyday outing."
  },
  {
    value: "under-80",
    label: "Under $80",
    amount: "$80",
    icon: "🍽️",
    description:
      "More food and ticket choices",
    helper:
      "Room for a fuller experience."
  },
  {
    value: "flexible",
    label: "Flexible",
    amount: "∞",
    icon: "✨",
    description:
      "Prioritize the experience",
    helper:
      "Venture can use the best fit."
  }
];

const stopKindDetails: Record<
  StopKind,
  {
    label: string;
    shortLabel: string;
    icon: string;
    description: string;
  }
> = {
  food: {
    label:
      "Food places",
    shortLabel:
      "food",
    icon: "🍽",
    description:
      "Restaurants, cafés, bakeries, and food halls"
  },
  event: {
    label: "Events",
    shortLabel:
      "events",
    icon: "🎟",
    description:
      "Shows, sports, markets, festivals, and activities"
  },
  drinks: {
    label:
      "Drinks places",
    shortLabel:
      "drinks",
    icon: "🍸",
    description:
      "Bars, breweries, cocktail spots, and nightlife"
  }
};

function getInterestIcon(interest: string): string {
  const normalized = interest.trim().toLowerCase();

  const icons: Record<string, string> = {
    food: "🍜",
    "live music": "🎵",
    "date nights": "💘",
    comedy: "🎤",
    sports: "🏀",
    markets: "🛍️",
    arts: "🎨",
    gaming: "🎮",
    nightlife: "🌙",
    "outdoor activities": "🌿"
  };

  return icons[normalized] ?? "✨";
}

function getTodayInputValue(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Winnipeg", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

function isFutureOuting(date: string, time: string): boolean {
  const now = new Date();
  const today = getTodayInputValue();
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Winnipeg", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).format(now);
  return date > today || (date === today && time > localTime);
}

function toggleValue(
  currentValues: string[],
  value: string
): string[] {
  return currentValues.includes(value)
    ? currentValues.filter(
        (currentValue) =>
          currentValue !== value
      )
    : [
        ...currentValues,
        value
      ];
}

function parsePreferenceTerms(
  value: string
): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map(
          (term) =>
            term.trim()
        )
        .filter(Boolean)
    )
  ).slice(0, 8);
}

function getBudgetLabel(
  budget: BudgetPreference
): string {
  return (
    budgetOptions.find(
      (option) =>
        option.value === budget
    )?.label ?? "Flexible"
  );
}

function getMixTotal(
  mix: StopMix
): number {
  return (
    mix.food +
    mix.events +
    mix.drinks
  );
}

function formatMix(
  mix: StopMix
): string {
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
    : "No extra stops";
}

function formatAnchorTime(
  option: AnchorOption
): string {
  if (!option.startAt) {
    return option.timeOrHours;
  }

  const date =
    new Date(
      option.startAt
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return option.timeOrHours;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      hour: "numeric",
      minute: "2-digit",
      timeZone:
        "America/Winnipeg"
    }
  ).format(date);
}

function textRequestsSomewhereNew(
  ...values: string[]
) {
  const text = values
    .join(" ")
    .toLowerCase()
    .replaceAll("’", "'");

  return [
    "new to me",
    "somewhere new",
    "somewhere i haven't gone",
    "somewhere i havent gone",
    "place i haven't been",
    "place i havent been",
    "never been",
    "not been before"
  ].some((phrase) => text.includes(phrase));
}

function getStepContent(
  currentStep: number,
  planningMode:
    | PlanningMode
    | null,
  buildMethod:
    | BuildMethod
    | null
): {
  eyebrow: string;
  title: string;
  description: string;
} {
  const steps = [
    {
      eyebrow:
        "PLANNING MODE",
      title:
        "Who is this outing for?",
      description:
        "Venture will ask different follow-up questions for solo and group plans."
    },
    {
      eyebrow:
        "BUILD STYLE",
      title:
        "How should Venture build it?",
      description:
        "Choose a surprise route, an exact mix of stops, or a plan around somewhere you already want to go."
    },
    {
      eyebrow: "WHEN",
      title:
        "When are you heading out?",
      description:
        "Venture checks event times and business hours against this window."
    },
    {
      eyebrow:
        buildMethod ===
        "anchor"
          ? "STARTING POINT"
          : "ROUTE SHAPE",
      title:
        buildMethod ===
        "anchor"
          ? "Where does the outing begin?"
          : buildMethod ===
              "mix"
            ? "Choose your exact stop mix"
            : "How many stops should Venture surprise you with?",
      description:
        buildMethod ===
        "anchor"
          ? "Pick a published Venture listing, then choose what should be added around it."
          : "Food, events, and drinks are selected only from published Venture data."
    },
    {
      eyebrow:
        planningMode ===
        "group"
          ? "GROUP DETAILS"
          : "SOLO DETAILS",
      title:
        planningMode ===
        "group"
          ? "What kind of group night is this?"
          : "What kind of solo time do you want?",
      description:
        planningMode ===
        "group"
          ? "Set the group size, occasion, and what matters most to everyone."
          : "Choose a mood and pace that feels comfortable on your own."
    },
    {
      eyebrow: "INTERESTS",
      title:
        "What sounds good?",
      description:
        "Use broad interests plus specific must-have and avoid terms."
    },
    {
      eyebrow: "BUDGET",
      title:
        "What should the outing cost?",
      description:
        "Budget is estimated per person. Group totals are shown afterward."
    },
    {
      eyebrow:
        "AREA AND TRAVEL",
      title:
        "Where should Venture search?",
      description:
        "Choose neighbourhoods, travel mode, and the longest comfortable leg."
    },
    {
      eyebrow: "REVIEW",
      title:
        "Ready to create the outing?",
      description:
        "Review the recipe before Venture connects the route."
    }
  ];

  return steps[currentStep];
}

function CountStepper({
  kind,
  value,
  onChange,
  disabled = false
}: {
  kind: StopKind;
  value: number;
  onChange:
    (nextValue: number) =>
      void;
  disabled?: boolean;
}) {
  const details =
    stopKindDetails[kind];

  return (
    <article
      className={`outing-count-card outing-count-${kind}`}
    >
      <div
        className="outing-count-icon"
        aria-hidden="true"
      >
        {details.icon}
      </div>

      <div>
        <strong>
          {details.label}
        </strong>

        <small>
          {details.description}
        </small>
      </div>

      <div
        className="outing-count-stepper"
      >
        <button
          type="button"
          aria-label={`Remove one ${details.shortLabel} stop`}
          disabled={
            disabled ||
            value <= 0
          }
          onClick={() =>
            onChange(
              Math.max(
                0,
                value - 1
              )
            )
          }
        >
          −
        </button>

        <output>
          {value}
        </output>

        <button
          type="button"
          aria-label={`Add one ${details.shortLabel} stop`}
          disabled={disabled}
          onClick={() =>
            onChange(
              value + 1
            )
          }
        >
          +
        </button>
      </div>
    </article>
  );
}

export default function BuildOutingPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstStepRender = useRef(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [flowMessage, setFlowMessage] = useState("");
  const [launchError, setLaunchError] = useState("");
  const [reviewReturn, setReviewReturn] = useState(false);
  const [
    currentStep,
    setCurrentStep
  ] = useState(0);

  const [
    isLaunchingResults,
    setIsLaunchingResults
  ] = useState(false);

  const [
    planningMode,
    setPlanningMode
  ] =
    useState<PlanningMode | null>(
      null
    );

  const [
    buildMethod,
    setBuildMethod
  ] =
    useState<BuildMethod | null>(
      null
    );

  const [
    profilePreferences,
    setProfilePreferences
  ] =
    useState<VenturePreferences>(
      defaultPreferences
    );

  const [
    selectedInterests,
    setSelectedInterests
  ] = useState<string[]>(
    defaultPreferences.interests
  );

  const [
    selectedNeighbourhoods,
    setSelectedNeighbourhoods
  ] = useState<string[]>(
    defaultPreferences.neighbourhoods
  );

  const [
    budget,
    setBudget
  ] = useState<BudgetPreference>(
    defaultPreferences.budget
  );

  const [
    alcoholFree,
    setAlcoholFree
  ] = useState(
    defaultPreferences.alcoholFree
  );

  const [
    outingDate,
    setOutingDate
  ] = useState("");

  const [
    startTime,
    setStartTime
  ] = useState("18:00");

  const [
    duration,
    setDuration
  ] = useState("3 hours");

  const [
    transportation,
    setTransportation
  ] = useState("Transit");

  const [
    partySize,
    setPartySize
  ] = useState(2);

  const [
    maxTravelMinutes,
    setMaxTravelMinutes
  ] = useState(20);

  const [
    mustIncludeText,
    setMustIncludeText
  ] = useState("");

  const [
    avoidText,
    setAvoidText
  ] = useState("");

  const [
    discoveryPreference,
    setDiscoveryPreference
  ] = useState<DiscoveryPreference>("best");

  const [
    stopMix,
    setStopMix
  ] = useState<StopMix>({
    food: 1,
    events: 1,
    drinks: 1
  });

  const [
    totalStops,
    setTotalStops
  ] = useState(3);

  const [
    allowedKinds,
    setAllowedKinds
  ] = useState<StopKind[]>([
    "food",
    "event",
    "drinks"
  ]);

  const [
    soloVibe,
    setSoloVibe
  ] =
    useState<SoloVibe | null>(
      null
    );

  const [
    soloPace,
    setSoloPace
  ] =
    useState<SoloPace | null>(
      "balanced"
    );

  const [
    groupVibe,
    setGroupVibe
  ] =
    useState<GroupVibe | null>(
      null
    );

  const [
    groupPriority,
    setGroupPriority
  ] =
    useState<GroupPriority | null>(
      "everyone-happy"
    );

  const [
    anchorOptions,
    setAnchorOptions
  ] = useState<AnchorOption[]>(
    []
  );

  const [
    anchorListingKey,
    setAnchorListingKey
  ] = useState<string | null>(
    null
  );

  const [
    anchorLoading,
    setAnchorLoading
  ] = useState(false);

  const [
    anchorError,
    setAnchorError
  ] = useState("");

  const [
    anchorQuery,
    setAnchorQuery
  ] = useState("");

  const [
    anchorKindFilter,
    setAnchorKindFilter
  ] = useState<
    StopKind | "all"
  >("all");

  useEffect(() => {
    const loadedPreferences =
      loadPreferences();

    setProfilePreferences(
      loadedPreferences
    );

    setSelectedInterests(
      loadedPreferences.interests
    );

    setSelectedNeighbourhoods(
      loadedPreferences.neighbourhoods
    );

    setBudget(
      loadedPreferences.budget
    );

    setAlcoholFree(
      loadedPreferences.alcoholFree
    );

    setOutingDate(
      getTodayInputValue()
    );

    const requestedAnchor =
      new URLSearchParams(
        window.location.search
      ).get("anchor");

    if (requestedAnchor) {
      setBuildMethod("anchor");
      setAnchorListingKey(
        requestedAnchor
      );
    }

    if (!requestedAnchor) {
      try {
        const raw = window.sessionStorage.getItem(BUILDER_SESSION_KEY);
        const draft = raw ? JSON.parse(raw) as Record<string, unknown> : null;
        const strings = (value: unknown): value is string[] =>
          Array.isArray(value) && value.length <= 50 && value.every(item => typeof item === "string" && item.length <= 200);
        if (draft && typeof draft === "object" && draft.date === getTodayInputValue()) {
          if (draft.planningMode === "solo" || draft.planningMode === "group") setPlanningMode(draft.planningMode);
          if (draft.buildMethod === "surprise" || draft.buildMethod === "mix" || draft.buildMethod === "anchor") setBuildMethod(draft.buildMethod);
          if (typeof draft.currentStep === "number" && Number.isInteger(draft.currentStep) && draft.currentStep >= 0 && draft.currentStep < TOTAL_STEPS) setCurrentStep(draft.currentStep);
          if (typeof draft.reviewReturn === "boolean") setReviewReturn(draft.reviewReturn);
          if (strings(draft.interests)) setSelectedInterests(draft.interests);
          if (strings(draft.neighbourhoods)) setSelectedNeighbourhoods(draft.neighbourhoods);
          if (typeof draft.outingDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(draft.outingDate)) setOutingDate(draft.outingDate);
          if (typeof draft.startTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime)) setStartTime(draft.startTime);
          if (typeof draft.duration === "string" && durationOptions.includes(draft.duration)) setDuration(draft.duration);
          if (["free", "under-40", "under-80", "flexible"].includes(String(draft.budget))) setBudget(draft.budget as BudgetPreference);
          if (typeof draft.alcoholFree === "boolean") setAlcoholFree(draft.alcoholFree);
          if (typeof draft.transportation === "string" && ["Walking", "Transit", "Driving", "Rideshare"].includes(draft.transportation)) setTransportation(draft.transportation);
          if (typeof draft.partySize === "number" && Number.isInteger(draft.partySize) && draft.partySize >= 2 && draft.partySize <= 20) setPartySize(draft.partySize);
          if (typeof draft.maxTravelMinutes === "number" && [10,20,35,60].includes(draft.maxTravelMinutes)) setMaxTravelMinutes(draft.maxTravelMinutes);
          if (typeof draft.totalStops === "number" && Number.isInteger(draft.totalStops) && draft.totalStops >= 1 && draft.totalStops <= 5) setTotalStops(draft.totalStops);
          if (strings(draft.allowedKinds) && draft.allowedKinds.every(kind => ["food","event","drinks"].includes(kind))) setAllowedKinds(draft.allowedKinds as StopKind[]);
          if (draft.stopMix && typeof draft.stopMix === "object") {
            const mix = draft.stopMix as StopMix;
            if ([mix.food, mix.events, mix.drinks].every(n => Number.isInteger(n) && n >= 0) && getMixTotal(mix) <= 5) setStopMix(mix);
          }
          if (typeof draft.soloVibe === "string" && soloVibes.some(option => option.id === draft.soloVibe)) setSoloVibe(draft.soloVibe as SoloVibe);
          if (typeof draft.soloPace === "string" && ["relaxed","balanced","packed"].includes(draft.soloPace)) setSoloPace(draft.soloPace as SoloPace);
          if (typeof draft.groupVibe === "string" && groupVibes.some(option => option.id === draft.groupVibe)) setGroupVibe(draft.groupVibe as GroupVibe);
          if (typeof draft.groupPriority === "string" && groupPriorities.some(option => option.id === draft.groupPriority)) setGroupPriority(draft.groupPriority as GroupPriority);
          if (typeof draft.mustIncludeText === "string") setMustIncludeText(draft.mustIncludeText.slice(0,500));
          if (typeof draft.avoidText === "string") setAvoidText(draft.avoidText.slice(0,500));
          if (["best","new-only","mix"].includes(String(draft.discoveryPreference))) setDiscoveryPreference(draft.discoveryPreference as DiscoveryPreference);
          if (typeof draft.anchorListingKey === "string") setAnchorListingKey(draft.anchorListingKey);
          if (draft.planningMode === "solo" || draft.planningMode === "group") {
            setFlowMessage("Welcome back. Your plan is right where you left it.");
          }
        }
      } catch { /* A damaged or unavailable session must not block planning. */ }
    }
    setSessionReady(true);
  }, []);

  useEffect(() => {
    if (
      buildMethod !==
        "anchor" ||
      !outingDate
    ) {
      return;
    }

    const controller =
      new AbortController();

    async function loadOptions() {
      setAnchorLoading(true);
      setAnchorError("");

      try {
        const parameters =
          new URLSearchParams({
            date:
              outingDate,
            limit: "120"
          });

        const response =
          await fetch(
            `/api/outings/options?${parameters.toString()}`,
            {
              cache:
                "no-store",
              signal:
                controller.signal
            }
          );

        const result =
          (await response.json()) as {
            options?:
              AnchorOption[];
            error?: string;
          };

        if (
          !response.ok ||
          !result.options
        ) {
          throw new Error(
            result.error ||
              "Venture could not load published listings."
          );
        }

        setAnchorOptions(
          result.options
        );

        const queryAnchor =
          new URLSearchParams(
            window.location.search
          ).get("anchor");

        if (
          queryAnchor &&
          result.options.some(
            (option) =>
              option.key ===
              queryAnchor
          )
        ) {
          setAnchorListingKey(
            queryAnchor
          );
        }
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        setAnchorError(
          error instanceof Error
            ? error.message
            : "Venture could not load published listings."
        );
      } finally {
        setAnchorLoading(false);
      }
    }

    void loadOptions();

    return () => {
      controller.abort();
    };
  }, [
    buildMethod,
    outingDate
  ]);

  useEffect(() => {
    if (!alcoholFree) {
      return;
    }

    setStopMix(
      (current) => ({
        ...current,
        drinks: 0
      })
    );

    setAllowedKinds(
      (current) =>
        current.filter(
          (kind) =>
            kind !== "drinks"
        )
    );
  }, [alcoholFree]);

  useEffect(() => {
    if (
      groupPriority ===
      "minimal-travel"
    ) {
      setMaxTravelMinutes(
        (current) =>
          Math.min(
            current,
            10
          )
      );
    }

    if (
      groupPriority ===
      "budget-friendly" &&
      budget === "flexible"
    ) {
      setBudget("under-40");
    }
  }, [
    budget,
    groupPriority
  ]);

  const availableInterests =
    useMemo(
      () =>
        Array.from(
          new Set([
            ...standardInterestOptions,
            ...profilePreferences.interests
          ])
        ),
      [
        profilePreferences.interests
      ]
    );

  const mustIncludeTerms =
    useMemo(
      () =>
        parsePreferenceTerms(
          mustIncludeText
        ),
      [mustIncludeText]
    );

  const avoidTerms =
    useMemo(
      () =>
        parsePreferenceTerms(
          avoidText
        ),
      [avoidText]
    );

  const effectiveDiscoveryPreference =
    useMemo(
      () =>
        textRequestsSomewhereNew(
          mustIncludeText,
          avoidText
        )
          ? "new-only" as const
          : discoveryPreference,
      [
        avoidText,
        discoveryPreference,
        mustIncludeText
      ]
    );

  const selectedAnchor =
    useMemo(
      () =>
        anchorOptions.find(
          (option) =>
            option.key ===
            anchorListingKey
        ) ?? null,
      [
        anchorListingKey,
        anchorOptions
      ]
    );

  const filteredAnchorOptions =
    useMemo(
      () => {
        const query =
          anchorQuery
            .trim()
            .toLowerCase();

        return anchorOptions
          .filter(
            (option) =>
              anchorKindFilter ===
                "all" ||
              option.kind ===
                anchorKindFilter
          )
          .filter(
            (option) =>
              !query ||
              [
                option.name,
                option.category,
                option.subtitle,
                option.neighbourhood
              ]
                .join(" ")
                .toLowerCase()
                .includes(query)
          )
          .slice(0, 30);
      },
      [
        anchorKindFilter,
        anchorOptions,
        anchorQuery
      ]
    );

  const selectedSoloExperience =
    useMemo(
      () =>
        soloVibes.find(
          (option) =>
            option.id ===
            soloVibe
        ) ?? null,
      [soloVibe]
    );


  useEffect(() => {
    if (!sessionReady) return;
    try {
      window.sessionStorage.setItem(BUILDER_SESSION_KEY, JSON.stringify({
        date: getTodayInputValue(), currentStep, planningMode, buildMethod, reviewReturn,
        interests: selectedInterests, neighbourhoods: selectedNeighbourhoods,
        budget, alcoholFree, outingDate, startTime, duration, transportation,
        partySize, maxTravelMinutes, mustIncludeText, avoidText, discoveryPreference,
        stopMix, totalStops, allowedKinds, soloVibe, soloPace, groupVibe,
        groupPriority, anchorListingKey
      }));
    } catch { /* Planning remains available when browser storage is restricted. */ }
  }, [sessionReady, currentStep, planningMode, buildMethod, reviewReturn, selectedInterests,
    selectedNeighbourhoods, budget, alcoholFree, outingDate, startTime, duration,
    transportation, partySize, maxTravelMinutes, mustIncludeText, avoidText,
    discoveryPreference, stopMix, totalStops, allowedKinds, soloVibe, soloPace,
    groupVibe, groupPriority, anchorListingKey]);

  useEffect(() => {
    if (firstStepRender.current) { firstStepRender.current = false; return; }
    headingRef.current?.focus({ preventScroll: true });
  }, [currentStep]);

  function editReviewStep(step: number) {
    setReviewReturn(step !== 0 && step !== 1);
    setCurrentStep(step);
    setLaunchError("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  const selectedGroupExperience =
    useMemo(
      () =>
        groupVibes.find(
          (option) =>
            option.id ===
            groupVibe
        ) ?? null,
      [groupVibe]
    );

  const selectedExperience =
    planningMode === "solo"
      ? selectedSoloExperience
      : selectedGroupExperience;

  const content =
    getStepContent(
      currentStep,
      planningMode,
      buildMethod
    );

  const stepVisual =
    STEP_VISUALS[currentStep];

  const progress =
    ((currentStep + 1) /
      TOTAL_STEPS) *
    100;

  const additionalStopLimit =
    buildMethod === "anchor"
      ? 4
      : 5;

  const canContinue =
    currentStep === 0
      ? planningMode !== null
      : currentStep === 1
        ? buildMethod !== null
        : currentStep === 2
          ? Boolean(
              isFutureOuting(outingDate, startTime) &&
              startTime &&
              duration
            )
          : currentStep === 3
            ? buildMethod ===
              "mix"
              ? getMixTotal(
                  stopMix
                ) > 0
              : buildMethod ===
                  "anchor"
                ? selectedAnchor !==
                  null
                : totalStops > 0 &&
                  allowedKinds.length >
                    0
            : currentStep === 4
              ? planningMode ===
                "solo"
                ? Boolean(
                    soloVibe &&
                    soloPace
                  )
                : Boolean(
                    groupVibe &&
                    groupPriority &&
                    partySize >= 2
                  )
              : true;

  function updateMix(
    key: keyof StopMix,
    nextValue: number
  ) {
    setStopMix(
      (current) => {
        const currentTotal =
          getMixTotal(current);

        const difference =
          nextValue -
          current[key];

        if (
          difference > 0 &&
          currentTotal >=
            additionalStopLimit
        ) {
          return current;
        }

        const availableIncrease =
          Math.max(
            0,
            additionalStopLimit -
              currentTotal
          );

        const safeValue =
          difference > 0
            ? current[key] +
              Math.min(
                difference,
                availableIncrease
              )
            : Math.max(
                0,
                nextValue
              );

        return {
          ...current,
          [key]:
            safeValue
        };
      }
    );
  }

  function toggleAllowedKind(
    kind: StopKind
  ) {
    if (
      kind === "drinks" &&
      alcoholFree
    ) {
      return;
    }

    setAllowedKinds(
      (current) =>
        current.includes(kind)
          ? current.filter(
              (currentKind) =>
                currentKind !== kind
            )
          : [
              ...current,
              kind
            ]
    );
  }

  function goForward() {
    setLaunchError("");
    setFlowMessage("");
    if (!canContinue) {
      return;
    }

    if (
      currentStep ===
      TOTAL_STEPS - 1
    ) {
      handlePrepareOuting();
      return;
    }

    if (reviewReturn) {
      setCurrentStep(TOTAL_STEPS - 1);
      setReviewReturn(false);
    } else {
      setCurrentStep(current => current + 1);
    }

    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
    });
  }

  function goBack() {
    if (currentStep === 0) {
      return;
    }

    setCurrentStep(
      (current) =>
        current - 1
    );

    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
    });
  }

  function resetInterests() {
    setSelectedInterests(
      profilePreferences.interests
    );
  }

  function handlePrepareOuting() {
    if (!isFutureOuting(outingDate, startTime)) {
      setLaunchError("Choose a start time that is still ahead of you. Times are in Winnipeg.");
      setCurrentStep(2);
      setReviewReturn(true);
      return;
    }
    if (
      !planningMode ||
      !buildMethod ||
      !selectedExperience ||
      !outingDate ||
      !startTime
    ) {
      return;
    }

    const draft: OutingDraft = {
      planningMode,
      buildMethod,

      outingTypeId:
        selectedExperience.outingTypeId,

      outingTypeTitle:
        selectedExperience.outingTypeTitle,

      date:
        outingDate,
      startTime,
      duration,

      interests:
        Array.from(
          new Set([
            ...selectedInterests,
            ...mustIncludeTerms
          ])
        ),

      neighbourhoods:
        selectedNeighbourhoods,

      budget,
      transportation,
      alcoholFree,

      partySize:
        planningMode === "solo"
          ? 1
          : partySize,

      maxTravelMinutes,
      mustIncludeTerms,
      avoidTerms,
      discoveryPreference:
        effectiveDiscoveryPreference,
      visitedListingKeys:
        getVisitedListingKeys(),
      visitedEventOccurrenceKeys:
        getVisitedEventOccurrenceKeys(),
      stopMix,
      totalStops,
      allowedKinds,

      anchorListingKey:
        selectedAnchor?.key ??
        null,

      anchorListingName:
        selectedAnchor?.name ??
        null,

      soloVibe:
        planningMode === "solo"
          ? soloVibe
          : null,

      soloPace:
        planningMode === "solo"
          ? soloPace
          : null,

      groupVibe:
        planningMode === "group"
          ? groupVibe
          : null,

      groupPriority:
        planningMode === "group"
          ? groupPriority
          : null,

      createdAt:
        new Date().toISOString()
    };

    try {
      window.localStorage.setItem(OUTING_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      setLaunchError("Your browser could not save this plan. Allow site storage, then try again. Your choices are still here.");
      return;
    }

    setIsLaunchingResults(true);

    const prefersReducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    window.setTimeout(
      () => {
        window.location.assign(
          "/build-outing/results"
        );
      },
      prefersReducedMotion
        ? 220
        : 350
    );
  }

  return (
    <main
      className={`outing-wizard outing-wizard-v3 ${styles.wizardV4}`}
      data-step={currentStep}
      style={{
        "--outing-accent": stepVisual.accent,
        "--outing-soft": stepVisual.soft
      } as CSSProperties}
    >
      {flowMessage ? <p className="outing-flow-message" role="status">{flowMessage}</p> : null}
      <div className="outing-wizard-progress" role="progressbar" aria-label="Outing builder progress"
        aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={currentStep + 1}
        aria-valuetext={"Step " + (currentStep + 1) + " of " + TOTAL_STEPS + ": " + content.title}>
        <div>
          <span>
            STEP {currentStep + 1} OF{" "}
            {TOTAL_STEPS}
          </span>

          <strong>
            {Math.round(progress)}%
          </strong>
        </div>

        <div className="outing-wizard-progress-track">
          <span
            style={{
              width: `${progress}%`
            }}
          />
        </div>
      </div>

      <details className="outing-restart">
        <summary>Start a new plan</summary>
        <p>This clears the current setup in this tab. Saved outings stay in My saves.</p>
        <button type="button" onClick={() => {
          try { window.sessionStorage.removeItem(BUILDER_SESSION_KEY); }
          catch { setLaunchError("This browser could not reset the plan. Try reloading the page."); return; }
          window.location.assign("/build-outing");
        }}>Clear setup and start again</button>
      </details>
      <section className="outing-wizard-screen">
        <header className="outing-wizard-heading">
          <div className={styles.stepBadge}>
            <span aria-hidden="true">
              {stepVisual.icon}
            </span>

            <small>
              {stepVisual.label}
            </small>
          </div>

          <span>
            {content.eyebrow}
          </span>

          <h1 ref={headingRef} tabIndex={-1}>
            {content.title}
          </h1>

          <p>
            {content.description}
          </p>

          <div
            className={styles.stepDots}
            aria-label={`Step ${currentStep + 1} of ${TOTAL_STEPS}`}
          >
            {Array.from({
              length: TOTAL_STEPS
            }).map((_, index) => (
              <i
                key={index}
                className={
                  index <= currentStep
                    ? styles.completeDot
                    : ""
                }
              />
            ))}
          </div>
        </header>

        <div
          className="outing-wizard-content"
          key={currentStep}
        >
          {currentStep === 0 ? (
            <section
              className="mode-choice-stage"
              aria-label="Choose planning mode"
            >
              <button
                type="button"
                className={`mode-choice-card mode-choice-solo ${
                  planningMode ===
                  "solo"
                    ? "selected"
                    : ""
                }`}
                aria-pressed={
                  planningMode ===
                  "solo"
                }
                onClick={() => {
                  setPlanningMode(
                    "solo"
                  );
                  setPartySize(1);
                }}
              >
                <PlanningModeIllustration
                  mode="solo"
                  selected={
                    planningMode ===
                    "solo"
                  }
                />

                <div className="mode-choice-copy">
                  <span className="mode-choice-label">
                    SOLO
                  </span>

                  <strong>
                    Explore on my own
                  </strong>

                  <small>
                    Venture will focus on
                    comfort, pace, and places
                    that feel natural alone.
                  </small>
                </div>

                <span className="mode-choice-check">
                  {planningMode ===
                  "solo"
                    ? "✓"
                    : ""}
                </span>
              </button>

              <button
                type="button"
                className={`mode-choice-card mode-choice-group ${
                  planningMode ===
                  "group"
                    ? "selected"
                    : ""
                }`}
                aria-pressed={
                  planningMode ===
                  "group"
                }
                onClick={() => {
                  setPlanningMode(
                    "group"
                  );
                  setPartySize(
                    (current) =>
                      Math.max(
                        current,
                        2
                      )
                  );
                }}
              >
                <PlanningModeIllustration
                  mode="group"
                  selected={
                    planningMode ===
                    "group"
                  }
                />

                <div className="mode-choice-copy">
                  <span className="mode-choice-label">
                    GROUP
                  </span>

                  <strong>
                    Plan for other people
                  </strong>

                  <small>
                    Venture will consider group
                    size, occasion, consensus,
                    budget, and travel.
                  </small>
                </div>

                <span className="mode-choice-check">
                  {planningMode ===
                  "group"
                    ? "✓"
                    : ""}
                </span>
              </button>
            </section>
          ) : null}

          {currentStep === 1 ? (
            <section className="outing-build-method-grid">
              {buildMethods.map(
                (method) => {
                  const selected =
                    buildMethod ===
                    method.id;

                  return (
                    <button
                      type="button"
                      key={method.id}
                      className={
                        selected
                          ? "selected"
                          : ""
                      }
                      aria-pressed={
                        selected
                      }
                      onClick={() => {
                        setBuildMethod(
                          method.id
                        );

                        if (
                          method.id ===
                          "anchor"
                        ) {
                          setStopMix({
                            food: 1,
                            events: 0,
                            drinks: 1
                          });
                        }
                      }}
                    >
                      <span
                        aria-hidden="true"
                      >
                        {method.icon}
                      </span>

                      <div className="outing-build-method-copy">
                        <strong>
                          {method.title}
                        </strong>

                        <small>
                          {method.description}
                        </small>
                      </div>

                      <span className="outing-build-method-arrow" aria-hidden="true">
                        →
                      </span>
                    </button>
                  );
                }
              )}
            </section>
          ) : null}

          {currentStep === 2 ? (
            <section className="wizard-compact-panel">
              <p className="outing-time-note">All times are in Winnipeg.</p>
              <div className="wizard-date-grid">
                <label>
                  <span>Date</span>

                  <input
                    type="date"
                    min={getTodayInputValue()}
                    value={outingDate}
                    onChange={(event) =>
                      setOutingDate(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    Start time
                  </span>

                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) =>
                      setStartTime(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              {outingDate && startTime && !isFutureOuting(outingDate, startTime) ? (
                <p className="outing-flow-error" role="status">That time has passed. Choose a later time or another day.</p>
              ) : null}
              <div className="wizard-small-grid">
                {durationOptions.map(
                  (option) => (
                    <button
                      type="button"
                      key={option}
                      aria-pressed={duration ===
                        option}
                      className={
                        duration ===
                        option
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setDuration(
                          option
                        )
                      }
                    >
                      <strong>
                        {option}
                      </strong>

                      <small>
                        Outing window
                      </small>
                    </button>
                  )
                )}
              </div>
            </section>
          ) : null}

          {currentStep === 3 &&
          buildMethod ===
            "surprise" ? (
            <section className="outing-shape-panel">
              <div className="outing-total-stops-card">
                <div>
                  <span>
                    TOTAL STOPS
                  </span>

                  <strong>
                    How many places?
                  </strong>

                  <small>
                    Venture will create a
                    sensible order from your
                    allowed categories.
                  </small>
                </div>

                <div className="outing-stepper">
                  <button
                    type="button"
                    aria-label="Decrease total stops"
                    onClick={() =>
                      setTotalStops(
                        (current) =>
                          Math.max(
                            1,
                            current - 1
                          )
                      )
                    }
                  >
                    −
                  </button>

                  <output>
                    {totalStops}
                  </output>

                  <button
                    type="button"
                    aria-label="Increase total stops"
                    onClick={() =>
                      setTotalStops(
                        (current) =>
                          Math.min(
                            5,
                            current + 1
                          )
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="outing-kind-toggle-grid">
                {(
                  [
                    "food",
                    "event",
                    "drinks"
                  ] as StopKind[]
                ).map(
                  (kind) => {
                    const details =
                      stopKindDetails[
                        kind
                      ];

                    const selected =
                      allowedKinds.includes(
                        kind
                      );

                    const disabled =
                      kind ===
                        "drinks" &&
                      alcoholFree;

                    return (
                      <button
                        type="button"
                        key={kind}
                        disabled={
                          disabled
                        }
                        className={
                          selected
                            ? "selected"
                            : ""
                        }
                        aria-pressed={
                          selected
                        }
                        onClick={() =>
                          toggleAllowedKind(
                            kind
                          )
                        }
                      >
                        <span
                          aria-hidden="true"
                        >
                          {details.icon}
                        </span>

                        <strong>
                          {details.label}
                        </strong>

                        <small>
                          {disabled
                            ? "Unavailable in an alcohol-free outing"
                            : "Allow Venture to use this category"}
                        </small>
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          ) : null}

          {currentStep === 3 &&
          buildMethod === "mix" ? (
            <section className="outing-shape-panel">
              <div className="outing-composition-summary">
                <span>
                  EXACT MIX
                </span>

                <strong>
                  {formatMix(stopMix)}
                </strong>

                <small>
                  {getMixTotal(stopMix)} of
                  5 possible stops selected
                </small>
              </div>

              <div className="outing-count-grid">
                <CountStepper
                  kind="food"
                  value={
                    stopMix.food
                  }
                  onChange={
                    (value) =>
                      updateMix(
                        "food",
                        value
                      )
                  }
                />

                <CountStepper
                  kind="event"
                  value={
                    stopMix.events
                  }
                  onChange={
                    (value) =>
                      updateMix(
                        "events",
                        value
                      )
                  }
                />

                <CountStepper
                  kind="drinks"
                  value={
                    stopMix.drinks
                  }
                  disabled={
                    alcoholFree
                  }
                  onChange={
                    (value) =>
                      updateMix(
                        "drinks",
                        value
                      )
                  }
                />
              </div>
            </section>
          ) : null}

          {currentStep === 3 &&
          buildMethod ===
            "anchor" ? (
            <section className="outing-anchor-builder">
              <div className="outing-anchor-tools">
                <label>
                  <span>
                    Search published listings
                  </span>

                  <input
                    type="search"
                    value={anchorQuery}
                    placeholder="Restaurant, event, bar, neighbourhood..."
                    onChange={(event) =>
                      setAnchorQuery(
                        event.target.value
                      )
                    }
                  />
                </label>

                <div className="outing-anchor-filters">
                  {(
                    [
                      "all",
                      "food",
                      "event",
                      "drinks"
                    ] as const
                  ).map(
                    (kind) => (
                      <button
                        type="button"
                        key={kind}
                        aria-pressed={anchorKindFilter ===
                          kind}
                      className={
                          anchorKindFilter ===
                          kind
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setAnchorKindFilter(
                            kind
                          )
                        }
                      >
                        {kind === "all"
                          ? "All"
                          : stopKindDetails[
                              kind
                            ].label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {anchorLoading ? (
                <div className="outing-anchor-state">
                  <span
                    className="outing-loading-spinner"
                    aria-hidden="true"
                  />

                  <p>
                    Loading published
                    Venture listings...
                  </p>
                </div>
              ) : null}

              {anchorError ? (
                <div className="outing-anchor-state error">
                  <strong>
                    Could not load listings
                  </strong>

                  <p>
                    {anchorError}
                  </p>
                </div>
              ) : null}

              {!anchorLoading &&
              !anchorError ? (
                <div className="outing-anchor-list">
                  {filteredAnchorOptions.length >
                  0 ? (
                    filteredAnchorOptions.map(
                      (option) => {
                        const selected =
                          anchorListingKey ===
                          option.key;

                        return (
                          <button
                            type="button"
                            key={
                              option.key
                            }
                            className={
                              selected
                                ? "selected"
                                : ""
                            }
                            aria-pressed={
                              selected
                            }
                            onClick={() =>
                              setAnchorListingKey(
                                option.key
                              )
                            }
                          >
                            <span className={`outing-anchor-kind kind-${option.kind}`}>
                              {
                                stopKindDetails[
                                  option.kind
                                ].icon
                              }
                            </span>

                            <span className="outing-anchor-copy">
                              <strong>
                                {option.name}
                              </strong>

                              <small>
                                {option.category} •{" "}
                                {option.neighbourhood}
                              </small>

                              <i>
                                {formatAnchorTime(
                                  option
                                )} • {option.price}
                              </i>
                            </span>

                            <span className="outing-anchor-check">
                              {selected
                                ? "✓"
                                : ""}
                            </span>
                          </button>
                        );
                      }
                    )
                  ) : (
                    <div className="outing-anchor-state">
                      <strong>
                        No matching published listings
                      </strong>

                      <p>
                        Try another search or
                        category.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {selectedAnchor ? (
                <section className="outing-anchor-addons">
                  <div className="outing-anchor-selected">
                    <span>
                      STARTING POINT
                    </span>

                    <strong>
                      {selectedAnchor.name}
                    </strong>

                    <small>
                      Add up to four more stops
                      around this listing.
                    </small>
                  </div>

                  <div className="outing-count-grid">
                    <CountStepper
                      kind="food"
                      value={
                        stopMix.food
                      }
                      onChange={
                        (value) =>
                          updateMix(
                            "food",
                            value
                          )
                      }
                    />

                    <CountStepper
                      kind="event"
                      value={
                        stopMix.events
                      }
                      onChange={
                        (value) =>
                          updateMix(
                            "events",
                            value
                          )
                      }
                    />

                    <CountStepper
                      kind="drinks"
                      value={
                        stopMix.drinks
                      }
                      disabled={
                        alcoholFree
                      }
                      onChange={
                        (value) =>
                          updateMix(
                            "drinks",
                            value
                          )
                      }
                    />
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}

          {currentStep === 4 &&
          planningMode ===
            "solo" ? (
            <section className="outing-personalization-panel mood-stage-panel">
              <div className="outing-personalization-heading">
                <span>
                  SOLO MOOD
                </span>

                <strong>
                  What would feel good tonight?
                </strong>
              </div>

              <div className="outing-experience-grid">
                {soloVibes.map(
                  (option) => (
                    <button
                      type="button"
                      key={option.id}
                      aria-pressed={soloVibe ===
                        option.id}
                      className={
                        soloVibe ===
                        option.id
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setSoloVibe(
                          option.id
                        )
                      }
                    >
                      <span
                        aria-hidden="true"
                      >
                        {option.icon}
                      </span>

                      <span className="outing-experience-copy">
                        <strong>
                          {option.title}
                        </strong>

                        <small>
                          {option.description}
                        </small>
                      </span>
                    </button>
                  )
                )}
              </div>

              <div className="outing-personalization-heading secondary">
                <span>
                  SOLO PACE
                </span>

                <strong>
                  How quickly should the night move?
                </strong>
              </div>

              <div className="outing-choice-strip">
                {soloPaces.map(
                  (option) => (
                    <button
                      type="button"
                      key={option.id}
                      aria-pressed={soloPace ===
                        option.id}
                      className={
                        soloPace ===
                        option.id
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setSoloPace(
                          option.id
                        )
                      }
                    >
                      <span className="outing-experience-copy">
                        <strong>
                          {option.title}
                        </strong>

                        <small>
                          {option.description}
                        </small>
                      </span>
                    </button>
                  )
                )}
              </div>
            </section>
          ) : null}

          {currentStep === 4 &&
          planningMode ===
            "group" ? (
            <section className="outing-personalization-panel mood-stage-panel">
              <div className="outing-party-size-card">
                <div>
                  <span>
                    GROUP SIZE
                  </span>

                  <strong>
                    How many people?
                  </strong>

                  <small>
                    Venture will show both
                    per-person and group
                    estimates.
                  </small>
                </div>

                <div className="outing-stepper">
                  <button
                    type="button"
                    aria-label="Decrease group size"
                    onClick={() =>
                      setPartySize(
                        (current) =>
                          Math.max(
                            2,
                            current - 1
                          )
                      )
                    }
                  >
                    −
                  </button>

                  <output>
                    {partySize}
                  </output>

                  <button
                    type="button"
                    aria-label="Increase group size"
                    onClick={() =>
                      setPartySize(
                        (current) =>
                          Math.min(
                            12,
                            current + 1
                          )
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="outing-personalization-heading">
                <span>
                  OCCASION
                </span>

                <strong>
                  What kind of group night?
                </strong>
              </div>

              <div className="outing-experience-grid">
                {groupVibes.map(
                  (option) => (
                    <button
                      type="button"
                      key={option.id}
                      aria-pressed={groupVibe ===
                        option.id}
                      className={
                        groupVibe ===
                        option.id
                          ? "selected"
                          : ""
                      }
                      onClick={() => {
                        setGroupVibe(
                          option.id
                        );

                        if (
                          option.id ===
                            "date-night" &&
                          partySize > 2
                        ) {
                          setPartySize(2);
                        }
                      }}
                    >
                      <span
                        aria-hidden="true"
                      >
                        {option.icon}
                      </span>

                      <span className="outing-experience-copy">
                        <strong>
                          {option.title}
                        </strong>

                        <small>
                          {option.description}
                        </small>
                      </span>
                    </button>
                  )
                )}
              </div>

              <div className="outing-personalization-heading secondary">
                <span>
                  GROUP PRIORITY
                </span>

                <strong>
                  What should Venture protect most?
                </strong>
              </div>

              <div className="outing-choice-strip">
                {groupPriorities.map(
                  (option) => (
                    <button
                      type="button"
                      key={option.id}
                      aria-pressed={groupPriority ===
                        option.id}
                      className={
                        groupPriority ===
                        option.id
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setGroupPriority(
                          option.id
                        )
                      }
                    >
                      <span className="outing-experience-copy">
                        <strong>
                          {option.title}
                        </strong>

                        <small>
                          {option.description}
                        </small>
                      </span>
                    </button>
                  )
                )}
              </div>
            </section>
          ) : null}

          {currentStep === 5 ? (
            <section className="wizard-compact-panel interest-stage-panel">
              <div className="profile-default-row">
                <p>
                  Starting with{" "}
                  <strong>
                    {profilePreferences.displayName ||
                      "your"}
                    &apos;s Profile
                  </strong>
                </p>

                <button
                  type="button"
                  onClick={resetInterests}
                >
                  Reset
                </button>
              </div>

              <div className="interest-stage-note">
                <span aria-hidden="true">✨</span>

                <div>
                  <strong>Build your flavour</strong>
                  <small>Pick as many interests as you like. Venture will use them to shape the route.</small>
                </div>
              </div>

              <div className="interest-compact-grid">
                {availableInterests.map(
                  (interest) => {
                    const selected =
                      selectedInterests.includes(
                        interest
                      );

                    return (
                      <button
                        type="button"
                        key={interest}
                        aria-pressed={selected}
                      className={
                          selected
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setSelectedInterests(
                            (current) =>
                              toggleValue(
                                current,
                                interest
                              )
                          )
                        }
                      >
                        <span className="interest-chip-icon" aria-hidden="true">
                          {getInterestIcon(interest)}
                        </span>

                        <span className="interest-chip-label">
                          {interest}
                        </span>

                        <span className="interest-chip-check" aria-hidden="true">
                          {selected
                            ? "✓"
                            : ""}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <div className={styles.discoveryPreferencePanel}>
                <div className={styles.discoveryPreferenceHeading}>
                  <span>NEW TO ME</span>
                  <strong>Should Venture avoid places you have already tried?</strong>
                  <small>
                    Only confirmed visits count. Saved or viewed listings are never treated as visited.
                  </small>
                </div>

                <div className={styles.discoveryPreferenceGrid}>
                  {discoveryPreferenceOptions.map((option) => {
                    const selected =
                      effectiveDiscoveryPreference === option.id;

                    return (
                      <button
                        type="button"
                        key={option.id}
                        className={
                          selected
                            ? styles.discoveryPreferenceSelected
                            : ""
                        }
                        aria-pressed={selected}
                        onClick={() =>
                          setDiscoveryPreference(option.id)
                        }
                      >
                        <span aria-hidden="true">{option.icon}</span>
                        <div>
                          <strong>{option.title}</strong>
                          <small>{option.description}</small>
                        </div>
                        <i aria-hidden="true">
                          {selected ? "✓" : ""}
                        </i>
                      </button>
                    );
                  })}
                </div>

                {effectiveDiscoveryPreference === "new-only" &&
                discoveryPreference !== "new-only" ? (
                  <p className={styles.discoveryPhraseNotice}>
                    Venture recognized your request for somewhere you have not gone and switched on New to Me.
                  </p>
                ) : null}
              </div>

              <div className="outing-custom-preferences">
                <label>
                  <span>
                    Must include
                  </span>

                  <input
                    type="text"
                    value={
                      mustIncludeText
                    }
                    placeholder="Example: sushi, bowling"
                    onChange={(event) =>
                      setMustIncludeText(
                        event.target.value
                      )
                    }
                  />

                  <small>
                    Separate ideas with
                    commas. Venture will
                    strongly prioritize them.
                  </small>
                </label>

                <label>
                  <span>Avoid</span>

                  <input
                    type="text"
                    value={avoidText}
                    placeholder="Example: clubs, spicy food"
                    onChange={(event) =>
                      setAvoidText(
                        event.target.value
                      )
                    }
                  />

                  <small>
                    Listings that clearly
                    match these terms are
                    removed.
                  </small>
                </label>
              </div>
            </section>
          ) : null}

          {currentStep === 6 ? (
            <section className="budget-experience-panel">
              <div className="budget-stage-note">
                <span aria-hidden="true">💡</span>

                <div>
                  <strong>Keep it realistic</strong>
                  <small>
                    This estimate is per person. Venture will show the group total after building the route.
                  </small>
                </div>
              </div>

              <div className="budget-compact-grid">
                {budgetOptions.map(
                  (option) => {
                    const selected =
                      budget ===
                      option.value;

                    return (
                      <button
                        type="button"
                        key={option.value}
                        className={`${selected ? "selected" : ""} budget-option budget-option-${option.value}`}
                        aria-pressed={selected}
                        onClick={() =>
                          setBudget(
                            option.value
                          )
                        }
                      >
                        <span className="budget-option-icon" aria-hidden="true">
                          {option.icon}
                        </span>

                        <span className="budget-option-amount">
                          {option.amount}
                        </span>

                        <strong>
                          {option.label}
                        </strong>

                        <small>
                          {option.description}
                        </small>

                        <i>
                          {option.helper}
                        </i>

                        <span className="budget-option-check" aria-hidden="true">
                          {selected ? "✓" : ""}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="budget-stage-footer">
                <span aria-hidden="true">🔒</span>
                <small>Budget changes recommendations, never the quality of your experience.</small>
              </div>
            </section>
          ) : null}

          {currentStep === 7 ? (
            <section className="outing-area-travel-panel area-experience-panel">
              <div className="area-stage-intro">
                <span aria-hidden="true">📍</span>

                <div>
                  <strong>Choose your Winnipeg radius</strong>
                  <small>
                    Pick one area for a tighter plan, or select a few for a bigger city adventure.
                  </small>
                </div>

                <b>
                  {selectedNeighbourhoods.length > 0
                    ? `${selectedNeighbourhoods.length} selected`
                    : "Citywide"}
                </b>
              </div>

              <div className="outing-personalization-heading area-heading">
                <span>
                  NEIGHBOURHOODS
                </span>

                <strong>
                  Where should Venture look?
                </strong>
              </div>

              <div className="neighbourhood-experience-shell">
                <NeighbourhoodPicker
                  compact
                  selected={
                    selectedNeighbourhoods
                  }
                  onToggle={(neighbourhood) =>
                    setSelectedNeighbourhoods(
                      (current) =>
                        toggleValue(
                          current,
                          neighbourhood
                        )
                    )
                  }
                />
              </div>

              <p className="wizard-compact-note area-anywhere-note">
                <span aria-hidden="true">🧭</span>
                Nothing selected means Venture can search anywhere in Winnipeg.
              </p>

              <div className="outing-personalization-heading secondary travel-heading">
                <span>
                  TRANSPORTATION
                </span>

                <strong>
                  How are you getting around?
                </strong>
              </div>

              <div className="travel-compact-grid">
                {transportationOptions.map(
                  (option) => (
                    <button
                      type="button"
                      key={option.value}
                      aria-pressed={transportation ===
                        option.value}
                      className={
                        transportation ===
                        option.value
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setTransportation(
                          option.value
                        )
                      }
                    >
                      <span>
                        {option.icon}
                      </span>

                      <strong>
                        {option.value}
                      </strong>

                      <small>
                        {option.description}
                      </small>
                    </button>
                  )
                )}
              </div>

              <div className="outing-travel-limit">
                <div>
                  <span>
                    MAX TRAVEL PER LEG
                  </span>

                  <strong>
                    {maxTravelMinutes} minutes
                  </strong>
                </div>

                <div className="outing-travel-limit-grid">
                  {maxTravelOptions.map(
                    (option) => (
                      <button
                        type="button"
                        key={option.value}
                        aria-pressed={maxTravelMinutes ===
                          option.value}
                      className={
                          maxTravelMinutes ===
                          option.value
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setMaxTravelMinutes(
                            option.value
                          )
                        }
                      >
                        <strong>
                          {option.label}
                        </strong>

                        <small>
                          {option.description}
                        </small>
                      </button>
                    )
                  )}
                </div>
              </div>

              <label className="alcohol-compact-toggle">
                <div>
                  <strong>
                    Alcohol-free outing
                  </strong>

                  <small>
                    Remove bars, breweries,
                    cocktail spots, and other
                    alcohol-focused places.
                  </small>
                </div>

                <input
                  type="checkbox"
                  checked={alcoholFree}
                  onChange={(event) =>
                    setAlcoholFree(
                      event.target.checked
                    )
                  }
                />
              </label>
            </section>
          ) : null}

          {currentStep === 8 &&
          planningMode &&
          buildMethod &&
          selectedExperience ? (
            <section className="review-compact-card outing-review-v3">
              <div className="review-compact-hero">
                <span>
                  {planningMode ===
                  "solo"
                    ? "SOLO OUTING"
                    : `${partySize}-PERSON OUTING`}
                </span>

                <h2>
                  {
                    selectedExperience.outingTypeTitle
                  }
                </h2>

                <p>
                  {buildMethod ===
                  "anchor"
                    ? `Built around ${selectedAnchor?.name ?? "your chosen starting point"}`
                    : buildMethod ===
                        "mix"
                      ? "Built from your exact stop mix"
                      : "A surprise route using your allowed categories"}
                </p>
              </div>

              <div className="review-compact-grid">
                <div>
                  <span>WHEN <button type="button" className="outing-review-edit" onClick={() => editReviewStep(2)} aria-label="Edit when">Edit</button></span>

                  <strong>
                    {outingDate},{" "}
                    {startTime}
                  </strong>

                  <small>
                    {duration}
                  </small>
                </div>

                <div>
                  <span>ROUTE <button type="button" className="outing-review-edit" onClick={() => editReviewStep(3)} aria-label="Edit route">Edit</button></span>

                  <strong>
                    {buildMethod ===
                    "surprise"
                      ? `${totalStops} surprise ${
                          totalStops === 1
                            ? "stop"
                            : "stops"
                        }`
                      : buildMethod ===
                          "anchor"
                        ? `Start + ${getMixTotal(stopMix)} extras`
                        : formatMix(stopMix)}
                  </strong>
                </div>

                <div>
                  <span>PEOPLE <button type="button" className="outing-review-edit" onClick={() => editReviewStep(0)} aria-label="Edit people">Edit</button></span>

                  <strong>
                    {planningMode ===
                    "solo"
                      ? "1 person"
                      : `${partySize} people`}
                  </strong>

                  <small>
                    {planningMode ===
                    "solo"
                      ? soloPace
                      : groupPriority}
                  </small>
                </div>

                <div>
                  <span>BUDGET <button type="button" className="outing-review-edit" onClick={() => editReviewStep(6)} aria-label="Edit budget">Edit</button></span>

                  <strong>
                    {getBudgetLabel(
                      budget
                    )}
                  </strong>

                  <small>
                    Per person
                  </small>
                </div>

                <div>
                  <span>TRAVEL <button type="button" className="outing-review-edit" onClick={() => editReviewStep(7)} aria-label="Edit travel">Edit</button></span>

                  <strong>
                    {transportation}
                  </strong>

                  <small>
                    Up to{" "}
                    {maxTravelMinutes} min
                    between stops
                  </small>
                </div>

                <div>
                  <span>AREA <button type="button" className="outing-review-edit" onClick={() => editReviewStep(7)} aria-label="Edit area">Edit</button></span>

                  <strong>
                    {selectedNeighbourhoods.length >
                    0
                      ? selectedNeighbourhoods.join(
                          ", "
                        )
                      : "All Winnipeg"}
                  </strong>
                </div>

                <div className="review-wide">
                  <span>INTERESTS <button type="button" className="outing-review-edit" onClick={() => editReviewStep(5)} aria-label="Edit interests">Edit</button></span>

                  <strong>
                    {selectedInterests.length >
                    0
                      ? selectedInterests.join(
                          ", "
                        )
                      : "Surprise me"}
                  </strong>
                </div>

                <div className="review-wide">
                  <span>DISCOVERY <button type="button" className="outing-review-edit" onClick={() => editReviewStep(5)} aria-label="Edit discovery">Edit</button></span>
                  <strong>
                    {effectiveDiscoveryPreference === "new-only"
                      ? "Only places and event dates new to me"
                      : effectiveDiscoveryPreference === "mix"
                        ? "A mix of familiar and new"
                        : "Best available matches"}
                  </strong>
                </div>

                {mustIncludeTerms.length >
                0 ? (
                  <div className="review-wide">
                    <span>
                      MUST INCLUDE
                    </span>

                    <strong>
                      {mustIncludeTerms.join(
                        ", "
                      )}
                    </strong>
                  </div>
                ) : null}

                {avoidTerms.length >
                0 ? (
                  <div className="review-wide">
                    <span>AVOID</span>

                    <strong>
                      {avoidTerms.join(
                        ", "
                      )}
                    </strong>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      {launchError ? <p className="outing-flow-error" role="alert">{launchError}</p> : null}
      <div className="outing-wizard-actions">
        {currentStep > 0 ? (
          <button
            type="button"
            className="outing-wizard-back"
            onClick={goBack}
          >
            ← Back
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="outing-wizard-next"
          disabled={
            !canContinue ||
            isLaunchingResults
          }
          onClick={goForward}
        >
          {isLaunchingResults
            ? "Building your route"
            : currentStep ===
                TOTAL_STEPS - 1
              ? "Create my outing"
              : reviewReturn ? "Back to review" : currentStep === 5 ? "Continue · interests optional" : "Continue"}

          <span aria-hidden="true">
            →
          </span>
        </button>
      </div>

      <OutingResultTransition
        active={isLaunchingResults}
      />
    </main>
  );
}
