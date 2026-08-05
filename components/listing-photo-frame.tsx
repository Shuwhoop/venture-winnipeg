import type {
  PublicListingPhoto
} from "@/lib/data/listing-detail";

import styles from "./listing-photo-frame.module.css";

type ListingPhotoFrameProps = {
  name: string;
  entityType: "place" | "event";
  category: string;
  photo: PublicListingPhoto | null;
};

type IllustrationKind =
  | "food"
  | "coffee"
  | "nightlife"
  | "music"
  | "outdoor"
  | "activity"
  | "event";

function illustrationKind(
  entityType: "place" | "event",
  category: string
): IllustrationKind {
  const value = category.toLowerCase();

  if (entityType === "event") {
    if (
      value.includes("music") ||
      value.includes("concert") ||
      value.includes("dj")
    ) {
      return "music";
    }

    return "event";
  }

  if (
    value.includes("coffee") ||
    value.includes("cafe") ||
    value.includes("bakery")
  ) {
    return "coffee";
  }

  if (
    value.includes("bar") ||
    value.includes("night") ||
    value.includes("brew") ||
    value.includes("club")
  ) {
    return "nightlife";
  }

  if (
    value.includes("park") ||
    value.includes("outdoor") ||
    value.includes("trail")
  ) {
    return "outdoor";
  }

  if (
    value.includes("activity") ||
    value.includes("attraction") ||
    value.includes("museum") ||
    value.includes("gallery")
  ) {
    return "activity";
  }

  return "food";
}

function Illustration({
  kind
}: {
  kind: IllustrationKind;
}) {
  if (kind === "coffee") {
    return (
      <svg viewBox="0 0 320 210" aria-hidden="true">
        <path className={styles.doodle} d="M72 148h128c0 24-17 39-47 39h-34c-30 0-47-15-47-39Z" />
        <path className={styles.doodle} d="M199 156h20c28 0 28-39 1-39h-17" />
        <path className={styles.doodle} d="M105 120c-18-24 18-25 1-50M147 118c-18-24 18-25 1-50" />
        <path className={styles.spark} d="m244 53 6 17 17 6-17 6-6 17-6-17-17-6 17-6 6-17Z" />
      </svg>
    );
  }

  if (kind === "nightlife") {
    return (
      <svg viewBox="0 0 320 210" aria-hidden="true">
        <path className={styles.doodle} d="M78 54h83l-16 39v62c0 16-14 28-27 28s-27-12-27-28V93L78 54Z" />
        <path className={styles.doodle} d="M91 92h54M118 183v16M94 199h48" />
        <path className={styles.doodle} d="M205 67c25 17 31 53 14 78-17 25-51 32-77 17 45 3 72-47 63-95Z" />
        <circle className={styles.dot} cx="252" cy="61" r="8" />
        <circle className={styles.dot} cx="271" cy="101" r="5" />
      </svg>
    );
  }

  if (kind === "music") {
    return (
      <svg viewBox="0 0 320 210" aria-hidden="true">
        <path className={styles.doodle} d="M123 47v105c0 19-14 32-34 32-16 0-27-9-27-22 0-15 14-25 32-25 8 0 14 2 20 5V71l104-23v84c0 19-14 32-34 32-16 0-27-9-27-22 0-15 14-25 32-25 8 0 15 2 20 5V29L123 47Z" />
        <path className={styles.spark} d="m253 55 5 14 14 5-14 5-5 14-5-14-14-5 14-5 5-14Z" />
      </svg>
    );
  }

  if (kind === "outdoor") {
    return (
      <svg viewBox="0 0 320 210" aria-hidden="true">
        <circle className={styles.sun} cx="242" cy="55" r="25" />
        <path className={styles.doodle} d="M35 174 105 78l47 62 35-44 97 78H35Z" />
        <path className={styles.doodle} d="m105 78 18 47 29 15M187 96l15 41 31 1" />
        <path className={styles.doodle} d="M64 174c28-33 56-33 84 0M144 174c25-24 51-24 77 0" />
      </svg>
    );
  }

  if (kind === "activity") {
    return (
      <svg viewBox="0 0 320 210" aria-hidden="true">
        <path className={styles.doodle} d="M64 160 97 61h126l33 99-30 18-35-49h-62l-35 49-30-18Z" />
        <path className={styles.doodle} d="M113 105H83M98 90v30M207 95h1M224 112h1" />
        <path className={styles.spark} d="m162 36 5 15 15 5-15 5-5 15-5-15-15-5 15-5 5-15Z" />
      </svg>
    );
  }

  if (kind === "event") {
    return (
      <svg viewBox="0 0 320 210" aria-hidden="true">
        <rect className={styles.doodle} x="58" y="51" width="204" height="128" rx="22" />
        <path className={styles.doodle} d="M58 88h204M101 34v34M220 34v34" />
        <path className={styles.spark} d="m159 108 7 20 20 7-20 7-7 20-7-20-20-7 20-7 7-20Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 210" aria-hidden="true">
      <path className={styles.doodle} d="M49 156h222M72 156c12-58 53-89 88-89s76 31 88 89H72Z" />
      <path className={styles.doodle} d="M160 67V48M141 48h38" />
      <path className={styles.doodle} d="M88 131c28-28 57-39 86-33 20 4 37 14 53 33" />
      <circle className={styles.dot} cx="107" cy="111" r="7" />
      <circle className={styles.dot} cx="197" cy="120" r="6" />
      <path className={styles.spark} d="m252 50 5 15 15 5-15 5-5 15-5-15-15-5 15-5 5-15Z" />
    </svg>
  );
}

export function ListingPhotoFrame({
  name,
  entityType,
  category,
  photo
}: ListingPhotoFrameProps) {
  const kind = illustrationKind(
    entityType,
    category
  );

  return (
    <figure
      className={`${styles.frame} ${styles[kind]}`}
    >
      {photo ? (
        <img
          className={styles.photo}
          src={photo.url}
          alt={photo.altText || `${name} listing photo`}
        />
      ) : (
        <div
          className={styles.placeholder}
          role="img"
          aria-label={`${category} illustration for ${name}`}
        >
          <Illustration kind={kind} />
        </div>
      )}
    </figure>
  );
}
