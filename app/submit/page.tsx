"use client";

import {
  FormEvent,
  useMemo,
  useState
} from "react";

import styles from "./page.module.css";


type SubmissionType =
  | "restaurant"
  | "event";

type FormStatus =
  | "idle"
  | "submitting"
  | "success"
  | "error";


const initialRestaurant = {
  name: "",
  addressLine1: "",
  neighbourhood: "",
  category: "",
  cuisine: "",
  website: "",
  phone: "",
  description: ""
};


const initialEvent = {
  title: "",
  description: "",
  category: "",
  organizerName: "",
  organizerWebsite: "",
  venueName: "",
  venueAddress: "",
  neighbourhood: "",
  startAt: "",
  endAt: "",
  ticketUrl: "",
  minimumPriceCad: "",
  maximumPriceCad: "",
  ageLabel: "",
  accessibilityNotes: ""
};


export default function SubmitListingPage() {
  const [
    submissionType,
    setSubmissionType
  ] =
    useState<SubmissionType>(
      "restaurant"
    );

  const [
    status,
    setStatus
  ] =
    useState<FormStatus>(
      "idle"
    );

  const [
    message,
    setMessage
  ] =
    useState("");

  const [
    submitterName,
    setSubmitterName
  ] =
    useState("");

  const [
    submitterEmail,
    setSubmitterEmail
  ] =
    useState("");

  const [
    submitterPhone,
    setSubmitterPhone
  ] =
    useState("");

  const [
    organizationName,
    setOrganizationName
  ] =
    useState("");

  const [
    relationship,
    setRelationship
  ] =
    useState(
      "community_member"
    );

  const [
    sourceUrl,
    setSourceUrl
  ] =
    useState("");

  const [
    notes,
    setNotes
  ] =
    useState("");

  const [
    consentToContact,
    setConsentToContact
  ] =
    useState(false);

  const [
    termsAccepted,
    setTermsAccepted
  ] =
    useState(false);

  const [
    website,
    setWebsite
  ] =
    useState("");

  const [
    restaurant,
    setRestaurant
  ] =
    useState(
      initialRestaurant
    );

  const [
    event,
    setEvent
  ] =
    useState(
      initialEvent
    );

  const heading =
    useMemo(
      () =>
        submissionType ===
        "restaurant"
          ? "Share a restaurant"
          : "Share an event",
      [
        submissionType
      ]
    );

  function updateRestaurant(
    key:
      keyof typeof initialRestaurant,
    value: string
  ) {
    setRestaurant(
      (current) => ({
        ...current,
        [key]:
          value
      })
    );
  }

  function updateEvent(
    key:
      keyof typeof initialEvent,
    value: string
  ) {
    setEvent(
      (current) => ({
        ...current,
        [key]:
          value
      })
    );
  }

  function resetForm() {
    setSubmitterName("");
    setSubmitterEmail("");
    setSubmitterPhone("");
    setOrganizationName("");
    setRelationship(
      "community_member"
    );
    setSourceUrl("");
    setNotes("");
    setConsentToContact(false);
    setTermsAccepted(false);
    setWebsite("");
    setRestaurant(
      initialRestaurant
    );
    setEvent(
      initialEvent
    );
  }

  async function handleSubmit(
    browserEvent:
      FormEvent<HTMLFormElement>
  ) {
    browserEvent.preventDefault();

    if (status === "submitting") {
      return;
    }

    setStatus("submitting");
    setMessage(
      "Sending your submission to Venture..."
    );

    const payload =
      submissionType ===
      "restaurant"
        ? restaurant
        : {
            ...event,
            timezone:
              "America/Winnipeg"
          };

    try {
      const response =
        await fetch(
          "/api/submissions",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                submissionType,
                submitterName,
                submitterEmail,
                submitterPhone,
                organizationName,
                submitterRelationship:
                  relationship,
                sourceUrl,
                submitterNotes:
                  notes,
                consentToContact,
                termsAccepted,
                website,
                payload
              })
          }
        );

      const result =
        await response.json() as {
          ok?: boolean;
          reference?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ||
          "Venture could not receive the submission."
        );
      }

      setStatus("success");
      setMessage(
        `Thanks. Your submission is waiting for review${
          result.reference
            ? ` under reference ${result.reference}.`
            : "."
        }`
      );

      resetForm();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Venture could not receive the submission."
      );
    }
  }

  return (
    <main
      className={
        styles.page
      }
    >
      <header
        className={
          styles.hero
        }
      >
        <span>
          HELP MAP WINNIPEG
        </span>

        <h1>
          Add something worth
          discovering.
        </h1>

        <p>
          Send Venture a restaurant or
          event. Every submission waits
          for review before it can appear
          publicly.
        </p>
      </header>

      <section
        className={
          styles.typeChooser
        }
        aria-label="Submission type"
      >
        <button
          className={
            submissionType ===
            "restaurant"
              ? styles.active
              : ""
          }
          type="button"
          onClick={() => {
            setSubmissionType(
              "restaurant"
            );
            setMessage("");
            setStatus("idle");
          }}
        >
          <span aria-hidden="true">
            🍽
          </span>

          <strong>
            Restaurant
          </strong>

          <small>
            Restaurant, café, bakery,
            bar, food truck, or market
          </small>
        </button>

        <button
          className={
            submissionType ===
            "event"
              ? styles.active
              : ""
          }
          type="button"
          onClick={() => {
            setSubmissionType(
              "event"
            );
            setMessage("");
            setStatus("idle");
          }}
        >
          <span aria-hidden="true">
            🎟
          </span>

          <strong>
            Event
          </strong>

          <small>
            Concert, festival, market,
            comedy, sports, arts, or
            community event
          </small>
        </button>
      </section>

      <form
        className={
          styles.form
        }
        onSubmit={
          handleSubmit
        }
      >
        <section
          className={
            styles.section
          }
        >
          <div
            className={
              styles.sectionHeading
            }
          >
            <span>
              LISTING DETAILS
            </span>

            <h2>
              {heading}
            </h2>
          </div>

          {submissionType ===
          "restaurant" ? (
            <div
              className={
                styles.grid
              }
            >
              <label>
                <span>
                  Business name
                </span>

                <input
                  required
                  maxLength={
                    200
                  }
                  value={
                    restaurant.name
                  }
                  onChange={
                    (inputEvent) =>
                      updateRestaurant(
                        "name",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Street address
                </span>

                <input
                  required
                  maxLength={
                    250
                  }
                  placeholder="Example: 123 Main Street"
                  value={
                    restaurant
                      .addressLine1
                  }
                  onChange={
                    (inputEvent) =>
                      updateRestaurant(
                        "addressLine1",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Neighbourhood
                </span>

                <input
                  maxLength={
                    120
                  }
                  placeholder="Optional"
                  value={
                    restaurant
                      .neighbourhood
                  }
                  onChange={
                    (inputEvent) =>
                      updateRestaurant(
                        "neighbourhood",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Category
                </span>

                <input
                  required
                  maxLength={
                    120
                  }
                  placeholder="Restaurant, café, bakery..."
                  value={
                    restaurant.category
                  }
                  onChange={
                    (inputEvent) =>
                      updateRestaurant(
                        "category",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Cuisine
                </span>

                <input
                  maxLength={
                    120
                  }
                  placeholder="Optional"
                  value={
                    restaurant.cuisine
                  }
                  onChange={
                    (inputEvent) =>
                      updateRestaurant(
                        "cuisine",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Phone
                </span>

                <input
                  maxLength={
                    80
                  }
                  placeholder="Optional"
                  value={
                    restaurant.phone
                  }
                  onChange={
                    (inputEvent) =>
                      updateRestaurant(
                        "phone",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label
                className={
                  styles.wide
                }
              >
                <span>
                  Official website
                </span>

                <input
                  type="url"
                  maxLength={
                    500
                  }
                  placeholder="https://..."
                  value={
                    restaurant.website
                  }
                  onChange={
                    (inputEvent) =>
                      updateRestaurant(
                        "website",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label
                className={
                  styles.wide
                }
              >
                <span>
                  What should people know?
                </span>

                <textarea
                  required
                  rows={
                    5
                  }
                  maxLength={
                    1500
                  }
                  placeholder="Describe the food, atmosphere, or why this place belongs on Venture."
                  value={
                    restaurant.description
                  }
                  onChange={
                    (inputEvent) =>
                      updateRestaurant(
                        "description",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>
            </div>
          ) : (
            <div
              className={
                styles.grid
              }
            >
              <label>
                <span>
                  Event title
                </span>

                <input
                  required
                  maxLength={
                    200
                  }
                  value={
                    event.title
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "title",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Category
                </span>

                <input
                  required
                  maxLength={
                    120
                  }
                  placeholder="Music, comedy, market..."
                  value={
                    event.category
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "category",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Organizer
                </span>

                <input
                  required
                  maxLength={
                    200
                  }
                  value={
                    event.organizerName
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "organizerName",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Organizer website
                </span>

                <input
                  type="url"
                  maxLength={
                    500
                  }
                  placeholder="Optional"
                  value={
                    event
                      .organizerWebsite
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "organizerWebsite",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Venue
                </span>

                <input
                  required
                  maxLength={
                    200
                  }
                  value={
                    event.venueName
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "venueName",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Venue address
                </span>

                <input
                  required
                  maxLength={
                    250
                  }
                  value={
                    event.venueAddress
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "venueAddress",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Neighbourhood
                </span>

                <input
                  maxLength={
                    120
                  }
                  placeholder="Optional"
                  value={
                    event.neighbourhood
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "neighbourhood",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Age information
                </span>

                <input
                  maxLength={
                    80
                  }
                  placeholder="All ages, 18+, family..."
                  value={
                    event.ageLabel
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "ageLabel",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Starts
                </span>

                <input
                  required
                  type="datetime-local"
                  value={
                    event.startAt
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "startAt",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Ends
                </span>

                <input
                  type="datetime-local"
                  value={
                    event.endAt
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "endAt",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Minimum price
                </span>

                <input
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  type="number"
                  placeholder="0 for free"
                  value={
                    event
                      .minimumPriceCad
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "minimumPriceCad",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                <span>
                  Maximum price
                </span>

                <input
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  type="number"
                  placeholder="Optional"
                  value={
                    event
                      .maximumPriceCad
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "maximumPriceCad",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label
                className={
                  styles.wide
                }
              >
                <span>
                  Official or ticket link
                </span>

                <input
                  required
                  type="url"
                  maxLength={
                    500
                  }
                  placeholder="https://..."
                  value={
                    event.ticketUrl
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "ticketUrl",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label
                className={
                  styles.wide
                }
              >
                <span>
                  Event description
                </span>

                <textarea
                  required
                  rows={
                    5
                  }
                  maxLength={
                    2000
                  }
                  value={
                    event.description
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "description",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label
                className={
                  styles.wide
                }
              >
                <span>
                  Accessibility information
                </span>

                <textarea
                  rows={
                    3
                  }
                  maxLength={
                    1000
                  }
                  placeholder="Optional"
                  value={
                    event
                      .accessibilityNotes
                  }
                  onChange={
                    (inputEvent) =>
                      updateEvent(
                        "accessibilityNotes",
                        inputEvent
                          .target
                          .value
                      )
                  }
                />
              </label>
            </div>
          )}
        </section>

        <section
          className={
            styles.section
          }
        >
          <div
            className={
              styles.sectionHeading
            }
          >
            <span>
              ABOUT YOU
            </span>

            <h2>
              Who is submitting this?
            </h2>
          </div>

          <div
            className={
              styles.grid
            }
          >
            <label>
              <span>
                Your name
              </span>

              <input
                required
                maxLength={
                  150
                }
                value={
                  submitterName
                }
                onChange={
                  (inputEvent) =>
                    setSubmitterName(
                      inputEvent
                        .target
                        .value
                    )
                }
              />
            </label>

            <label>
              <span>
                Email
              </span>

              <input
                required
                type="email"
                maxLength={
                  320
                }
                value={
                  submitterEmail
                }
                onChange={
                  (inputEvent) =>
                    setSubmitterEmail(
                      inputEvent
                        .target
                        .value
                    )
                }
              />
            </label>

            <label>
              <span>
                Phone
              </span>

              <input
                maxLength={
                  80
                }
                placeholder="Optional"
                value={
                  submitterPhone
                }
                onChange={
                  (inputEvent) =>
                    setSubmitterPhone(
                      inputEvent
                        .target
                        .value
                    )
                }
              />
            </label>

            <label>
              <span>
                Organization
              </span>

              <input
                maxLength={
                  200
                }
                placeholder="Optional"
                value={
                  organizationName
                }
                onChange={
                  (inputEvent) =>
                    setOrganizationName(
                      inputEvent
                        .target
                        .value
                    )
                }
              />
            </label>

            <label>
              <span>
                Your relationship
              </span>

              <select
                value={
                  relationship
                }
                onChange={
                  (inputEvent) =>
                    setRelationship(
                      inputEvent
                        .target
                        .value
                    )
                }
              >
                <option
                  value="community_member"
                >
                  Community recommendation
                </option>

                <option value="owner">
                  Owner
                </option>

                <option value="employee">
                  Employee
                </option>

                <option value="organizer">
                  Event organizer
                </option>

                <option value="representative">
                  Authorized representative
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </label>

            <label>
              <span>
                Supporting source
              </span>

              <input
                type="url"
                maxLength={
                  500
                }
                placeholder="Official page, social post, or announcement"
                value={
                  sourceUrl
                }
                onChange={
                  (inputEvent) =>
                    setSourceUrl(
                      inputEvent
                        .target
                        .value
                    )
                }
              />
            </label>

            <label
              className={
                styles.wide
              }
            >
              <span>
                Notes for Venture
              </span>

              <textarea
                rows={
                  3
                }
                maxLength={
                  1000
                }
                placeholder="Optional context for the reviewer"
                value={
                  notes
                }
                onChange={
                  (inputEvent) =>
                    setNotes(
                      inputEvent
                        .target
                        .value
                    )
                }
              />
            </label>

            <label
              className={
                styles.honeypot
              }
              aria-hidden="true"
            >
              Website
              <input
                tabIndex={
                  -1
                }
                autoComplete="off"
                value={
                  website
                }
                onChange={
                  (inputEvent) =>
                    setWebsite(
                      inputEvent
                        .target
                        .value
                    )
                }
              />
            </label>
          </div>

          <div
            className={
              styles.checks
            }
          >
            <label>
              <input
                type="checkbox"
                checked={
                  consentToContact
                }
                onChange={
                  (inputEvent) =>
                    setConsentToContact(
                      inputEvent
                        .target
                        .checked
                    )
                }
              />

              <span>
                Venture may contact me
                about this submission.
              </span>
            </label>

            <label>
              <input
                required
                type="checkbox"
                checked={
                  termsAccepted
                }
                onChange={
                  (inputEvent) =>
                    setTermsAccepted(
                      inputEvent
                        .target
                        .checked
                    )
                }
              />

              <span>
                I confirm that the
                information is accurate
                to the best of my
                knowledge and may be
                reviewed before
                publication.
              </span>
            </label>
          </div>
        </section>

        <button
          className={
            styles.submitButton
          }
          disabled={
            status ===
            "submitting"
          }
          type="submit"
        >
          {status ===
          "submitting"
            ? "Sending..."
            : "Send for review"}
        </button>

        {message ? (
          <p
            className={`${styles.message} ${
              status ===
              "success"
                ? styles.success
                : status ===
                    "error"
                  ? styles.error
                  : ""
            }`}
            role="status"
          >
            {message}
          </p>
        ) : null}
      </form>
    </main>
  );
}
