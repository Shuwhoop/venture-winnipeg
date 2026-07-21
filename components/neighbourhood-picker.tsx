"use client";

import {
  useId,
  useMemo,
  useState
} from "react";

import {
  findWinnipegNeighbourhood,
  POPULAR_WINNIPEG_NEIGHBOURHOODS,
  WINNIPEG_NEIGHBOURHOOD_GROUPS,
  WINNIPEG_NEIGHBOURHOODS
} from "@/lib/winnipeg-neighbourhoods";

type NeighbourhoodPickerProps = {
  selected: string[];
  onToggle: (value: string) => void;
  compact?: boolean;
};

export default function NeighbourhoodPicker({
  selected,
  onToggle,
  compact = false
}: NeighbourhoodPickerProps) {
  const inputId = useId();
  const listId = `${inputId}-options`;

  const [query, setQuery] =
    useState("");
  const [message, setMessage] =
    useState("");

  const selectedSet = useMemo(
    () => new Set(selected),
    [selected]
  );

  const selectedOutsidePopular =
    selected.filter(
      (value) =>
        !POPULAR_WINNIPEG_NEIGHBOURHOODS.includes(
          value as
            typeof POPULAR_WINNIPEG_NEIGHBOURHOODS[number]
        )
    );

  function addQuery() {
    const match =
      findWinnipegNeighbourhood(query);

    if (!match) {
      setMessage(
        "Choose a Winnipeg neighbourhood from the suggestions."
      );
      return;
    }

    if (!selectedSet.has(match)) {
      onToggle(match);
    }

    setQuery("");
    setMessage("");
  }

  function renderButton(
    option: string,
    className = ""
  ) {
    const active =
      selectedSet.has(option);

    return (
      <button
        type="button"
        key={option}
        className={`${className} ${
          active ? "selected" : ""
        }`.trim()}
        aria-pressed={active}
        onClick={() => {
          onToggle(option);
          setMessage("");
        }}
      >
        <span aria-hidden="true">
          {active ? "✓" : "●"}
        </span>
        <strong>{option}</strong>
      </button>
    );
  }

  return (
    <div
      className={`neighbourhood-picker ${
        compact
          ? "neighbourhood-picker-compact"
          : ""
      }`}
    >
      <div className="neighbourhood-popular-grid">
        {POPULAR_WINNIPEG_NEIGHBOURHOODS.map(
          (option) =>
            renderButton(option)
        )}
      </div>

      <div className="neighbourhood-search-row">
        <label htmlFor={inputId}>
          Search another Winnipeg area
          <input
            id={inputId}
            list={listId}
            value={query}
            placeholder="Example: Bridgwater Forest"
            onChange={(event) => {
              setQuery(
                event.currentTarget.value
              );
              setMessage("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addQuery();
              }
            }}
          />
        </label>

        <button
          type="button"
          onClick={addQuery}
        >
          Add
        </button>

        <datalist id={listId}>
          {WINNIPEG_NEIGHBOURHOODS.map(
            (option) => (
              <option
                value={option}
                key={option}
              />
            )
          )}
        </datalist>
      </div>

      {message ? (
        <p
          className="neighbourhood-picker-message"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {selectedOutsidePopular.length > 0 ? (
        <div className="neighbourhood-selected-list">
          <span>Also selected</span>
          <div>
            {selectedOutsidePopular.map(
              (option) =>
                renderButton(
                  option,
                  "neighbourhood-selected-chip"
                )
            )}
          </div>
        </div>
      ) : null}

      <details className="neighbourhood-all-list">
        <summary>
          Browse all Winnipeg neighbourhoods
        </summary>

        <div className="neighbourhood-group-list">
          {WINNIPEG_NEIGHBOURHOOD_GROUPS.map(
            (group) => (
              <section key={group.label}>
                <h4>{group.label}</h4>
                <div>
                  {group.options.map(
                    (option) =>
                      renderButton(option)
                  )}
                </div>
              </section>
            )
          )}
        </div>
      </details>
    </div>
  );
}
