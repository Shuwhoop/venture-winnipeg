"use client";

import {
  useMemo,
  useRef,
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

import {
  WINNIPEG_NEIGHBOURHOOD_GROUPS,
  WINNIPEG_NEIGHBOURHOODS
} from "@/lib/winnipeg-neighbourhoods";

import { ListingPhotoEditor } from "@/components/admin/listing-photo-editor";

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

type DayName =
  typeof DAYS[number];

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

const PLACE_CATEGORY_OPTIONS = [
  "Activity",
  "Asian Restaurant",
  "Bakery",
  "Bar and Grill Restaurant",
  "Breakfast",
  "Brunch",
  "Burger Restaurant",
  "Cafe",
  "Cocktail Bar",
  "Convention Centre",
  "Diner",
  "Fast Food Restaurant",
  "Fine Dining",
  "Food Hall and Market",
  "Live Music Venue",
  "Mexican",
  "Museum",
  "Nightlife",
  "Noodles Restaurant",
  "Pizza Restaurant",
  "Pub",
  "Restaurant",
  "Sports Bar",
  "Steakhouse",
  "Theme Restaurant"
];

const EVENT_CATEGORY_OPTIONS = [
  "Arts and Culture",
  "Comedy",
  "Community Event",
  "Convention",
  "Festival",
  "Food and Drink",
  "Gaming",
  "Live Music",
  "Market",
  "Nightlife",
  "Sports",
  "Theatre",
  "Workshop"
];

const CUISINE_OPTIONS = [
  "African",
  "American",
  "Asian",
  "Bakery and Desserts",
  "Bar Food",
  "Burgers",
  "Canadian",
  "Caribbean",
  "Chinese",
  "Ethiopian",
  "Filipino",
  "French",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Mediterranean",
  "Mexican",
  "Middle Eastern",
  "Pizza",
  "Seafood",
  "Steakhouse",
  "Thai",
  "Vietnamese"
];

const TICKET_STATUS_OPTIONS = [
  "available",
  "at_door",
  "registration_required",
  "sold_out",
  "cancelled",
  "unknown"
];

const AGE_LABEL_OPTIONS = [
  "All ages",
  "Family-friendly",
  "18+",
  "19+",
  "21+",
  "Unknown"
];

function commaList(
  values: string[]
): string {
  return values.join(", ");
}

function readableOption(
  value: string
): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function slugify(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function shiftLocalDateTime(
  value: string,
  minutes: number
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  date.setMinutes(
    date.getMinutes() + minutes
  );

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() *
        60_000
  );

  return local
    .toISOString()
    .slice(0, 16);
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
  data,
  returnTo
}: {
  data: AdminListingEditorData;
  returnTo: string;
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

  const formRef =
    useRef<HTMLFormElement>(
      null
    );

  const saveActionRef =
    useRef<"publish" | "return" | "stay">(
      "return"
    );

  const defaultQuickHours =
    record.entityType === "place"
      ? getDayHours(
          record,
          "monday"
        )
      : {
          closed: false,
          open: "",
          close: ""
        };

  const [
    quickOpen,
    setQuickOpen
  ] = useState(
    defaultQuickHours.open ||
      "09:00"
  );

  const [
    quickClose,
    setQuickClose
  ] = useState(
    defaultQuickHours.close ||
      "17:00"
  );

  const publicPath = useMemo(
    () => `/listings/${record.slug}`,
    [record.slug]
  );

  function getNamedInput(
    name: string
  ): HTMLInputElement | null {
    const element =
      formRef.current
        ?.elements
        .namedItem(name);

    return element instanceof
      HTMLInputElement
      ? element
      : null;
  }

  function generateSlug() {
    const sourceName =
      getNamedInput(
        record.entityType === "place"
          ? "name"
          : "title"
      )?.value ?? "";
    const slugInput =
      getNamedInput("slug");

    if (!sourceName || !slugInput) {
      setMessage(
        "Add a listing name before generating the slug."
      );
      return;
    }

    slugInput.value =
      slugify(sourceName);
    setMessage(
      "Slug generated. Save changes when ready."
    );
  }

  function setFreshnessDays(
    days: number
  ) {
    const date = new Date();
    date.setDate(
      date.getDate() + days
    );
    setFreshnessExpiresAt(
      toLocalDateTime(
        date.toISOString()
      )
    );
    setMessage(
      `Freshness set for ${days} days. Save changes when ready.`
    );
  }

  function applyEventTimingDefaults() {
    const startInput =
      getNamedInput("startAt");
    const endInput =
      getNamedInput("endAt");
    const doorsInput =
      getNamedInput("doorsAt");
    const expiresInput =
      getNamedInput("expiresAt");

    if (!startInput?.value) {
      setMessage(
        "Choose the event start time first."
      );
      return;
    }

    if (endInput && !endInput.value) {
      endInput.value =
        shiftLocalDateTime(
          startInput.value,
          120
        );
    }

    if (doorsInput && !doorsInput.value) {
      doorsInput.value =
        shiftLocalDateTime(
          startInput.value,
          -60
        );
    }

    if (expiresInput) {
      expiresInput.value =
        shiftLocalDateTime(
          endInput?.value ||
            startInput.value,
          24 * 60
        );
    }

    setMessage(
      "Event timing defaults applied. Review them before saving."
    );
  }

  function getHoursInput(
    day: DayName,
    field:
      "closed" |
      "open" |
      "close"
  ): HTMLInputElement | null {
    const element =
      formRef.current
        ?.elements
        .namedItem(
          `hours_${day}_${field}`
        );

    return element instanceof
      HTMLInputElement
      ? element
      : null;
  }

  function setDayHours(
    day: DayName,
    values: {
      closed: boolean;
      open: string;
      close: string;
    }
  ) {
    const closedInput =
      getHoursInput(
        day,
        "closed"
      );
    const openInput =
      getHoursInput(
        day,
        "open"
      );
    const closeInput =
      getHoursInput(
        day,
        "close"
      );

    if (closedInput) {
      closedInput.checked =
        values.closed;
    }

    if (openInput) {
      openInput.value =
        values.closed
          ? ""
          : values.open;
      openInput.disabled =
        values.closed;
    }

    if (closeInput) {
      closeInput.value =
        values.closed
          ? ""
          : values.close;
      closeInput.disabled =
        values.closed;
    }
  }

  function applyQuickHours(
    days: readonly DayName[],
    label: string
  ) {
    if (
      !quickOpen ||
      !quickClose
    ) {
      setMessage(
        "Choose an opening and closing time first."
      );
      return;
    }

    for (const day of days) {
      setDayHours(
        day,
        {
          closed: false,
          open: quickOpen,
          close: quickClose
        }
      );
    }

    setMessage(
      `${label} updated. Save changes when ready.`
    );
  }

  function copyDayHours(
    sourceDay: DayName,
    targetDays:
      readonly DayName[],
    label: string
  ) {
    const closed =
      getHoursInput(
        sourceDay,
        "closed"
      )?.checked === true;
    const open =
      getHoursInput(
        sourceDay,
        "open"
      )?.value ?? "";
    const close =
      getHoursInput(
        sourceDay,
        "close"
      )?.value ?? "";

    if (
      !closed &&
      !open &&
      !close
    ) {
      setMessage(
        `Add ${sourceDay}'s hours before copying them.`
      );
      return;
    }

    for (const day of targetDays) {
      setDayHours(
        day,
        {
          closed,
          open,
          close
        }
      );
    }

    setMessage(
      `${label} copied. Save changes when ready.`
    );
  }

  function closeDays(
    days: readonly DayName[],
    label: string
  ) {
    for (const day of days) {
      setDayHours(
        day,
        {
          closed: true,
          open: "",
          close: ""
        }
      );
    }

    setMessage(
      `${label} marked closed. Save changes when ready.`
    );
  }

  function clearHours() {
    for (const day of DAYS) {
      setDayHours(
        day,
        {
          closed: false,
          open: "",
          close: ""
        }
      );
    }

    setMessage(
      "All weekly hours cleared. Save changes when ready."
    );
  }

  function handleClosedChange(
    day: DayName,
    closed: boolean
  ) {
    const openInput =
      getHoursInput(
        day,
        "open"
      );
    const closeInput =
      getHoursInput(
        day,
        "close"
      );

    if (openInput) {
      openInput.disabled =
        closed;
    }

    if (closeInput) {
      closeInput.disabled =
        closed;
    }
  }

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setMessage(
      saveActionRef.current === "publish"
        ? "Publishing listing..."
        : "Saving changes..."
    );

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
      status:
        saveActionRef.current === "publish"
          ? "published"
          : stringValue(
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

      if (
        saveActionRef.current === "return" ||
        saveActionRef.current === "publish"
      ) {
        router.push(returnTo);
        return;
      }

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
      ref={formRef}
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
            <div className={styles.inlineControl}>
              <input
                name="slug"
                defaultValue={record.slug}
                required
              />
              <button
                type="button"
                onClick={generateSlug}
              >
                Generate
              </button>
            </div>
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
                      {readableOption(option)}
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
                      ? ` Â· ${venue.neighbourhood}`
                      : ""}
                    {venue.status !== "published"
                      ? ` Â· ${venue.status}`
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
              list="venture-primary-categories"
              defaultValue={record.primaryCategory}
              placeholder="Choose or type a category"
              required
            />
            <datalist id="venture-primary-categories">
              {(record.entityType === "place"
                ? PLACE_CATEGORY_OPTIONS
                : EVENT_CATEGORY_OPTIONS
              ).map((option) => (
                <option
                  value={option}
                  key={option}
                />
              ))}
            </datalist>
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

      <ListingPhotoEditor
        entityType={record.entityType}
        entityId={record.id}
        listingName={
          record.entityType === "place"
            ? record.name
            : record.title
        }
        publicPath={publicPath}
      />

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
                <select
                  name="neighbourhood"
                  defaultValue={record.neighbourhood}
                >
                  <option value="">
                    Choose neighbourhood
                  </option>
                  {record.neighbourhood &&
                  !WINNIPEG_NEIGHBOURHOODS.includes(
                    record.neighbourhood
                  ) ? (
                    <option value={record.neighbourhood}>
                      {record.neighbourhood} Â· current value
                    </option>
                  ) : null}
                  {WINNIPEG_NEIGHBOURHOOD_GROUPS.map(
                    (group) => (
                      <optgroup
                        label={group.label}
                        key={group.label}
                      >
                        {group.options.map(
                          (option) => (
                            <option
                              value={option}
                              key={option}
                            >
                              {option}
                            </option>
                          )
                        )}
                      </optgroup>
                    )
                  )}
                </select>
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
                <select
                  name="city"
                  defaultValue={record.city || "Winnipeg"}
                  required
                >
                  {record.city &&
                  record.city !== "Winnipeg" ? (
                    <option value={record.city}>
                      {record.city} Â· current value
                    </option>
                  ) : null}
                  <option value="Winnipeg">
                    Winnipeg
                  </option>
                </select>
              </label>
              <label>
                Province
                <select
                  name="province"
                  defaultValue={record.province || "Manitoba"}
                  required
                >
                  {record.province &&
                  !["Manitoba", "MB"].includes(
                    record.province
                  ) ? (
                    <option value={record.province}>
                      {record.province} Â· current value
                    </option>
                  ) : null}
                  <option value="Manitoba">
                    Manitoba
                  </option>
                  <option value="MB">
                    MB
                  </option>
                </select>
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
                  list="venture-cuisine-options"
                  defaultValue={record.cuisinePrimary}
                  placeholder="Choose or type a cuisine"
                />
                <datalist id="venture-cuisine-options">
                  {CUISINE_OPTIONS.map(
                    (option) => (
                      <option
                        value={option}
                        key={option}
                      />
                    )
                  )}
                </datalist>
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

            <div className={styles.hoursQuickFill}>
              <div className={styles.quickFillHeading}>
                <div>
                  <span>QUICK HOURS</span>
                  <h3>
                    Set the time once
                  </h3>
                </div>
                <p>
                  Apply one schedule to several days,
                  then adjust only the exceptions.
                </p>
              </div>

              <div className={styles.quickTimeGrid}>
                <label>
                  Opens
                  <input
                    type="time"
                    value={quickOpen}
                    onChange={(event) => {
                      setQuickOpen(
                        event.currentTarget.value
                      );
                    }}
                  />
                </label>

                <label>
                  Closes
                  <input
                    type="time"
                    value={quickClose}
                    onChange={(event) => {
                      setQuickClose(
                        event.currentTarget.value
                      );
                    }}
                  />
                </label>
              </div>

              <div className={styles.quickHourActions}>
                <button
                  type="button"
                  onClick={() => {
                    applyQuickHours(
                      DAYS.slice(0, 5),
                      "Monday to Friday"
                    );
                  }}
                >
                  Apply Monâ€“Fri
                </button>

                <button
                  type="button"
                  onClick={() => {
                    applyQuickHours(
                      DAYS,
                      "Every day"
                    );
                  }}
                >
                  Apply every day
                </button>

                <button
                  type="button"
                  onClick={() => {
                    copyDayHours(
                      "monday",
                      DAYS.slice(1, 5),
                      "Monday's hours"
                    );
                  }}
                >
                  Copy Monday to weekdays
                </button>

                <button
                  type="button"
                  onClick={() => {
                    copyDayHours(
                      "saturday",
                      ["sunday"],
                      "Saturday's hours"
                    );
                  }}
                >
                  Copy Saturday to Sunday
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeDays(
                      [
                        "saturday",
                        "sunday"
                      ],
                      "Weekend"
                    );
                  }}
                >
                  Close weekend
                </button>

                <button
                  type="button"
                  className={styles.quietButton}
                  onClick={clearHours}
                >
                  Clear all hours
                </button>
              </div>
            </div>

            <details className={styles.individualHours}>
              <summary>
                Review or adjust individual days
              </summary>

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
                          onChange={(event) => {
                            handleClosedChange(
                              day,
                              event.currentTarget.checked
                            );
                          }}
                        />
                        Closed
                      </label>
                      <label>
                        Opens
                        <input
                          type="time"
                          name={`hours_${day}_open`}
                          defaultValue={hours.open}
                          disabled={hours.closed}
                        />
                      </label>
                      <label>
                        Closes
                        <input
                          type="time"
                          name={`hours_${day}_close`}
                          defaultValue={hours.close}
                          disabled={hours.closed}
                        />
                      </label>
                    </fieldset>
                  );
                })}
              </div>
            </details>
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

          <div className={styles.quickEditBar}>
            <div>
              <strong>Quick event timing</strong>
              <span>
                Adds a two-hour end time, doors one hour early,
                and expiry the following day when those fields are empty.
              </span>
            </div>
            <button
              type="button"
              onClick={applyEventTimingDefaults}
            >
              Apply timing defaults
            </button>
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
              <select
                name="timezone"
                defaultValue={
                  record.timezone ||
                  "America/Winnipeg"
                }
                required
              >
                {record.timezone &&
                record.timezone !== "America/Winnipeg" ? (
                  <option value={record.timezone}>
                    {record.timezone} Â· current value
                  </option>
                ) : null}
                <option value="America/Winnipeg">
                  America/Winnipeg
                </option>
              </select>
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
              <select
                name="ticketStatus"
                defaultValue={record.ticketStatus || "unknown"}
              >
                {record.ticketStatus &&
                !TICKET_STATUS_OPTIONS.includes(
                  record.ticketStatus
                ) ? (
                  <option value={record.ticketStatus}>
                    {record.ticketStatus} Â· current value
                  </option>
                ) : null}
                {TICKET_STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      value={option}
                      key={option}
                    >
                      {readableOption(option)}
                    </option>
                  )
                )}
              </select>
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
              <select
                name="ageLabel"
                defaultValue={record.ageLabel || "Unknown"}
              >
                {record.ageLabel &&
                !AGE_LABEL_OPTIONS.includes(
                  record.ageLabel
                ) ? (
                  <option value={record.ageLabel}>
                    {record.ageLabel} Â· current value
                  </option>
                ) : null}
                {AGE_LABEL_OPTIONS.map(
                  (option) => (
                    <option
                      value={option}
                      key={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
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
                  {readableOption(option)}
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
                  {readableOption(option)}
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
            <div className={styles.inlineControlWide}>
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
              <div className={styles.inlineButtonGroup}>
                {[7, 30, 90].map((days) => (
                  <button
                    type="button"
                    key={days}
                    onClick={() =>
                      setFreshnessDays(days)
                    }
                  >
                    +{days}d
                  </button>
                ))}
              </div>
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
        <div className={styles.saveActions}>
          <button
            type="button"
            className={styles.publishAction}
            disabled={saving}
            onClick={() => {
              saveActionRef.current =
                "publish";
              formRef.current?.requestSubmit();
            }}
          >
            {saving &&
            saveActionRef.current === "publish"
              ? "Publishing..."
              : "Publish and return"}
          </button>
          <button
            type="submit"
            className={styles.secondarySave}
            disabled={saving}
            onClick={() => {
              saveActionRef.current =
                "return";
            }}
          >
            {saving &&
            saveActionRef.current === "return"
              ? "Saving..."
              : "Save and return"}
          </button>
          <button
            type="submit"
            className={styles.secondarySave}
            disabled={saving}
            onClick={() => {
              saveActionRef.current =
                "stay";
            }}
          >
            {saving &&
            saveActionRef.current === "stay"
              ? "Saving..."
              : "Save and keep editing"}
          </button>
        </div>
      </div>
    </form>
  );
}

