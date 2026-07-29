"use client";

import type {
  ChangeEvent,
  DragEvent
} from "react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState
} from "react";
import {
  useRouter
} from "next/navigation";

import {
  preparePhotoForUpload
} from "@/lib/media/client-photo";

import styles from "./listing-photo-editor.module.css";

type EntityType =
  | "place"
  | "event";

type RightsBasis =
  | "venture_owned"
  | "business_permission"
  | "organizer_permission"
  | "submitter_owned"
  | "licensed"
  | "public_domain";

type PhotoMedia = {
  id: string;
  publicUrl: string;
  altText: string;
  caption: string | null;
  rightsBasis: RightsBasis;
  rightsNotes: string | null;
  isPrimary: boolean;
  createdAt: string;
};

type PhotoState = {
  listing: {
    id: string;
    entityType: EntityType;
    slug: string;
    name: string;
    currentImageUrl: string | null;
    currentAltText: string | null;
    currentRightsNotes: string | null;
    imageUpdatedAt: string | null;
  };
  media: PhotoMedia[];
};

const RIGHTS_OPTIONS: Array<{
  value: RightsBasis;
  label: string;
}> = [
  {
    value: "venture_owned",
    label: "Taken or created by Venture"
  },
  {
    value: "business_permission",
    label: "Business gave Venture permission"
  },
  {
    value: "organizer_permission",
    label: "Event organizer gave permission"
  },
  {
    value: "submitter_owned",
    label: "Submitter owns the photograph"
  },
  {
    value: "licensed",
    label: "Licensed for Venture's use"
  },
  {
    value: "public_domain",
    label: "Public domain"
  }
];

