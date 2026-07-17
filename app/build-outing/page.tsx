"use client";

import {
  useMemo,
  useState
} from "react";

type OutingType = {
  id: string;
  icon: string;
  title: string;
  description: string;
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
      "Several food stops connected into one delicious Winnipeg route."
  },
  {
    id: "nightlife",
    icon: "✦",
    title: "Nightlife",
    description:
      "Music, entertainment, bars, dancing, and late-night destinations."
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
      "Let Venture build something unexpected from what is happening tonight."
  }
];

export default function BuildOutingPage() {
  const [
    selectedType,
    setSelectedType
  ] = useState<string | null>(null);

  const [
    started,
    setStarted
  ] = useState(false);

  const selectedOuting =
    useMemo(
      () =>
        outingTypes.find(
          (outing) =>
            outing.id === selectedType
        ) ?? null,
      [selectedType]
    );

  function handleSelect(
    outingId: string
  ) {
    setSelectedType(
      (current) =>
        current === outingId
          ? null
          : outingId
    );

    setStarted(false);
  }

  function handleContinue() {
    if (!selectedOuting) {
      return;
    }

    setStarted(true);
  }

  return (
    <main className="build-outing-page">
      <section className="build-outing-hero">
        <span className="build-outing-eyebrow">
          VENTURE PLANNER
        </span>

        <h1>
          What kind of outing
          are you feeling?
        </h1>

        <p>
          Choose the mood. Venture will
          use real Winnipeg events,
          places, opening hours, and
          travel time to build the plan.
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
                aria-pressed={selected}
                onClick={() =>
                  handleSelect(
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
                    {outing.description}
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
            Next, Venture will ask about
            your interests, budget,
            timing, neighbourhood, and
            transportation.
          </p>
        </section>
      ) : null}

      {started &&
      selectedOuting ? (
        <section className="outing-next-step">
          <span aria-hidden="true">
            ✦
          </span>

          <div>
            <strong>
              {selectedOuting.title} selected
            </strong>

            <p>
              The outing setup is ready
              for the next step.
            </p>
          </div>
        </section>
      ) : null}

      <div className="build-outing-action">
        <button
          type="button"
          disabled={!selectedOuting}
          onClick={handleContinue}
        >
          Continue building
        </button>

        <small>
          You can change every part of
          the plan before saving it.
        </small>
      </div>
    </main>
  );
}