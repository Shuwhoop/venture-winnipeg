"use client";

import {
  useMemo,
  useState
} from "react";
import {
  useRouter
} from "next/navigation";

import type {
  AdminListingEditorData,
  AdminListingUpdateResult,
  AdminPlaceEditorRecord
} from "@/lib/admin/listing-editor-types";

import styles from "./page.module.css";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
] as const;

const STATUS_OPTIONS = [
  "draft",
  "published",
  "cancelled",
  "expired",
  "temporarily_closed",
  "permanently_closed",
  "archived"
];

const VERIFICATION_OPTIONS = [
  "official_source",
  "verified_venture",
  "verified_business",
  "community_reported",
  "unverified"
];

const PLACE_TYPE_OPTIONS = [
  "restaurant",
  "cafe",
  "bakery_dessert",
  "bar_pub",
  "brewery",
  "food_truck",
  "fast_casual",
  "fine_dining",
  "late_night_food",
  "market",
  "event_venue",
  "activity",
  "attraction"
];

function commaList(
  values: string[]
): string {
  return values.join(", ");
}

function toLocalDateTime(
  value: string | null
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() *
        60_000
  );

  return local
    .toISOString()
    .slice(0, 16);
}

function isoFromForm(
  value: FormDataEntryValue | null
): string | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const date = new Date(value);

  return Number.isFinite(
    date.getTime()
  )
    ? date.toISOString()
    : value;
}

function stringValue(
  formData: FormData,
  name: string
): string {
  const value =
    formData.get(name);

  return typeof value === "string"
    ? value
    : "";
}

function nullableNumberValue(
  formData: FormData,
  name: string
): number | null {
  const raw = stringValue(
    formData,
    name
  ).trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function getDayHours(
  record: AdminPlaceEditorRecord,
  day: typeof DAYS[number]
): {
  closed: boolean;
  open: string;
  close: string;
} {
  const raw =
    record.weeklyHours[day];

  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    return {
      closed: false,
      open: "",
      close: ""
    };
  }

  const value = raw as Record<
    string,
    unknown
  >;

  return {
    closed:
      value.closed === true,
    open:
      typeof value.open === "string"
        ? value.open
        : "",
    close:
      typeof value.close === "string"
        ? value.close
        : ""
  };
}

