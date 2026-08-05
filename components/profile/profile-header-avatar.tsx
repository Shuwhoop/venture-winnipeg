"use client";

import Link from "next/link";
import {
  useEffect,
  useState
} from "react";

import {
  PROFILE_SYSTEM_EVENT,
  profileInitials,
  type VentureProfilePayload
} from "@/lib/profile-system";

export function ProfileHeaderAvatar() {
  const [initials, setInitials] = useState("V");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch("/api/profile", {
          cache: "no-store"
        });

        if (!response.ok) {
          if (!cancelled) {
            setInitials("V");
            setAvatarUrl(null);
          }
          return;
        }

        const payload = await response.json() as VentureProfilePayload;

        if (!cancelled && payload.user) {
          setInitials(
            profileInitials(
              payload.profile.displayName,
              payload.user.email
            )
          );
          setAvatarUrl(payload.profile.avatarUrl);
        }
      } catch {
        if (!cancelled) {
          setInitials("V");
          setAvatarUrl(null);
        }
      }
    }

    void refresh();

    const onProfileChanged = () => {
      void refresh();
    };

    window.addEventListener(
      PROFILE_SYSTEM_EVENT,
      onProfileChanged
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        PROFILE_SYSTEM_EVENT,
        onProfileChanged
      );
    };
  }, []);

  return (
    <Link
      className="avatar profile-header-avatar"
      href="/profile"
      aria-label="Open profile"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" />
      ) : (
        initials
      )}
    </Link>
  );
}
