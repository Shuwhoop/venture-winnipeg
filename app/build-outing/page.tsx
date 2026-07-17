"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  defaultPreferences,
  loadPreferences,
  type BudgetPreference,
  type VenturePreferences
} from "@/lib/profile-preferences";

const OUTING_DRAFT_KEY =
  "venture:outing-draft:v1";

type OutingType = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

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

const outingTypes: OutingType[] = [
  {
    id: "date-night",
    icon: "♡",
    title: "Date Night",
    description:
      "Dinner, an activity, and somewhere memorable to end the night."
  },
  {
    id: "friends-night",
    icon: "☻",
    title: "Friends Night",
    description:
      "A lively plan built for groups, laughs, food, and shared experiences."
  },
  {
    id: "solo-outing",
    icon: "◉",
    title: "Solo Outing",
    description:
      "A comfortable adventure designed around your own interests and pace."
  },
  {
    id: "family-plan",
    icon: "⌂",
    title: "Family Plan",
    description:
      "Family-friendly activities, food, timing, and practical travel."
  },
  {
    id: "food-crawl",
    icon: "◇",
    title: "Food Crawl",
    description:
      "Several food stops connected into one Winnipeg route."
  },
  {
    id: "nightlife",
    icon: "✦",
    title: "Nightlife",
    description:
      "Music, entertainment, dancing, and late-night destinations."
  },
  {
    id: "budget-night",
    icon: "$",
    title: "Budget Night",
    description:
      "A complete outing built around free and affordable options."
  },
  {
    id: "surprise-me",
    icon: "?",
    title: "Surprise Me",
    description:
      "Let Venture build something unexpected from what is happening."
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
  "Walking",
  "Transit",
  "Driving",
  "Rideshare"
];

const budgetOptions: {
  value: BudgetPreference;
  label: string;
  description: string;
}[] = [
  {
    value: "free",
    label: "Free",
    description:
      "Prioritize outings with no admission cost."
  },
  {
    value: "under-40",
    label: "Under $40",
    description:
      "Keep the estimated total below $40 per person."
  },
  {
    value: "under-80",
    label: "Under $80",
    description:
      "Allow more food, ticket, and activity options."
  },
  {
    value: "flexible",
    label: "Flexible",
    description:
      "Prioritize the experience over a strict total."
  }
];

function getTodayInputValue(): string {
  const currentDate = new Date();

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
    : [...currentValues, value];
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
    step,
    setStep
  ] = useState<1 | 2>(1);

  const [
    selectedType,
    setSelectedType
  ] = useState<string | null>(null);

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
    draftReady,
    setDraftReady
  ] = useState(false);

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
            outing.id === selectedType
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
      [profilePreferences.interests]
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

  function handleTypeSelection(
    outingId: string
  ) {
    setSelectedType(
      (currentType) =>
        currentType === outingId
          ? null
          : outingId
    );

    setDraftReady(false);
  }

  function handleContinue() {
    if (!selectedOuting) {
      return;
    }

    setStep(2);
    setDraftReady(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function handleBack() {
    setStep(1);
    setDraftReady(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function resetToProfileDefaults() {
    setSelectedInterests(
      profilePreferences.interests
    );

    setSelectedNeighbourhoods(
      profilePreferences.neighbourhoods
    );

    setBudget(
      profilePreferences.budget
    );

    setAlcoholFree(
      profilePreferences.alcoholFree
    );

    setDraftReady(false);
  }

  function handlePrepareOuting() {
    if (
      !selectedOuting ||
      !outingDate ||
      !startTime
    ) {
      return;
    }

    const draft: OutingDraft = {
      outingTypeId:
        selectedOuting.id,

      outingTypeTitle:
        selectedOuting.title,

      date: outingDate,
      startTime,
      duration,
      interests:
        selectedInterests,

      neighbourhoods:
        selectedNeighbourhoods,

      budget,
      transportation,
      alcoholFree,

      createdAt:
        new Date().toISOString()
    };

    window.localStorage.setItem(
      OUTING_DRAFT_KEY,
      JSON.stringify(draft)
    );

    setDraftReady(true);
  }

  return (
    <main className="build-outing-page">
      <div
        className="builder-progress"
        aria-label={`Step ${step} of 2`}
      >
        <span
          className={
            step >= 1
              ? "active"
              : ""
          }
        />

        <span
          className={
            step >= 2
              ? "active"
              : ""
          }
        />
      </div>

      {step === 1 ? (
        <>
          <section className="build-outing-hero">
            <span className="build-outing-eyebrow">
              STEP 1 OF 2
            </span>

            <h1>
              What kind of outing
              are you feeling?
            </h1>

            <p>
              Choose the mood. Venture
              will use real Winnipeg
              events, places, opening
              hours, and travel time to
              build the plan.
            </p>
          </section>

          <section
            className="outing-type-grid"
            aria-label="Choose an outing type"
          >
            {outingTypes.map(
              (outing) => {
                const selected =
                  outing.id ===
                  selectedType;

                return (
                  <button
                    className={`outing-type-card ${
                      selected
                        ? "selected"
                        : ""
                    }`}
                    type="button"
                    key={outing.id}
                    aria-pressed={
                      selected
                    }
                    onClick={() =>
                      handleTypeSelection(
                        outing.id
                      )
                    }
                  >
                    <span
                      className="outing-type-icon"
                      aria-hidden="true"
                    >
                      {outing.icon}
                    </span>

                    <span className="outing-type-copy">
                      <strong>
                        {outing.title}
                      </strong>

                      <small>
                        {
                          outing.description
                        }
                      </small>
                    </span>

                    <span
                      className="outing-type-check"
                      aria-hidden="true"
                    >
                      {selected
                        ? "✓"
                        : ""}
                    </span>
                  </button>
                );
              }
            )}
          </section>

          {selectedOuting ? (
            <section className="outing-selection-summary">
              <span>
                YOUR OUTING
              </span>

              <strong>
                {selectedOuting.title}
              </strong>

              <p>
                Next, customize the
                timing, budget, travel,
                and interests for this
                particular outing.
              </p>
            </section>
          ) : null}

          <div className="build-outing-action">
            <button
              type="button"
              disabled={
                !selectedOuting
              }
              onClick={
                handleContinue
              }
            >
              Customize this outing
            </button>

            <small>
              Your Profile preferences
              will be used as the
              starting point.
            </small>
          </div>
        </>
      ) : (
        <>
          <section className="builder-step-heading">
            <button
              className="builder-back-button"
              type="button"
              onClick={handleBack}
            >
              ← Back
            </button>

            <span className="build-outing-eyebrow">
              STEP 2 OF 2
            </span>

            <h1>
              Customize your{" "}
              {selectedOuting?.title ??
                "outing"}
            </h1>

            <p>
              These choices apply only
              to this outing. Your
              Profile will stay exactly
              as it is.
            </p>
          </section>

          <section className="profile-defaults-note">
            <span aria-hidden="true">
              ✦
            </span>

            <div>
              <strong>
                Using{" "}
                {profilePreferences.displayName ||
                  "your"}
                &apos;s Profile defaults
              </strong>

              <small>
                Interests, budget,
                neighbourhoods, and
                alcohol preference were
                filled automatically.
              </small>
            </div>

            <button
              type="button"
              onClick={
                resetToProfileDefaults
              }
            >
              Reset
            </button>
          </section>

          <section className="outing-customizer">
            <div className="customizer-section">
              <div className="customizer-heading">
                <span>WHEN</span>
                <h2>
                  When are you going?
                </h2>
              </div>

              <div className="builder-field-grid">
                <label className="builder-field">
                  <span>Date</span>

                  <input
                    type="date"
                    value={outingDate}
                    onChange={(event) => {
                      setOutingDate(
                        event.target.value
                      );

                      setDraftReady(
                        false
                      );
                    }}
                  />
                </label>

                <label className="builder-field">
                  <span>Start time</span>

                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => {
                      setStartTime(
                        event.target.value
                      );

                      setDraftReady(
                        false
                      );
                    }}
                  />
                </label>
              </div>

              <div
                className="choice-chip-grid"
                aria-label="Outing duration"
              >
                {durationOptions.map(
                  (option) => (
                    <button
                      className={`builder-choice-chip ${
                        duration ===
                        option
                          ? "selected"
                          : ""
                      }`}
                      type="button"
                      key={option}
                      aria-pressed={
                        duration ===
                        option
                      }
                      onClick={() => {
                        setDuration(
                          option
                        );

                        setDraftReady(
                          false
                        );
                      }}
                    >
                      {option}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="customizer-section">
              <div className="customizer-heading">
                <span>INTERESTS</span>
                <h2>
                  What sounds good?
                </h2>

                <p>
                  Select as many as you
                  like. Venture will
                  balance them across
                  the outing.
                </p>
              </div>

              <div className="choice-chip-grid">
                {availableInterests.map(
                  (interest) => {
                    const selected =
                      selectedInterests.includes(
                        interest
                      );

                    return (
                      <button
                        className={`builder-choice-chip ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        type="button"
                        key={interest}
                        aria-pressed={
                          selected
                        }
                        onClick={() => {
                          setSelectedInterests(
                            (
                              currentInterests
                            ) =>
                              toggleValue(
                                currentInterests,
                                interest
                              )
                          );

                          setDraftReady(
                            false
                          );
                        }}
                      >
                        {interest}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="customizer-section">
              <div className="customizer-heading">
                <span>BUDGET</span>
                <h2>
                  What is the budget?
                </h2>

                <p>
                  This is the estimated
                  amount per person.
                </p>
              </div>

              <div className="budget-option-grid">
                {budgetOptions.map(
                  (option) => {
                    const selected =
                      budget ===
                      option.value;

                    return (
                      <button
                        className={`budget-option ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        type="button"
                        key={
                          option.value
                        }
                        aria-pressed={
                          selected
                        }
                        onClick={() => {
                          setBudget(
                            option.value
                          );

                          setDraftReady(
                            false
                          );
                        }}
                      >
                        <strong>
                          {option.label}
                        </strong>

                        <small>
                          {
                            option.description
                          }
                        </small>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="customizer-section">
              <div className="customizer-heading">
                <span>AREA</span>
                <h2>
                  Preferred neighbourhoods
                </h2>

                <p>
                  Leave every option
                  unselected to search
                  anywhere in Winnipeg.
                </p>
              </div>

              <div className="choice-chip-grid">
                {availableNeighbourhoods.map(
                  (neighbourhood) => {
                    const selected =
                      selectedNeighbourhoods.includes(
                        neighbourhood
                      );

                    return (
                      <button
                        className={`builder-choice-chip ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        type="button"
                        key={neighbourhood}
                        aria-pressed={
                          selected
                        }
                        onClick={() => {
                          setSelectedNeighbourhoods(
                            (
                              currentNeighbourhoods
                            ) =>
                              toggleValue(
                                currentNeighbourhoods,
                                neighbourhood
                              )
                          );

                          setDraftReady(
                            false
                          );
                        }}
                      >
                        {neighbourhood}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="customizer-section">
              <div className="customizer-heading">
                <span>TRAVEL</span>
                <h2>
                  How are you getting around?
                </h2>
              </div>

              <div className="choice-chip-grid">
                {transportationOptions.map(
                  (option) => (
                    <button
                      className={`builder-choice-chip ${
                        transportation ===
                        option
                          ? "selected"
                          : ""
                      }`}
                      type="button"
                      key={option}
                      aria-pressed={
                        transportation ===
                        option
                      }
                      onClick={() => {
                        setTransportation(
                          option
                        );

                        setDraftReady(
                          false
                        );
                      }}
                    >
                      {option}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="customizer-section">
              <label className="builder-toggle-row">
                <div>
                  <strong>
                    Alcohol-free outing
                  </strong>

                  <small>
                    Avoid plans focused
                    on bars, breweries,
                    or alcohol.
                  </small>
                </div>

                <input
                  type="checkbox"
                  checked={
                    alcoholFree
                  }
                  onChange={(event) => {
                    setAlcoholFree(
                      event.target.checked
                    );

                    setDraftReady(
                      false
                    );
                  }}
                />
              </label>
            </div>
          </section>

          {draftReady &&
          selectedOuting ? (
            <section className="outing-draft-ready">
              <span
                className="outing-draft-icon"
                aria-hidden="true"
              >
                ✓
              </span>

              <div>
                <span>
                  OUTING SETUP READY
                </span>

                <h2>
                  {selectedOuting.title}
                </h2>

                <div className="outing-draft-summary">
                  <p>
                    <strong>
                      When
                    </strong>
                    {outingDate},{" "}
                    {startTime} for{" "}
                    {duration}
                  </p>

                  <p>
                    <strong>
                      Budget
                    </strong>
                    {getBudgetLabel(
                      budget
                    )}{" "}
                    per person
                  </p>

                  <p>
                    <strong>
                      Travel
                    </strong>
                    {transportation}
                  </p>

                  <p>
                    <strong>
                      Area
                    </strong>
                    {selectedNeighbourhoods.length >
                    0
                      ? selectedNeighbourhoods.join(
                          ", "
                        )
                      : "Anywhere in Winnipeg"}
                  </p>

                  <p>
                    <strong>
                      Interests
                    </strong>
                    {selectedInterests.length >
                    0
                      ? selectedInterests.join(
                          ", "
                        )
                      : "Surprise me"}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <div className="build-outing-action builder-final-action">
            <button
              type="button"
              disabled={
                !outingDate ||
                !startTime
              }
              onClick={
                handlePrepareOuting
              }
            >
              Prepare my outing
            </button>

            <small>
              Venture will use this
              setup to match real
              listings in the itinerary
              generator.
            </small>
          </div>
        </>
      )}
    </main>
  );
}