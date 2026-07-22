"use client";

import {
  useMemo,
  useState,
  type FormEvent
} from "react";

import styles from "@/app/explore/explore.module.css";

type RequestType =
  | "restaurant"
  | "event"
  | "bar"
  | "place"
  | "other";

type ExploreMissingListingRequestProps = {
  initialQuery: string;
  initialType?: RequestType;
  compact?: boolean;
};

const requestTypes: {
  value: RequestType;
  label: string;
  icon: string;
}[] = [
  {
    value: "restaurant",
    label: "Restaurant or café",
    icon: "🍽️"
  },
  {
    value: "event",
    label: "Event",
    icon: "🎟️"
  },
  {
    value: "bar",
    label: "Bar or pub",
    icon: "🍸"
  },
  {
    value: "place",
    label: "Other place",
    icon: "📍"
  },
  {
    value: "other",
    label: "Not sure",
    icon: "✨"
  }
];

export function ExploreMissingListingRequest({
  initialQuery,
  initialType = "other",
  compact = false
}: ExploreMissingListingRequestProps) {
  const [
    requestedType,
    setRequestedType
  ] = useState<RequestType>(initialType);

  const [
    query,
    setQuery
  ] = useState(initialQuery);

  const [
    neighbourhood,
    setNeighbourhood
  ] = useState("");

  const [
    details,
    setDetails
  ] = useState("");

  const [
    contactEmail,
    setContactEmail
  ] = useState("");

  const [
    status,
    setStatus
  ] = useState<
    | "idle"
    | "sending"
    | "success"
    | "error"
  >("idle");

  const [
    message,
    setMessage
  ] = useState("");

  const selectedTypeLabel =
    useMemo(
      () =>
        requestTypes.find(
          (option) =>
            option.value === requestedType
        )?.label ?? "Listing",
      [requestedType]
    );

  async function submitRequest(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch(
        "/api/explore/requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            searchQuery: query,
            requestedType,
            neighbourhood,
            details,
            contactEmail,
            sourcePage:
              typeof window !== "undefined"
                ? `${window.location.pathname}${window.location.search}`
                : "/explore",
            website: ""
          })
        }
      );

      const result =
        (await response.json()) as {
          ok?: boolean;
          reference?: string;
          error?: string;
        };

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            "Venture could not save the request."
        );
      }

      setStatus("success");
      setMessage(
        result.reference
          ? `Request sent. Reference ${result.reference}.`
          : "Request sent. Venture will review it."
      );
      setDetails("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Venture could not save the request."
      );
    }
  }

  const form = (
    <form
      className={styles.missingRequestForm}
      onSubmit={submitRequest}
    >
      <div className={styles.missingRequestTypeGrid}>
        {requestTypes.map((option) => (
          <button
            type="button"
            key={option.value}
            className={
              requestedType === option.value
                ? styles.missingRequestTypeActive
                : ""
            }
            aria-pressed={
              requestedType === option.value
            }
            onClick={() =>
              setRequestedType(option.value)
            }
          >
            <span aria-hidden="true">
              {option.icon}
            </span>
            <strong>{option.label}</strong>
          </button>
        ))}
      </div>

      <label className={styles.missingRequestField}>
        <span>What should Venture add?</span>
        <input
          required
          minLength={2}
          maxLength={200}
          value={query}
          placeholder="Name of the restaurant, event, or place"
          onChange={(event) =>
            setQuery(event.target.value)
          }
        />
      </label>

      <label className={styles.missingRequestField}>
        <span>Area or neighbourhood</span>
        <input
          maxLength={120}
          value={neighbourhood}
          placeholder="Example: Downtown or Osborne Village"
          onChange={(event) =>
            setNeighbourhood(event.target.value)
          }
        />
      </label>

      <label className={styles.missingRequestField}>
        <span>Extra details</span>
        <textarea
          maxLength={800}
          value={details}
          placeholder="Website, venue, date, address, or anything that helps us find it"
          onChange={(event) =>
            setDetails(event.target.value)
          }
        />
      </label>

      <label className={styles.missingRequestField}>
        <span>Email for an update, optional</span>
        <input
          type="email"
          maxLength={320}
          value={contactEmail}
          placeholder="you@example.com"
          onChange={(event) =>
            setContactEmail(event.target.value)
          }
        />
      </label>

      <input
        className={styles.missingRequestHoneypot}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <button
        type="submit"
        className={styles.missingRequestSubmit}
        disabled={
          status === "sending" ||
          query.trim().length < 2
        }
      >
        <span aria-hidden="true">＋</span>
        {status === "sending"
          ? "Sending request..."
          : `Request ${selectedTypeLabel}`}
      </button>

      {message ? (
        <p
          className={`${styles.missingRequestMessage} ${
            status === "error"
              ? styles.missingRequestError
              : ""
          }`}
          role={
            status === "error"
              ? "alert"
              : "status"
          }
        >
          {message}
        </p>
      ) : null}

      <p className={styles.missingRequestPrivacy}>
        Requests are reviewed before anything is
        added publicly. Your email is only used to
        follow up about this request.
      </p>
    </form>
  );

  if (compact) {
    return (
      <details className={styles.missingRequestCompact}>
        <summary>
          <span aria-hidden="true">🔎</span>
          <span>
            <strong>Still missing something?</strong>
            <small>
              Request a restaurant, event, bar, or place.
            </small>
          </span>
          <span aria-hidden="true">＋</span>
        </summary>
        {form}
      </details>
    );
  }

  return (
    <section className={styles.missingRequestCard}>
      <header>
        <div aria-hidden="true">📮</div>
        <div>
          <span>HELP VENTURE GROW</span>
          <h2>Tell us what is missing</h2>
          <p>
            Send the restaurant, event, bar, or
            local place you expected to find. It
            goes into the admin review queue and
            can also notify the Venture team by email.
          </p>
        </div>
      </header>
      {form}
    </section>
  );
}
