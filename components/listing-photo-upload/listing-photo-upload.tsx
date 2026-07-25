"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useId,
  useRef,
  useState
} from "react";

import {
  preparePhotoForUpload
} from "@/lib/media/client-photo";

import styles from "./listing-photo-upload.module.css";

type ListingPhotoUploadProps = {
  name?: string;
  label?: string;
  helper?: string;
  required?: boolean;
  onFileReady?: (
    file: File | null
  ) => void;
  resetToken?: string | number;
};

function formatBytes(
  value: number
): string {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function ListingPhotoUpload({
  name = "photo",
  label = "Add a photo",
  helper = "JPEG, PNG, WebP, or an iPhone HEIC photo. Venture will resize it for faster loading.",
  required = false,
  onFileReady,
  resetToken = 0
}: ListingPhotoUploadProps) {
  const inputId = useId();
  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    preparedFile,
    setPreparedFile
  ] = useState<File | null>(
    null
  );

  const [
    previewUrl,
    setPreviewUrl
  ] = useState<string | null>(
    null
  );

  const [
    status,
    setStatus
  ] = useState(
    ""
  );

  const [
    dragging,
    setDragging
  ] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setPreparedFile(null);
    setPreviewUrl(null);
    setStatus("");
    setDragging(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    onFileReady?.(null);
    // resetToken is the intentional external reset signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  async function chooseFile(
    file: File | null
  ) {
    if (!file) {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      setPreparedFile(null);
      setPreviewUrl(null);
      setStatus("");

      if (inputRef.current) {
        inputRef.current.value = "";
      }
      onFileReady?.(null);
      return;
    }

    setStatus(
      "Preparing photo..."
    );

    try {
      const ready =
        await preparePhotoForUpload(
          file
        );

      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      const nextPreview =
        URL.createObjectURL(
          ready
        );

      setPreparedFile(ready);
      setPreviewUrl(nextPreview);
      setStatus(
        `${ready.name} · ${formatBytes(ready.size)}`
      );
      onFileReady?.(ready);
    } catch (error) {
      setPreparedFile(null);
      setPreviewUrl(null);
      setStatus(
        error instanceof Error
          ? error.message
          : "The photo could not be prepared."
      );
      onFileReady?.(null);
    }
  }

  function handleChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    void chooseFile(
      event.target.files?.[0] ??
        null
    );
  }

  function handleDrop(
    event:
      DragEvent<HTMLLabelElement>
  ) {
    event.preventDefault();
    setDragging(false);

    void chooseFile(
      event.dataTransfer.files?.[0] ??
        null
    );
  }

  return (
    <div className={styles.wrap}>
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
          className={styles.input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          required={
            required &&
            !preparedFile
          }
          onChange={handleChange}
        />

        {previewUrl ? (
          <img
            className={styles.preview}
            src={previewUrl}
            alt="Selected upload preview"
          />
        ) : (
          <span
            className={styles.icon}
            aria-hidden="true"
          >
            ↑
          </span>
        )}

        <span className={styles.copy}>
          <strong>{label}</strong>
          <small>{helper}</small>
          <b>
            {previewUrl
              ? "Choose a different photo"
              : "Tap to choose or drop it here"}
          </b>
        </span>
      </label>

      {preparedFile ? (
        <input
          type="hidden"
          name={`${name}Prepared`}
          value="true"
        />
      ) : null}

      {status ? (
        <p
          className={styles.status}
          role="status"
        >
          {status}
        </p>
      ) : null}

      {preparedFile ? (
        <button
          className={styles.remove}
          type="button"
          onClick={() => {
            void chooseFile(null);
          }}
        >
          Remove photo
        </button>
      ) : null}
    </div>
  );
}