export default function ListingEditorForm({
  data
}: {
  data: AdminListingEditorData;
}) {
  const router = useRouter();
  const {
    record,
    venues
  } = data;

  const [
    saving,
    setSaving
  ] = useState(false);
  const [
    message,
    setMessage
  ] = useState("");
  const [
    sourceCheckedAt,
    setSourceCheckedAt
  ] = useState(
    toLocalDateTime(
      record.sourceCheckedAt ??
        record.source.lastCheckedAt
    )
  );
  const [
    freshnessExpiresAt,
    setFreshnessExpiresAt
  ] = useState(
    toLocalDateTime(
      record.freshnessExpiresAt
    )
  );

  const publicPath = useMemo(
    () => `/listings/${record.slug}`,
    [record.slug]
  );

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setMessage("Saving changes...");

    const form =
      event.currentTarget;
    const formData =
      new FormData(form);

    const shared = {
      slug: stringValue(
        formData,
        "slug"
      ),
      shortDescription:
        stringValue(
          formData,
          "shortDescription"
        ),
      fullDescription:
        stringValue(
          formData,
          "fullDescription"
        ),
      primaryCategory:
        stringValue(
          formData,
          "primaryCategory"
        ),
      secondaryCategories:
        stringValue(
          formData,
          "secondaryCategories"
        ),
      tags: stringValue(
        formData,
        "tags"
      ),
      status: stringValue(
        formData,
        "status"
      ),
      verificationStatus:
        stringValue(
          formData,
          "verificationStatus"
        ),
      warningMessage:
        stringValue(
          formData,
          "warningMessage"
        ),
      sourceUrl: stringValue(
        formData,
        "sourceUrl"
      ),
      sourceCheckedAt:
        isoFromForm(
          formData.get(
            "sourceCheckedAt"
          )
        ),
      freshnessExpiresAt:
        isoFromForm(
          formData.get(
            "freshnessExpiresAt"
          )
        )
    };

    let body:
      Record<string, unknown>;

    if (
      record.entityType ===
      "place"
    ) {
      const weeklyHours:
        Record<string, unknown> = {};

      for (const day of DAYS) {
        const closed =
          formData.get(
            `hours_${day}_closed`
          ) === "on";
        const open =
          stringValue(
            formData,
            `hours_${day}_open`
          );
        const close =
          stringValue(
            formData,
            `hours_${day}_close`
          );

        if (closed) {
          weeklyHours[day] = {
            closed: true
          };
        } else if (
          open ||
          close
        ) {
          weeklyHours[day] = {
            open,
            close
          };
        }
      }

      body = {
        ...shared,
        name: stringValue(
          formData,
          "name"
        ),
        placeType:
          stringValue(
            formData,
            "placeType"
          ),
        addressLine1:
          stringValue(
            formData,
            "addressLine1"
          ),
        addressLine2:
          stringValue(
            formData,
            "addressLine2"
          ),
        city: stringValue(
          formData,
          "city"
        ),
        province:
          stringValue(
            formData,
            "province"
          ),
        postalCode:
          stringValue(
            formData,
            "postalCode"
          ),
        neighbourhood:
          stringValue(
            formData,
            "neighbourhood"
          ),
        latitude:
          nullableNumberValue(
            formData,
            "latitude"
          ),
        longitude:
          nullableNumberValue(
            formData,
            "longitude"
          ),
        officialPhone:
          stringValue(
            formData,
            "officialPhone"
          ),
        officialEmail:
          stringValue(
            formData,
            "officialEmail"
          ),
        officialWebsite:
          stringValue(
            formData,
            "officialWebsite"
          ),
        priceLevel:
          nullableNumberValue(
            formData,
            "priceLevel"
          ),
        cuisinePrimary:
          stringValue(
            formData,
            "cuisinePrimary"
          ),
        weeklyHours,
        openStatus:
          stringValue(
            formData,
            "openStatus"
          ),
        menuUrl:
          stringValue(
            formData,
            "menuUrl"
          ),
        reservationUrl:
          stringValue(
            formData,
            "reservationUrl"
          ),
        accessibilityNotes:
          stringValue(
            formData,
            "accessibilityNotes"
          ),
        parkingNotes:
          stringValue(
            formData,
            "parkingNotes"
          ),
        transitNotes:
          stringValue(
            formData,
            "transitNotes"
          )
      };
    } else {
      body = {
        ...shared,
        title: stringValue(
          formData,
          "title"
        ),
        venueId:
          stringValue(
            formData,
            "venueId"
          ),
        organizerName:
          stringValue(
            formData,
            "organizerName"
          ),
        organizerWebsite:
          stringValue(
            formData,
            "organizerWebsite"
          ),
        startAt: isoFromForm(
          formData.get("startAt")
        ),
        endAt: isoFromForm(
          formData.get("endAt")
        ),
        doorsAt: isoFromForm(
          formData.get("doorsAt")
        ),
        timezone:
          stringValue(
            formData,
            "timezone"
          ),
        priceType:
          stringValue(
            formData,
            "priceType"
          ),
        minimumPriceCad:
          nullableNumberValue(
            formData,
            "minimumPriceCad"
          ),
        maximumPriceCad:
          nullableNumberValue(
            formData,
            "maximumPriceCad"
          ),
        feesIncluded:
          formData.get(
            "feesIncluded"
          ) === "on",
        ticketUrl:
          stringValue(
            formData,
            "ticketUrl"
          ),
        ticketStatus:
          stringValue(
            formData,
            "ticketStatus"
          ),
        ageMinimum:
          nullableNumberValue(
            formData,
            "ageMinimum"
          ),
        ageLabel:
          stringValue(
            formData,
            "ageLabel"
          ),
        indoorOutdoor:
          stringValue(
            formData,
            "indoorOutdoor"
          ),
        accessibilityNotes:
          stringValue(
            formData,
            "accessibilityNotes"
          ),
        parkingNotes:
          stringValue(
            formData,
            "parkingNotes"
          ),
        transitNotes:
          stringValue(
            formData,
            "transitNotes"
          ),
        expiresAt: isoFromForm(
          formData.get("expiresAt")
        )
      };
    }

    try {
      const response = await fetch(
        `/api/admin/listings/${record.entityType}/${record.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify(body)
        }
      );

      const result =
        await response.json() as
          Partial<AdminListingUpdateResult> & {
            error?: string;
          };

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ||
            "Venture could not save the listing."
        );
      }

      setMessage(
        result.message ||
          "Listing changes saved."
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Venture could not save the listing."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <section className={styles.card}>
        <div className={styles.sectionHeading}>
          <div>
            <span>PUBLIC IDENTITY</span>
            <h2>Listing basics</h2>
          </div>
          <a
            href={publicPath}
            target="_blank"
            rel="noreferrer"
          >
            Preview public page
          </a>
        </div>

        <div className={styles.gridTwo}>
          <label>
            {record.entityType === "place"
              ? "Name"
              : "Event title"}
            <input
              name={
                record.entityType === "place"
                  ? "name"
                  : "title"
              }
              defaultValue={
                record.entityType === "place"
                  ? record.name
                  : record.title
              }
              required
            />
          </label>

          <label>
            Slug
            <input
              name="slug"
              defaultValue={record.slug}
              required
            />
          </label>

          {record.entityType === "place" ? (
            <label>
              Place type
              <select
                name="placeType"
                defaultValue={record.placeType}
              >
                {PLACE_TYPE_OPTIONS.map(
                  (option) => (
                    <option
                      value={option}
                      key={option}
                    >
                      {option.replaceAll("_", " ")}
                    </option>
                  )
                )}
              </select>
            </label>
          ) : (
            <label>
              Venue
              <select
                name="venueId"
                defaultValue={record.venueId}
              >
                <option value="">
                  No venue selected
                </option>
                {venues.map((venue) => (
                  <option
                    value={venue.id}
                    key={venue.id}
                  >
                    {venue.name}
                    {venue.neighbourhood
                      ? ` · ${venue.neighbourhood}`
                      : ""}
                    {venue.status !== "published"
                      ? ` · ${venue.status}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Primary category
            <input
              name="primaryCategory"
              defaultValue={record.primaryCategory}
              required
            />
          </label>

          <label>
            Secondary categories
            <input
              name="secondaryCategories"
              defaultValue={commaList(
                record.secondaryCategories
              )}
              placeholder="Brunch, comfort food"
            />
          </label>

          <label>
            Tags
            <input
              name="tags"
              defaultValue={commaList(
                record.tags
              )}
              placeholder="date night, local, budget"
            />
          </label>
        </div>

        <label>
          Short description
          <textarea
            name="shortDescription"
            defaultValue={record.shortDescription}
            rows={3}
            required
          />
        </label>

        <label>
          Full description
          <textarea
            name="fullDescription"
            defaultValue={record.fullDescription}
            rows={6}
          />
        </label>
      </section>

      {record.entityType === "place" ? (
        <>
          <section className={styles.card}>
            <div className={styles.sectionHeading}>
              <div>
                <span>LOCATION</span>
                <h2>Address and map point</h2>
              </div>
            </div>

            <div className={styles.gridTwo}>
              <label>
                Street address
                <input
                  name="addressLine1"
                  defaultValue={record.addressLine1}
                  required
                />
              </label>
              <label>
                Unit or second line
                <input
                  name="addressLine2"
                  defaultValue={record.addressLine2}
                />
              </label>
              <label>
                Neighbourhood
                <input
                  name="neighbourhood"
                  defaultValue={record.neighbourhood}
                  placeholder="Exchange District"
                />
              </label>
              <label>
                Postal code
                <input
                  name="postalCode"
                  defaultValue={record.postalCode}
                />
              </label>
              <label>
                City
                <input
                  name="city"
                  defaultValue={record.city}
                  required
                />
              </label>
              <label>
                Province
                <input
                  name="province"
                  defaultValue={record.province}
                  required
                />
              </label>
              <label>
                Latitude
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  defaultValue={
                    record.latitude ?? ""
                  }
                />
              </label>
              <label>
                Longitude
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  defaultValue={
                    record.longitude ?? ""
                  }
                />
              </label>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeading}>
              <div>
                <span>HOURS AND COST</span>
                <h2>Outing eligibility</h2>
              </div>
            </div>

            <div className={styles.gridTwo}>
              <label>
                Open status
                <select
                  name="openStatus"
                  defaultValue={record.openStatus}
                >
                  <option value="open">Open</option>
                  <option value="temporarily_closed">Temporarily closed</option>
                  <option value="permanently_closed">Permanently closed</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label>
                Price level
                <select
                  name="priceLevel"
                  defaultValue={record.priceLevel ?? ""}
                >
                  <option value="">Unknown</option>
                  <option value="1">$</option>
                  <option value="2">$$</option>
                  <option value="3">$$$</option>
                  <option value="4">$$$$</option>
                </select>
              </label>
              <label>
                Cuisine
                <input
                  name="cuisinePrimary"
                  defaultValue={record.cuisinePrimary}
                />
              </label>
              <label>
                Official website
                <input
                  name="officialWebsite"
                  type="url"
                  defaultValue={record.officialWebsite}
                />
              </label>
              <label>
                Official phone
                <input
                  name="officialPhone"
                  defaultValue={record.officialPhone}
                />
              </label>
              <label>
                Official email
                <input
                  name="officialEmail"
                  type="email"
                  defaultValue={record.officialEmail}
                />
              </label>
              <label>
                Menu URL
                <input
                  name="menuUrl"
                  type="url"
                  defaultValue={record.menuUrl}
                />
              </label>
              <label>
                Reservation URL
                <input
                  name="reservationUrl"
                  type="url"
                  defaultValue={record.reservationUrl}
                />
              </label>
            </div>

            <div className={styles.hoursGrid}>
              {DAYS.map((day) => {
                const hours =
                  getDayHours(
                    record,
                    day
                  );

                return (
                  <fieldset key={day}>
                    <legend>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </legend>
                    <label className={styles.closedToggle}>
                      <input
                        type="checkbox"
                        name={`hours_${day}_closed`}
                        defaultChecked={hours.closed}
                      />
                      Closed
                    </label>
                    <label>
                      Opens
                      <input
                        type="time"
                        name={`hours_${day}_open`}
                        defaultValue={hours.open}
                      />
                    </label>
                    <label>
                      Closes
                      <input
                        type="time"
                        name={`hours_${day}_close`}
                        defaultValue={hours.close}
                      />
                    </label>
                  </fieldset>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <section className={styles.card}>
          <div className={styles.sectionHeading}>
            <div>
              <span>SCHEDULE AND TICKETS</span>
              <h2>Event logistics</h2>
            </div>
          </div>

          <div className={styles.gridTwo}>
            <label>
              Organizer
              <input
                name="organizerName"
                defaultValue={record.organizerName}
                required
              />
            </label>
            <label>
              Organizer website
              <input
                name="organizerWebsite"
                type="url"
                defaultValue={record.organizerWebsite}
              />
            </label>
            <label>
              Starts
              <input
                name="startAt"
                type="datetime-local"
                defaultValue={toLocalDateTime(record.startAt)}
                required
              />
            </label>
            <label>
              Ends
              <input
                name="endAt"
                type="datetime-local"
                defaultValue={toLocalDateTime(record.endAt)}
              />
            </label>
            <label>
              Doors open
              <input
                name="doorsAt"
                type="datetime-local"
                defaultValue={toLocalDateTime(record.doorsAt)}
              />
            </label>
            <label>
              Listing expires
              <input
                name="expiresAt"
                type="datetime-local"
                defaultValue={toLocalDateTime(record.expiresAt)}
                required
              />
            </label>
            <label>
              Timezone
              <input
                name="timezone"
                defaultValue={record.timezone}
                required
              />
            </label>
            <label>
              Price type
              <select
                name="priceType"
                defaultValue={record.priceType}
              >
                <option value="free">Free</option>
                <option value="fixed">Fixed</option>
                <option value="range">Range</option>
                <option value="donation">Donation</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
            <label>
              Minimum price
              <input
                name="minimumPriceCad"
                type="number"
                min="0"
                step="0.01"
                defaultValue={record.minimumPriceCad ?? ""}
              />
            </label>
            <label>
              Maximum price
              <input
                name="maximumPriceCad"
                type="number"
                min="0"
                step="0.01"
                defaultValue={record.maximumPriceCad ?? ""}
              />
            </label>
            <label>
              Ticket URL
              <input
                name="ticketUrl"
                type="url"
                defaultValue={record.ticketUrl}
              />
            </label>
            <label>
              Ticket status
              <input
                name="ticketStatus"
                defaultValue={record.ticketStatus}
              />
            </label>
            <label>
              Minimum age
              <input
                name="ageMinimum"
                type="number"
                min="0"
                defaultValue={record.ageMinimum ?? ""}
              />
            </label>
            <label>
              Age label
              <input
                name="ageLabel"
                defaultValue={record.ageLabel}
              />
            </label>
            <label>
              Indoor or outdoor
              <select
                name="indoorOutdoor"
                defaultValue={record.indoorOutdoor}
              >
                <option value="unknown">Unknown</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="feesIncluded"
                defaultChecked={record.feesIncluded === true}
              />
              Listed prices include fees
            </label>
          </div>
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.sectionHeading}>
          <div>
            <span>TRUST AND FRESHNESS</span>
            <h2>Publishing controls</h2>
          </div>
        </div>

        <div className={styles.gridTwo}>
          <label>
            Listing status
            <select
              name="status"
              defaultValue={record.status}
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  value={option}
                  key={option}
                >
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label>
            Verification status
            <select
              name="verificationStatus"
              defaultValue={record.verificationStatus}
            >
              {VERIFICATION_OPTIONS.map((option) => (
                <option
                  value={option}
                  key={option}
                >
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label>
            Primary source URL
            <input
              name="sourceUrl"
              type="url"
              defaultValue={record.source.sourceUrl}
              placeholder="Official website or event page"
            />
          </label>

          <label>
            Source checked
            <div className={styles.inlineControl}>
              <input
                name="sourceCheckedAt"
                type="datetime-local"
                value={sourceCheckedAt}
                onChange={(event) =>
                  setSourceCheckedAt(
                    event.target.value
                  )
                }
              />
              <button
                type="button"
                onClick={() =>
                  setSourceCheckedAt(
                    toLocalDateTime(
                      new Date().toISOString()
                    )
                  )
                }
              >
                Now
              </button>
            </div>
          </label>

          <label>
            Freshness expires
            <div className={styles.inlineControl}>
              <input
                name="freshnessExpiresAt"
                type="datetime-local"
                value={freshnessExpiresAt}
                onChange={(event) =>
                  setFreshnessExpiresAt(
                    event.target.value
                  )
                }
              />
              <button
                type="button"
                onClick={() => {
                  const date = new Date();
                  date.setDate(
                    date.getDate() + 30
                  );
                  setFreshnessExpiresAt(
                    toLocalDateTime(
                      date.toISOString()
                    )
                  );
                }}
              >
                +30d
              </button>
            </div>
          </label>

          <label>
            Warning shown to users
            <input
              name="warningMessage"
              defaultValue={record.warningMessage}
              placeholder="Only use when important details remain uncertain"
            />
          </label>
        </div>

        <div className={styles.gridTwo}>
          <label>
            Accessibility notes
            <textarea
              name="accessibilityNotes"
              defaultValue={record.accessibilityNotes}
              rows={3}
            />
          </label>
          <label>
            Transit notes
            <textarea
              name="transitNotes"
              defaultValue={record.transitNotes}
              rows={3}
            />
          </label>
          <label>
            Parking notes
            <textarea
              name="parkingNotes"
              defaultValue={record.parkingNotes}
              rows={3}
            />
          </label>
        </div>
      </section>

      <div className={styles.stickyActions}>
        <p role="status">
          {message ||
            "Changes are logged to Venture's audit history."}
        </p>
        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save listing"}
        </button>
      </div>
    </form>
  );
}
