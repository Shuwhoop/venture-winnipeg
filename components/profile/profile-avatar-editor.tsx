"use client";

import {
  ChangeEvent,
  useRef,
  useState
} from "react";

import {
  dispatchProfileChanged,
  profileInitials,
  type VentureProfile
} from "@/lib/profile-system";

import {
  getSupabaseBrowserClient
} from "@/lib/supabase/client";

import styles from "@/app/profile/profile-system.module.css";

async function imageToSquareWebp(file: File) {
  if (![
    "image/jpeg",
    "image/png",
    "image/webp"
  ].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Profile photos must be 2 MB or smaller.");
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () =>
          reject(new Error("Venture could not read that image."));
        nextImage.src = imageUrl;
      }
    );

    const side = Math.min(
      image.naturalWidth,
      image.naturalHeight
    );
    const sourceX =
      (image.naturalWidth - side) / 2;
    const sourceY =
      (image.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("This browser cannot prepare the profile photo.");
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      side,
      side,
      0,
      0,
      512,
      512
    );

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Venture could not prepare the profile photo."));
          }
        },
        "image/webp",
        0.86
      );
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function ProfileAvatarEditor({
  userId,
  email,
  profile,
  onChanged
}: {
  userId: string;
  email: string;
  profile: VentureProfile;
  onChanged: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setWorking(true);
    setMessage("");

    try {
      const blob = await imageToSquareWebp(file);
      const path = `${userId}/profile.webp`;
      const supabase = getSupabaseBrowserClient();
      const upload = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          upsert: true,
          contentType: "image/webp",
          cacheControl: "3600"
        });

      if (upload.error) {
        throw upload.error;
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          profile: {
            displayName: profile.displayName,
            username: profile.username,
            bio: profile.bio,
            homeNeighbourhood: profile.homeNeighbourhood,
            onboardingCompleted: profile.onboardingCompleted,
            avatarPath: path
          }
        })
      });

      const result = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Venture could not save the photo.");
      }

      setMessage("Profile photo updated.");
      dispatchProfileChanged();
      await onChanged();
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Venture could not update the profile photo."
      );
    } finally {
      setWorking(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleRemove() {
    setWorking(true);
    setMessage("");

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE"
      });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Venture could not remove the photo.");
      }

      setMessage("Profile photo removed.");
      dispatchProfileChanged();
      await onChanged();
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Venture could not remove the profile photo."
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className={styles.avatarEditor}>
      <div className={styles.avatarLarge}>
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt="Your Venture profile"
          />
        ) : (
          <span aria-hidden="true">
            {profileInitials(profile.displayName, email)}
          </span>
        )}
      </div>

      <div className={styles.avatarCopy}>
        <strong>Profile photo</strong>
        <p>
          Venture centres and converts the image into a private square avatar.
        </p>

        <div className={styles.inlineActions}>
          <label className={styles.fileAction}>
            {working ? "Working…" : profile.avatarPath ? "Replace photo" : "Add photo"}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={working}
              onChange={handleUpload}
            />
          </label>

          {profile.avatarPath ? (
            <button
              type="button"
              className={styles.textButton}
              disabled={working}
              onClick={handleRemove}
            >
              Remove
            </button>
          ) : null}
        </div>

        {message ? (
          <small role="status" className={styles.formMessage}>
            {message}
          </small>
        ) : null}
      </div>
    </section>
  );
}