function formatBytes(
  bytes: number
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function readableRights(
  value: RightsBasis
): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export function ListingPhotoEditor({
  entityType,
  entityId,
  listingName,
  publicPath
}: {
  entityType: EntityType;
  entityId: string;
  listingName: string;
  publicPath: string;
}) {
  const router =
    useRouter();
  const inputId =
    useId();
  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [state, setState] =
    useState<PhotoState | null>(
      null
    );
  const [loading, setLoading] =
    useState(true);
  const [busy, setBusy] =
    useState<string | null>(
      null
    );
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState(false);
  const [dragging, setDragging] =
    useState(false);
  const [photo, setPhoto] =
    useState<File | null>(null);
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);
  const [altText, setAltText] =
    useState("");
  const [caption, setCaption] =
    useState("");
  const [rightsBasis, setRightsBasis] =
    useState<RightsBasis>(
      "venture_owned"
    );
  const [rightsNotes, setRightsNotes] =
    useState("");

  const loadPhotos =
    useCallback(async () => {
      setLoading(true);

      try {
        const params =
          new URLSearchParams({
            entityType,
            entityId
          });
        const response =
          await fetch(
            `/api/admin/listing-photos?${params.toString()}`,
            {
              cache: "no-store"
            }
          );
        const result =
          await response.json() as
            Partial<PhotoState> & {
              ok?: boolean;
              error?: string;
            };

        if (
          !response.ok ||
          !result.ok ||
          !result.listing ||
          !result.media
        ) {
          throw new Error(
            result.error ||
            "Venture could not load the listing photos."
          );
        }

        setState({
          listing: result.listing,
          media: result.media
        });
        setError(false);
      } catch (loadError) {
        setError(true);
        setMessage(
          loadError instanceof Error
            ? loadError.message
            : "Venture could not load the listing photos."
        );
      } finally {
        setLoading(false);
      }
    }, [
      entityId,
      entityType
    ]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);

  function resetSelection() {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setPhoto(null);
    setPreviewUrl(null);
    setAltText("");
    setCaption("");
    setRightsNotes("");
    setDragging(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function choosePhoto(
    selected: File | null
  ) {
    if (!selected) {
      resetSelection();
      return;
    }

    setBusy("prepare");
    setError(false);
    setMessage(
      "Preparing the photograph..."
    );

    try {
      const prepared =
        await preparePhotoForUpload(
          selected
        );

      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      const nextPreview =
        URL.createObjectURL(
          prepared
        );

      setPhoto(prepared);
      setPreviewUrl(nextPreview);
      setAltText((current) =>
        current ||
        `${listingName} listing photograph`
      );
      setMessage(
        `${prepared.name} ready · ${formatBytes(prepared.size)}`
      );
    } catch (prepareError) {
      resetSelection();
      setError(true);
      setMessage(
        prepareError instanceof Error
          ? prepareError.message
          : "The photograph could not be prepared."
      );
    } finally {
      setBusy(null);
    }
  }

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    void choosePhoto(
      event.currentTarget.files?.[0] ||
      null
    );
  }

  function handleDrop(
    event:
      DragEvent<HTMLLabelElement>
  ) {
    event.preventDefault();
    setDragging(false);

    void choosePhoto(
      event.dataTransfer.files?.[0] ||
      null
    );
  }

  async function uploadPhoto() {
    if (busy) {
      return;
    }

    if (
      !photo ||
      !altText.trim()
    ) {
      setError(true);
      setMessage(
        "Choose a photograph and describe what appears in it."
      );
      return;
    }

    if (
      rightsBasis !==
        "venture_owned" &&
      !rightsNotes.trim()
    ) {
      setError(true);
      setMessage(
        "Add a short note explaining who gave permission or which licence applies."
      );
      return;
    }

    setBusy("upload");
    setError(false);
    setMessage(
      "Uploading and connecting the photograph..."
    );

    const body =
      new FormData();
    body.set(
      "entityType",
      entityType
    );
    body.set(
      "entityId",
      entityId
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
      "true"
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
          "Venture could not upload the photograph."
        );
      }

      resetSelection();
      setError(false);
      setMessage(
        result.message ||
        "Photograph uploaded."
      );
      await loadPhotos();
      router.refresh();
    } catch (uploadError) {
      setError(true);
      setMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Venture could not upload the photograph."
      );
    } finally {
      setBusy(null);
    }
  }

  async function makePrimary(
    mediaId: string
  ) {
    if (busy) {
      return;
    }

    setBusy(mediaId);
    setError(false);
    setMessage(
      "Updating the main photograph..."
    );

    try {
      const response =
        await fetch(
          "/api/admin/listing-photos",
          {
            method: "PATCH",
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
          "Venture could not update the main photograph."
        );
      }

      setMessage(
        result.message ||
        "Main photograph updated."
      );
      await loadPhotos();
      router.refresh();
    } catch (primaryError) {
      setError(true);
      setMessage(
        primaryError instanceof Error
          ? primaryError.message
          : "Venture could not update the main photograph."
      );
    } finally {
      setBusy(null);
    }
  }

  async function archivePhoto(
    mediaId: string
  ) {
    if (busy) {
      return;
    }

    if (
      !window.confirm(
        "Remove this photograph from the active listing gallery? The media record will be archived, not erased."
      )
    ) {
      return;
    }

    setBusy(mediaId);
    setError(false);
    setMessage(
      "Removing the photograph..."
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
              mediaId,
              entityType,
              entityId
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
          "Venture could not remove the photograph."
        );
      }

      setMessage(
        result.message ||
        "Photograph removed."
      );
      await loadPhotos();
      router.refresh();
    } catch (removeError) {
      setError(true);
      setMessage(
        removeError instanceof Error
          ? removeError.message
          : "Venture could not remove the photograph."
      );
    } finally {
      setBusy(null);
    }
  }

  const currentImage =
    state?.listing.currentImageUrl ||
    null;
  const hasLibraryPrimary =
    state?.media.some(
      (media) => media.isPrimary
    ) || false;

  return (
    <section className={styles.card}>
      <div className={styles.heading}>
        <div>
          <span>LISTING PHOTOGRAPH</span>
          <h2>Photo studio</h2>
          <p>
            Upload the image directly to this listing. Venture compresses it, stores the permission record, and uses it as the main catalogue photograph.
          </p>
        </div>

        <a
          href={publicPath}
          target="_blank"
          rel="noreferrer"
        >
          Preview listing
        </a>
      </div>

      <div className={styles.currentPanel}>
        {currentImage ? (
          <img
            src={currentImage}
            alt={
              state?.listing.currentAltText ||
              `${listingName} current listing photograph`
            }
          />
        ) : (
          <div
            className={styles.emptyCurrent}
            aria-hidden="true"
          >
            <span>＋</span>
          </div>
        )}

        <div>
          <small>
            {currentImage
              ? "CURRENT MAIN IMAGE"
              : "NO MAIN IMAGE YET"}
          </small>
          <strong>{listingName}</strong>
          <p>
            {currentImage
              ? state?.listing.currentAltText ||
                "This image is currently displayed on Venture."
              : "Add a photograph below to replace the generic artwork."}
          </p>

          {currentImage &&
          !hasLibraryPrimary ? (
            <em>
              This image predates the media library. Uploading a new photograph will safely replace it as the main image.
            </em>
          ) : null}
        </div>
      </div>

      <div className={styles.uploadGrid}>
        <label
          className={`${styles.dropzone} ${
            dragging
              ? styles.dragging
              : ""
          }`}
          htmlFor={inputId}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => {
            setDragging(false);
          }}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            id={inputId}
            className={styles.fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleFileChange}
          />

          {previewUrl ? (
            <img
              className={styles.preview}
              src={previewUrl}
              alt="Selected photograph preview"
            />
          ) : (
            <span
              className={styles.uploadIcon}
              aria-hidden="true"
            >
              ↑
            </span>
          )}

          <span className={styles.dropCopy}>
            <strong>
              {previewUrl
                ? "Choose a different photograph"
                : "Choose or drop a photograph"}
            </strong>
            <small>
              JPEG, PNG, WebP, or iPhone HEIC. Venture resizes it to a web-friendly JPEG under 3 MB.
            </small>
          </span>
        </label>

        <div className={styles.fields}>
          <label>
            Image description
            <input
              value={altText}
              maxLength={300}
              placeholder={`${listingName} storefront and entrance`}
              onChange={(event) => {
                setAltText(
                  event.currentTarget.value
                );
              }}
            />
            <small>
              Describe what is visible for accessibility.
            </small>
          </label>

          <label>
            Public caption
            <input
              value={caption}
              maxLength={500}
              placeholder="Optional"
              onChange={(event) => {
                setCaption(
                  event.currentTarget.value
                );
              }}
            />
          </label>

          <label>
            Photo permission
            <select
              value={rightsBasis}
              onChange={(event) => {
                setRightsBasis(
                  event.currentTarget.value as
                    RightsBasis
                );
              }}
            >
              {RIGHTS_OPTIONS.map(
                (option) => (
                  <option
                    value={option.value}
                    key={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            Permission or source notes
            <textarea
              rows={3}
              maxLength={1000}
              value={rightsNotes}
              placeholder={
                rightsBasis ===
                  "venture_owned"
                  ? "Optional: who took it and when"
                  : "Required: who gave permission or the licence/source details"
              }
              onChange={(event) => {
                setRightsNotes(
                  event.currentTarget.value
                );
              }}
            />
          </label>
        </div>
      </div>

      <div className={styles.uploadActions}>
        <p>
          Only publish photographs Venture owns, has permission to use, or can legally use under a recorded licence.
        </p>

        <div>
          {photo ? (
            <button
              className={styles.quietButton}
              type="button"
              disabled={Boolean(busy)}
              onClick={resetSelection}
            >
              Clear selection
            </button>
          ) : null}

          <button
            className={styles.uploadButton}
            type="button"
            disabled={
              Boolean(busy) ||
              !photo
            }
            onClick={() => {
              void uploadPhoto();
            }}
          >
            {busy === "upload"
              ? "Uploading..."
              : "Upload as main photo"}
          </button>
        </div>
      </div>

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

      <div className={styles.libraryHeading}>
        <div>
          <span>PHOTO LIBRARY</span>
          <h3>Active photographs</h3>
        </div>
        <b>
          {state?.media.length || 0}
        </b>
      </div>

      {loading ? (
        <p className={styles.loading}>
          Loading listing photographs...
        </p>
      ) : state &&
        state.media.length > 0 ? (
        <div className={styles.mediaGrid}>
          {state.media.map((media) => (
            <article
              className={styles.mediaCard}
              key={media.id}
            >
              <div className={styles.mediaImageWrap}>
                <img
                  src={media.publicUrl}
                  alt={media.altText}
                />
                {media.isPrimary ? (
                  <span>MAIN</span>
                ) : null}
              </div>

              <div className={styles.mediaCopy}>
                <strong>
                  {media.altText}
                </strong>
                <small>
                  {readableRights(
                    media.rightsBasis
                  )}
                </small>
                {media.caption ? (
                  <p>{media.caption}</p>
                ) : null}
              </div>

              <div className={styles.mediaActions}>
                {!media.isPrimary ? (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      void makePrimary(
                        media.id
                      );
                    }}
                  >
                    {busy === media.id
                      ? "Working..."
                      : "Make main"}
                  </button>
                ) : (
                  <span>
                    Used on listing
                  </span>
                )}

                <button
                  className={styles.removeButton}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    void archivePhoto(
                      media.id
                    );
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.loading}>
          No photographs have been uploaded through the listing editor yet.
        </p>
      )}
    </section>
  );
}
