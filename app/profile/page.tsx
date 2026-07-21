"use client";


import NewsletterSignup from "@/components/newsletter-signup/newsletter-signup";
import NeighbourhoodPicker from "@/components/neighbourhood-picker";

import {
  useEffect,
  useState
} from "react";

import {
  clearPreferences,
  defaultPreferences,
  loadPreferences,
  savePreferences,
  type VenturePreferences
} from "@/lib/profile-preferences";

import {
  SAVED_LISTINGS_EVENT,
  SAVED_LISTINGS_STORAGE_KEY
} from "@/lib/saved-listings";

const interestOptions = [
  "Food",
  "Live music",
  "Comedy",
  "Sports",
  "Markets",
  "Arts",
  "Gaming",
  "Nightlife",
  "Outdoor activities"
];

const outingStyleOptions = [
  "Date nights",
  "Student-friendly",
  "Solo outings",
  "Friends",
  "Family plans",
  "Last-minute plans"
];

type ListPreferenceField =
  | "interests"
  | "neighbourhoods"
  | "outingStyles";

export default function ProfilePage() {
  const [
    preferences,
    setPreferences
  ] = useState<VenturePreferences>(
    defaultPreferences
  );

  const [
    loaded,
    setLoaded
  ] = useState(false);

  const [
    statusMessage,
    setStatusMessage
  ] = useState("");

  useEffect(() => {
    setPreferences(loadPreferences());
    setLoaded(true);
  }, []);

  function togglePreference(
    field: ListPreferenceField,
    value: string
  ) {
    setPreferences((current) => {
      const currentValues =
        current[field];

      const nextValues =
        currentValues.includes(value)
          ? currentValues.filter(
              (item) => item !== value
            )
          : [...currentValues, value];

      return {
        ...current,
        [field]: nextValues
      };
    });

    setStatusMessage("");
  }

  function handleSave() {
    const updatedPreferences = {
      ...preferences,
      displayName:
        preferences.displayName.trim() ||
        "Guest",
      updatedAt: new Date().toISOString()
    };

    savePreferences(updatedPreferences);
    setPreferences(updatedPreferences);
    setStatusMessage(
      "Preferences saved on this device."
    );

    window.setTimeout(() => {
      setStatusMessage("");
    }, 2500);
  }

  function handleClear() {
    const confirmed = window.confirm(
      "Clear your Venture preferences and saved listings from this browser?"
    );

    if (!confirmed) {
      return;
    }

    clearPreferences();

    window.localStorage.removeItem(
      SAVED_LISTINGS_STORAGE_KEY
    );

    window.dispatchEvent(
      new CustomEvent(
        SAVED_LISTINGS_EVENT
      )
    );

    setPreferences(
      defaultPreferences
    );

    setStatusMessage(
      "Local Venture data was cleared."
    );
  }

  if (!loaded) {
    return (
      <section className="empty-state">
        <div>◉</div>
        <h1>Loading profile</h1>
      </section>
    );
  }

  const initials =
    preferences.displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("") || "V";

  return (
    <>
      <section className="profile-card">
        <div>{initials}</div>

        <span>VENTURE PROFILE</span>

        <h1>
          {preferences.displayName ||
            "Guest"}
        </h1>

        <p>
          Winnipeg · Preferences stored
          only in this browser
        </p>
      </section>

      <section className="preferences-panel">
        <div className="preference-heading">
          <span>PERSONALIZATION</span>
          <h2>Your Venture preferences</h2>

          <p>
            These settings will later help
            rank events, food spots, and
            outing ideas.
          </p>
        </div>

        <label className="profile-field">
          Display name

          <input
            value={preferences.displayName}
            maxLength={40}
            onChange={(event) => {
              setPreferences((current) => ({
                ...current,
                displayName:
                  event.target.value
              }));

              setStatusMessage("");
            }}
          />
        </label>

        <PreferenceGroup
          title="Interests"
          description="Choose the things you usually want to discover."
          options={interestOptions}
          selected={preferences.interests}
          onToggle={(value) =>
            togglePreference(
              "interests",
              value
            )
          }
        />

        <fieldset className="preference-group">
          <legend>
            Preferred neighbourhoods
          </legend>

          <p>
            Venture can prioritize these areas
            when more listings are available.
            Leave everything blank for anywhere
            in Winnipeg.
          </p>

          <NeighbourhoodPicker
            selected={
              preferences.neighbourhoods
            }
            onToggle={(value) =>
              togglePreference(
                "neighbourhoods",
                value
              )
            }
          />
        </fieldset>

        <PreferenceGroup
          title="Outing styles"
          description="Select the kinds of plans you often make."
          options={outingStyleOptions}
          selected={
            preferences.outingStyles
          }
          onToggle={(value) =>
            togglePreference(
              "outingStyles",
              value
            )
          }
        />

        <label className="profile-field">
          Typical budget

          <select
            value={preferences.budget}
            onChange={(event) => {
              setPreferences((current) => ({
                ...current,
                budget:
                  event.target
                    .value as VenturePreferences["budget"]
              }));

              setStatusMessage("");
            }}
          >
            <option value="free">
              Mostly free
            </option>

            <option value="under-40">
              Usually under $40
            </option>

            <option value="under-80">
              Usually under $80 for two
            </option>

            <option value="flexible">
              Flexible
            </option>
          </select>
        </label>

        <label className="preference-toggle">
          <input
            type="checkbox"
            checked={
              preferences.alcoholFree
            }
            onChange={(event) => {
              setPreferences((current) => ({
                ...current,
                alcoholFree:
                  event.target.checked
              }));

              setStatusMessage("");
            }}
          />

          <span>
            <strong>
              Prefer alcohol-free options
            </strong>

            <small>
              Prioritize plans that do not
              depend on drinking.
            </small>
          </span>
        </label>

        <label className="preference-toggle">
          <input
            type="checkbox"
            checked={
              preferences
                .newsletterInterested
            }
            onChange={(event) => {
              setPreferences((current) => ({
                ...current,
                newsletterInterested:
                  event.target.checked
              }));

              setStatusMessage("");
            }}
          />

          <span>
            <strong>
              Interested in Venture This
              Weekend
            </strong>

            <small>
              This records your preference
              only. Email signup is coming
              later.
            </small>
          </span>
        </label>

        <div className="profile-actions">
          <button
            className="primary"
            type="button"
            onClick={handleSave}
          >
            Save preferences
          </button>

          <button
            className="danger"
            type="button"
            onClick={handleClear}
          >
            Clear local data
          </button>
        </div>

        {statusMessage ? (
          <p
            className="profile-status"
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}
      </section>
    
      <NewsletterSignup placement="profile" />
    </>
  );
}

type PreferenceGroupProps = {
  title: string;
  description: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
};

function PreferenceGroup({
  title,
  description,
  options,
  selected,
  onToggle
}: PreferenceGroupProps) {
  return (
    <fieldset className="preference-group">
      <legend>{title}</legend>

      <p>{description}</p>

      <div className="preference-options">
        {options.map((option) => {
          const active =
            selected.includes(option);

          return (
            <button
              className={
                active ? "selected" : ""
              }
              type="button"
              key={option}
              aria-pressed={active}
              onClick={() =>
                onToggle(option)
              }
            >
              {active ? "✓ " : ""}
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}