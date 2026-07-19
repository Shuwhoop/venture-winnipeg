"use client";

import SubmitListingEntry from "@/components/submit-listing-entry/submit-listing-entry";

import {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  PlanningModeIllustration
} from "@/components/planning-mode-illustration";
import {
  defaultPreferences,
  loadPreferences,
  type BudgetPreference,
  type VenturePreferences
} from "@/lib/profile-preferences";

const OUTING_DRAFT_KEY =
  "venture:outing-draft:v1";

const TOTAL_STEPS = 8;

type PlanningMode =
  | "solo"
  | "group";

type OutingType = {
  id: string;
  icon: string;
  title: string;
  shortDescription: string;
};

type OutingDraft = {
  planningMode: PlanningMode;
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
  createdAt: string;
};

const outingTypes: OutingType[] = [
  {
    id: "date-night",
    icon: "♡",
    title: "Date Night",
    shortDescription:
      "Food, an activity, and a memorable finish."
  },
  {
    id: "friends-night",
    icon: "☻",
    title: "Friends Night",
    shortDescription:
      "A lively night for your favourite people."
  },
  {
    id: "solo-outing",
    icon: "◉",
    title: "Solo Adventure",
    shortDescription:
      "Explore the city at your own pace."
  },
  {
    id: "family-plan",
    icon: "⌂",
    title: "Family Plan",
    shortDescription:
      "Practical, welcoming, family-friendly fun."
  },
  {
    id: "food-crawl",
    icon: "◇",
    title: "Food Crawl",
    shortDescription:
      "Several delicious Winnipeg stops."
  },
  {
    id: "nightlife",
    icon: "✦",
    title: "Nightlife",
    shortDescription:
      "Music, entertainment, and late-night energy."
  },
  {
    id: "budget-night",
    icon: "$",
    title: "Budget Night",
    shortDescription:
      "A complete outing without overspending."
  },
  {
    id: "surprise-me",
    icon: "?",
    title: "Surprise Me",
    shortDescription:
      "Let Venture choose the adventure."
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

const neighbourhoodOptions = [
  "Downtown",
  "Exchange District",
  "The Forks",
  "Osborne Village",
  "Corydon",
  "St. Boniface",
  "West End",
  "South Winnipeg"
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
    icon: "●",
    description: "Keep stops close"
  },
  {
    value: "Transit",
    icon: "▣",
    description: "Use Winnipeg Transit"
  },
  {
    value: "Driving",
    icon: "▰",
    description: "Explore more of the city"
  },
  {
    value: "Rideshare",
    icon: "↗",
    description: "Flexible travel"
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
  description: string;
}[] = [
  {
    value: "free",
    label: "Free",
    amount: "$0",
    description:
      "No admission cost"
  },
  {
    value: "under-40",
    label: "Under $40",
    amount: "$40",
    description:
      "Affordable per person"
  },
  {
    value: "under-80",
    label: "Under $80",
    amount: "$80",
    description:
      "More food and ticket choices"
  },
  {
    value: "flexible",
    label: "Flexible",
    amount: "∞",
    description:
      "Prioritize the experience"
  }
];

const stepContent = [
  {
    eyebrow: "PLANNING MODE",
    title: "Who is this outing for?",
    description:
      "Choose Solo for your own adventure or Group when planning with friends."
  },
  {
    eyebrow: "OUTING TYPE",
    title: "What kind of outing?",
    description:
      "Pick the mood Venture should build around."
  },
  {
    eyebrow: "WHEN",
    title: "When are you going?",
    description:
      "Choose the date, start time, and length."
  },
  {
    eyebrow: "INTERESTS",
    title: "What sounds good?",
    description:
      "Your Profile interests start selected."
  },
  {
    eyebrow: "BUDGET",
    title: "What is the budget?",
    description:
      "Estimated amount per person."
  },
  {
    eyebrow: "AREA",
    title: "Where should Venture search?",
    description:
      "Leave everything clear to search all Winnipeg."
  },
  {
    eyebrow: "TRAVEL",
    title: "How are you getting around?",
    description:
      "This affects distance and travel time."
  },
  {
    eyebrow: "REVIEW",
    title: "Ready to build your outing?",
    description:
      "Check the plan ingredients before Venture connects the stops."
  }
];

function getTodayInputValue(): string {
  const currentDate =
    new Date();

  const timezoneOffset =
    currentDate.getTimezoneOffset() *
    60 *
    1000;

  return new Date(
    currentDate.getTime() -
      timezoneOffset
  )
    .toISOString()
    .slice(0, 10);
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

export default function BuildOutingPage() {
  const [
    currentStep,
    setCurrentStep
  ] = useState(0);

  const [
    planningMode,
    setPlanningMode
  ] =
    useState<PlanningMode | null>(
      null
    );

  const [
    selectedType,
    setSelectedType
  ] =
    useState<string | null>(
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
  ] = useState(1);

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
  }, []);

  const selectedOuting =
    useMemo(
      () =>
        outingTypes.find(
          (outing) =>
            outing.id ===
            selectedType
        ) ?? null,
      [selectedType]
    );

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

  const availableNeighbourhoods =
    useMemo(
      () =>
        Array.from(
          new Set([
            ...neighbourhoodOptions,
            ...profilePreferences.neighbourhoods
          ])
        ),
      [
        profilePreferences.neighbourhoods
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

  const progress =
    ((currentStep + 1) /
      TOTAL_STEPS) *
    100;

  const content =
    stepContent[currentStep];

  const canContinue =
    currentStep === 0
      ? planningMode !== null
      : currentStep === 1
        ? selectedOuting !== null
        : currentStep === 2
          ? Boolean(
              outingDate &&
              startTime &&
              duration
            )
          : true;

  function goForward() {
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

    setCurrentStep(
      (current) =>
        current + 1
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
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
      behavior: "smooth"
    });
  }

  function resetInterests() {
    setSelectedInterests(
      profilePreferences.interests
    );
  }

  function handlePrepareOuting() {
    if (
      !planningMode ||
      !selectedOuting ||
      !outingDate ||
      !startTime
    ) {
      return;
    }

    const draft: OutingDraft = {
      planningMode,

      outingTypeId:
        selectedOuting.id,

      outingTypeTitle:
        selectedOuting.title,

      date:
        outingDate,

      startTime,
      duration,

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

      interests: Array.from(
        new Set([
          ...selectedInterests,
          ...mustIncludeTerms
        ])
      ),

      createdAt:
        new Date().toISOString()
    };

    window.localStorage.setItem(
      OUTING_DRAFT_KEY,
      JSON.stringify(draft)
    );

    window.location.assign(
      "/build-outing/results"
    );
  }

  return (
    <main className="outing-wizard">
      <div className="outing-wizard-progress">
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

      <section className="outing-wizard-screen">
        <header className="outing-wizard-heading">
          <span>{content.eyebrow}</span>

          <h1>{content.title}</h1>

          <p>{content.description}</p>
        </header>

        <div
          className="outing-wizard-content"
          key={currentStep}
                >
        {currentStep === 0 ? (
        <>
        <section
            className="mode-choice-stage"
            aria-label="Choose planning mode"
        >
            <button
            type="button"
            className={`mode-choice-card mode-choice-solo ${
                planningMode === "solo"
                ? "selected"
                : ""
            }`}
            aria-pressed={
                planningMode === "solo"
            }
            onClick={() => {
              setPlanningMode("solo");
              setPartySize(1);
            }}
            >
            <PlanningModeIllustration
                mode="solo"
                selected={
                planningMode === "solo"
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
                A happy self-date, food crawl,
                event, or city adventure shaped
                around your pace.
                </small>
            </div>

            <span className="mode-choice-check">
                {planningMode === "solo"
                ? "✓"
                : ""}
            </span>
            </button>

            <button
            type="button"
            className={`mode-choice-card mode-choice-group ${
                planningMode === "group"
                ? "selected"
                : ""
            }`}
            aria-pressed={
                planningMode === "group"
            }
            onClick={() => {
              setPlanningMode("group");

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
                planningMode === "group"
                }
            />

            <div className="mode-choice-copy">
                <span className="mode-choice-label">
                GROUP
                </span>

                <strong>
                Bring the whole crew
                </strong>

                <small>
                Start a lively shared plan for
                friends, birthdays, celebrations,
                and spontaneous nights.
                </small>
            </div>

            <span className="mode-choice-check">
                {planningMode === "group"
                ? "✓"
                : ""}
            </span>
            </button>
        </section>

        {planningMode === "group" ? (
          <section className="outing-party-size-card">
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
          </section>
        ) : null}
        </>
        ) : null}

          {currentStep === 1 ? (
            <>
              <section className="outing-type-compact-grid">
                {outingTypes.map(
                  (outing) => {
                    const selected =
                      selectedType ===
                      outing.id;

                    return (
                      <button
                        type="button"
                        key={outing.id}
                        className={
                          selected
                            ? "selected"
                            : ""
                        }
                        aria-pressed={
                          selected
                        }
                        onClick={() =>
                          setSelectedType(
                            selected
                              ? null
                              : outing.id
                          )
                        }
                      >
                        <span>
                          {outing.icon}
                        </span>

                        <strong>
                          {outing.title}
                        </strong>
                      </button>
                    );
                  }
                )}
              </section>

              {selectedOuting ? (
                <p className="outing-type-description">
                  <strong>
                    {selectedOuting.title}
                  </strong>

                  {
                    selectedOuting.shortDescription
                  }
                </p>
              ) : null}
            </>
          ) : null}

          {currentStep === 2 ? (
            <section className="wizard-compact-panel">
              <div className="wizard-date-grid">
                <label>
                  <span>Date</span>

                  <input
                    type="date"
                    value={outingDate}
                    onChange={(event) =>
                      setOutingDate(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  <span>Start time</span>

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

              <div className="wizard-small-grid">
                {durationOptions.map(
                  (option) => (
                    <button
                      type="button"
                      key={option}
                      className={
                        duration === option
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setDuration(option)
                      }
                    >
                      <strong>
                        {option}
                      </strong>

                      <small>Length</small>
                    </button>
                  )
                )}
              </div>
            </section>
          ) : null}

          {currentStep === 3 ? (
            <section className="wizard-compact-panel">
              <div className="profile-default-row">
                <p>
                  Using{" "}
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
                        {interest}

                        <span>
                          {selected
                            ? "✓"
                            : ""}
                        </span>
                      </button>
                    );
                  }
                )}
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
                    strongly prioritize
                    them.
                  </small>
                </label>

                <label>
                  <span>
                    Avoid
                  </span>

                  <input
                    type="text"
                    value={
                      avoidText
                    }
                    placeholder="Example: clubs, spicy food"
                    onChange={(event) =>
                      setAvoidText(
                        event.target.value
                      )
                    }
                  />

                  <small>
                    Venture will remove
                    listings that clearly
                    match these terms.
                  </small>
                </label>
              </div>
            </section>
          ) : null}

          {currentStep === 4 ? (
            <section className="budget-compact-grid">
              {budgetOptions.map(
                (option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={
                      budget === option.value
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setBudget(option.value)
                    }
                  >
                    <span>
                      {option.amount}
                    </span>

                    <strong>
                      {option.label}
                    </strong>

                    <small>
                      {option.description}
                    </small>
                  </button>
                )
              )}
            </section>
          ) : null}

          {currentStep === 5 ? (
            <section className="wizard-compact-panel">
              <div className="area-compact-grid">
                {availableNeighbourhoods.map(
                  (neighbourhood) => {
                    const selected =
                      selectedNeighbourhoods.includes(
                        neighbourhood
                      );

                    return (
                      <button
                        type="button"
                        key={neighbourhood}
                        className={
                          selected
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setSelectedNeighbourhoods(
                            (current) =>
                              toggleValue(
                                current,
                                neighbourhood
                              )
                          )
                        }
                      >
                        <span>●</span>

                        <strong>
                          {neighbourhood}
                        </strong>

                        <i>
                          {selected
                            ? "✓"
                            : ""}
                        </i>
                      </button>
                    );
                  }
                )}
              </div>

              <p className="wizard-compact-note">
                Nothing selected means
                anywhere in Winnipeg.
              </p>
            </section>
          ) : null}

          {currentStep === 6 ? (
            <section className="wizard-compact-panel">
              <div className="travel-compact-grid">
                {transportationOptions.map(
                  (option) => (
                    <button
                      type="button"
                      key={option.value}
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
                    Avoid alcohol-focused
                    destinations.
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

          {currentStep === 7 &&
          planningMode &&
          selectedOuting ? (
            <section className="review-compact-card">
              <div className="review-compact-hero">
                <span>
                  {planningMode === "solo"
                    ? "SOLO OUTING"
                    : "GROUP OUTING"}
                </span>

                <h2>
                  {selectedOuting.title}
                </h2>
              </div>

              <div className="review-compact-grid">
                <div>
                  <span>WHEN</span>

                  <strong>
                    {outingDate},{" "}
                    {startTime}
                  </strong>

                  <small>{duration}</small>
                </div>

                <div>
                  <span>PEOPLE</span>

                  <strong>
                    {planningMode ===
                    "solo"
                      ? "1 person"
                      : `${partySize} people`}
                  </strong>
                </div>

                <div>
                  <span>BUDGET</span>

                  <strong>
                    {getBudgetLabel(
                      budget
                    )}
                  </strong>
                </div>

                <div>
                  <span>TRAVEL</span>

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
                  <span>AREA</span>

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
                  <span>INTERESTS</span>

                  <strong>
                    {selectedInterests.length >
                    0
                      ? selectedInterests.join(
                          ", "
                        )
                      : "Surprise me"}
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
          disabled={!canContinue}
          onClick={goForward}
        >
          {currentStep ===
          TOTAL_STEPS - 1
            ? "Build my outing"
            : "Continue"}

          <span aria-hidden="true">
            →
          </span>
        </button>
      </div>
    
      <SubmitListingEntry placement="home" />
    </main>
  );
}