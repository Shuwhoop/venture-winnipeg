"use client";

import {
  FormEvent,
  useMemo,
  useState
} from "react";
import {
  useRouter
} from "next/navigation";

import {
  ListingPhotoUpload
} from "@/components/listing-photo-upload/listing-photo-upload";

import styles from "./page.module.css";

type ListingOption = {
  id: string;
  entityType:
    | "place"
    | "event";
  name: string;
  slug: string;
  status: string;
  meta: string;
  currentImageUrl: string | null;
};

type RecentMedia = {
  id: string;
  entity_type:
    | "place"
    | "event";
  entity_id: string;
  public_url: string;
  alt_text: string;
  caption: string | null;
  rights_basis: string;
  is_primary: boolean;
  created_at: string;
  listingName: string;
};

const rightsOptions = [
  [
    "venture_owned",
    "Taken or created by Venture"
  ],
  [
    "business_permission",
    "Restaurant or business permission"
  ],
  [
    "organizer_permission",
    "Event organizer permission"
  ],
  [
    "submitter_owned",
    "Outside submitter owns it"
  ],
  [
    "licensed",
    "Licensed for Venture's use"
  ],
  [
    "public_domain",
    "Public domain"
  ]
] as const;

export default function PhotoPortal({
  listings,
  recentMedia
}: {
  listings: ListingOption[];
  recentMedia: RecentMedia[];
}) {
  const router = useRouter();

  const [
    entityType,
    setEntityType
  ] = useState<
    "place" | "event"
  >("place");

  const [query, setQuery] =
    useState("");

  const [
    selectedId,
    setSelectedId
  ] = useState("");

  const [photo, setPhoto] =
    useState<File | null>(null);

  const [
    photoResetToken,
    setPhotoResetToken
  ] = useState(0);

  const [altText, setAltText] =
    useState("");

  const [caption, setCaption] =
    useState("");

  const [
    rightsBasis,
    setRightsBasis
  ] = useState(
    "venture_owned"
  );

  const [
    rightsNotes,
    setRightsNotes
  ] = useState("");

  const [
    makePrimary,
    setMakePrimary
  ] = useState(true);

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState(false);

  const filteredListings =
    useMemo(() => {
      const normalized =
        query.trim().toLowerCase();

      return listings
        .filter(
          (listing) =>
            listing.entityType ===
            entityType
        )
        .filter((listing) =>
          !normalized ||
          `${listing.name} ${listing.meta} ${listing.slug}`
            .toLowerCase()
            .includes(normalized)
        )
        .slice(0, 120);
    }, [
      entityType,
      listings,
      query
    ]);

  const selected =
    listings.find(
      (listing) =>
        listing.id === selectedId &&
        listing.entityType ===
          entityType
    ) ?? null;

  async function submitPhoto(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      busy ||
      !selected ||
      !photo ||
      !altText.trim()
    ) {
      setError(true);
      setMessage(
        "Choose a listing and photo, then describe the image."
      );
      return;
    }

    setBusy(true);
    setError(false);
    setMessage(
      "Publishing the photo..."
    );

    const body = new FormData();
    body.set(
      "entityType",
      selected.entityType
    );
    body.set(
      "entityId",
      selected.id
    );
    body.set("photo", photo);
    body.set(
      "altText",
      altText.trim()
    );
    body.set(
      "caption",
      caption.trim()
    );
    body.set(
      "rightsBasis",
      rightsBasis
    );
    body.set(
      "rightsNotes",
      rightsNotes.trim()
    );
    body.set(
      "makePrimary",
      String(makePrimary)
    );

    try {
      const response =
        await fetch(
          "/api/admin/listing-photos",
          {
            method: "POST",
            body
          }
        );

      const result =
        await response.json() as {
          ok?: boolean;
          message?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ||
          "Venture could not publish this photo."
        );
      }

      setMessage(
        result.message ||
        "Photo published."
      );
      setError(false);
      setPhoto(null);
      setPhotoResetToken(
        (current) => current + 1
      );
      setAltText("");
      setCaption("");
      setRightsNotes("");
      router.refresh();
    } catch (uploadError) {
      setError(true);
      setMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Venture could not publish this photo."
      );
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(
    mediaId: string
  ) {
    if (busy) {
      return;
    }

    if (
      !window.confirm(
        "Remove this photo from the active listing gallery?"
      )
    ) {
      return;
    }

    setBusy(true);
    setError(false);
    setMessage(
      "Removing the photo..."
    );

    try {
      const response =
        await fetch(
          "/api/admin/listing-photos",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              mediaId
            })
          }
        );

      const result =
        await response.json() as {
          ok?: boolean;
          message?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ||
          "Venture could not remove this photo."
        );
      }

      setMessage(
        result.message ||
        "Photo removed."
      );
      router.refresh();
    } catch (removeError) {
      setError(true);
      setMessage(
        removeError instanceof Error
          ? removeError.message
          : "Venture could not remove this photo."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.portalGrid}>
      <form
        className={styles.formCard}
        onSubmit={submitPhoto}
      >
        <div className={styles.stepHeading}>
          <span>01 · FIND IT</span>
          <h2>Choose the listing</h2>
          <p>
            The search only shows the selected listing type, so the event and restaurant with the same name do not collide.
          </p>
        </div>

        <div className={styles.typeSwitch}>
          <button
            className={
              entityType === "place"
                ? styles.activeType
                : ""
            }
            type="button"
            onClick={() => {
              setEntityType("place");
              setSelectedId("");
            }}
          >
            Restaurant
          </button>

          <button
            className={
              entityType === "event"
                ? styles.activeType
                : ""
            }
            type="button"
            onClick={() => {
              setEntityType("event");
              setSelectedId("");
            }}
          >
            Event
          </button>
        </div>

        <label className={styles.field}>
          <span>Search listings</span>
          <input
            type="search"
            placeholder={
              entityType === "place"
                ? "Tommy's, pizza, Corydon..."
                : "concert, market, organizer..."
            }
            value={query}
            onChange={(inputEvent) =>
              setQuery(
                inputEvent.target.value
              )
            }
          />
        </label>

        <label className={styles.field}>
          <span>
            {entityType === "place"
              ? "Restaurant"
              : "Event"}
          </span>

          <select
            required
            value={selectedId}
            onChange={(inputEvent) =>
              setSelectedId(
                inputEvent.target.value
              )
            }
          >
            <option value="">
              Choose from {filteredListings.length} matches
            </option>

            {filteredListings.map(
              (listing) => (
                <option
                  key={`${listing.entityType}-${listing.id}`}
                  value={listing.id}
                >
                  {listing.name} · {listing.meta} · {listing.status}
                </option>
              )
            )}
          </select>
        </label>

        {selected ? (
          <article className={styles.selectedListing}>
            {selected.currentImageUrl ? (
              <img
                src={selected.currentImageUrl}
                alt="Current listing image"
              />
            ) : (
              <div aria-hidden="true">
                {selected.entityType ===
                "place"
                  ? "🍽"
                  : "🎟"}
              </div>
            )}

            <span>
              <small>
                {selected.status.toUpperCase()}
              </small>
              <strong>
                {selected.name}
              </strong>
              <b>{selected.meta}</b>
            </span>

            <a
              href={`/listings/${selected.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              Preview listing ↗
            </a>
          </article>
        ) : null}

        <div className={styles.stepHeading}>
          <span>02 · ADD PHOTO</span>
          <h2>Choose the image</h2>
        </div>

        <ListingPhotoUpload
          label="Upload listing photo"
          helper="JPEG, PNG, or WebP. Venture resizes it before upload."
          onFileReady={setPhoto}
          resetToken={photoResetToken}
        />

        <div className={styles.detailsGrid}>
          <label className={styles.field}>
            <span>Image description</span>
            <input
              required
              maxLength={300}
              placeholder="Tommy's Pizzeria storefront on Corydon Avenue"
              value={altText}
              onChange={(inputEvent) =>
                setAltText(
                  inputEvent.target.value
                )
              }
            />
            <small>
              Describe what is visible, not why it is good.
            </small>
          </label>

          <label className={styles.field}>
            <span>Caption</span>
            <input
              maxLength={500}
              placeholder="Optional public caption"
              value={caption}
              onChange={(inputEvent) =>
                setCaption(
                  inputEvent.target.value
                )
              }
            />
          </label>

          <label className={styles.field}>
            <span>Photo permission</span>
            <select
              value={rightsBasis}
              onChange={(inputEvent) =>
                setRightsBasis(
                  inputEvent.target.value
                )
              }
            >
              {rightsOptions.map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>
          </label>

          <label className={styles.field}>
            <span>Permission notes</span>
            <textarea
              rows={3}
              maxLength={1000}
              placeholder="Who supplied it, when permission was given, or the licence terms."
              value={rightsNotes}
              onChange={(inputEvent) =>
                setRightsNotes(
                  inputEvent.target.value
                )
              }
            />
          </label>
        </div>

        <label className={styles.primaryToggle}>
          <input
            type="checkbox"
            checked={makePrimary}
            onChange={(inputEvent) =>
              setMakePrimary(
                inputEvent.target.checked
              )
            }
          />
          <span>
            <strong>
              Use as the main listing image
            </strong>
            <small>
              The previous primary photo stays in the media library but stops appearing first.
            </small>
          </span>
        </label>

        <button
          className={styles.publishButton}
          type="submit"
          disabled={busy}
        >
          {busy
            ? "Working..."
            : "Publish photo to listing"}
          <span aria-hidden="true">→</span>
        </button>

        {message ? (
          <p
            className={`${styles.message} ${
              error
                ? styles.error
                : styles.success
            }`}
            role="status"
          >
            {message}
          </p>
        ) : null}
      </form>

      <section className={styles.libraryCard}>
        <div className={styles.stepHeading}>
          <span>RECENT MEDIA</span>
          <h2>Latest listing photos</h2>
          <p>
            Removing an image archives it. Venture keeps the record and automatically falls back to another active image when possible.
          </p>
        </div>

        {recentMedia.length === 0 ? (
          <p className={styles.empty}>
            No listing photos have been published through this portal yet.
          </p>
        ) : (
          <div className={styles.mediaGrid}>
            {recentMedia.map((media) => (
              <article
                className={styles.mediaCard}
                key={media.id}
              >
                <img
                  src={media.public_url}
                  alt={media.alt_text}
                />

                <div>
                  <span>
                    {media.entity_type ===
                    "place"
                      ? "RESTAURANT"
                      : "EVENT"}
                    {media.is_primary
                      ? " · PRIMARY"
                      : ""}
                  </span>
                  <strong>
                    {media.listingName}
                  </strong>
                  <p>{media.alt_text}</p>
                  <small>
                    {media.rights_basis.replaceAll(
                      "_",
                      " "
                    )}
                  </small>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void removePhoto(
                      media.id
                    )
                  }
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
