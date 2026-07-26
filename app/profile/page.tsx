"use client";


import NewsletterSignup from "@/components/newsletter-signup/newsletter-signup";
import { AppStatusCard } from "@/components/app-foundation/app-foundation";
import { AccountSyncCard } from "@/components/account-sync/account-sync";
import { VisitHistoryDashboard } from "@/components/visit-history-dashboard";
import NeighbourhoodPicker from "@/components/neighbourhood-picker";

import {
  useEffect,
  useState
} from "react";

import {
  defaultPreferences,
  loadPreferences,
  savePreferences,
  type VenturePreferences
} from "@/lib/profile-preferences";


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
      "Reset your Venture preferences on this device? Saved listings and outings will stay."
    );

    if (!confirmed) {
      return;
    }

    const resetPreferences = {
      ...defaultPreferences,
      updatedAt: new Date().toISOString()
    };

    savePreferences(resetPreferences);
    setPreferences(resetPreferences);
    setStatusMessage(
      "Preferences were reset and are ready to sync."
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
          Winnipeg · Guest-friendly discovery
          with optional account sync
        </p>
      </section>

      <AccountSyncCard />

      <VisitHistoryDashboard />

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
              Interested in The Thursday
              Venture
            </strong>

            <small>
              Keep this preference alongside
              the newsletter signup below.
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
            Reset preferences
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
    
      <AppStatusCard />
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