"use client";

import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PROFILE,
  DEFAULT_USER_PREFERENCES,
  dispatchProfileChanged,
  PROFILE_SYSTEM_EVENT,
  type VentureNotificationPreferences,
  type VentureProfile,
  type VentureProfilePayload,
  type VentureUserPreferences
} from "@/lib/profile-system";

export type ProfileLoadState =
  | "loading"
  | "guest"
  | "ready"
  | "error";

export function useProfileData() {
  const [state, setState] =
    useState<ProfileLoadState>("loading");
  const [payload, setPayload] =
    useState<VentureProfilePayload>({
      authenticated: false,
      user: null,
      profile: DEFAULT_PROFILE,
      preferences: DEFAULT_USER_PREFERENCES,
      notifications: DEFAULT_NOTIFICATION_PREFERENCES
    });
  const [error, setError] =
    useState("");

  const refresh = useCallback(async () => {
    setError("");

    try {
      const response = await fetch("/api/profile", {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (response.status === 401) {
        setState("guest");
        setPayload({
          authenticated: false,
          user: null,
          profile: DEFAULT_PROFILE,
          preferences: DEFAULT_USER_PREFERENCES,
          notifications: DEFAULT_NOTIFICATION_PREFERENCES
        });
        return;
      }

      const result = await response.json() as
        VentureProfilePayload & { error?: string };

      if (!response.ok) {
        throw new Error(
          result.error || "Venture could not load your profile."
        );
      }

      setPayload(result);
      setState("ready");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Venture could not load your profile."
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    void refresh();

    const onProfileChanged = () => {
      void refresh();
    };

    window.addEventListener(
      PROFILE_SYSTEM_EVENT,
      onProfileChanged
    );

    return () => {
      window.removeEventListener(
        PROFILE_SYSTEM_EVENT,
        onProfileChanged
      );
    };
  }, [refresh]);

  const update = useCallback(async ({
    profile,
    preferences,
    notifications
  }: {
    profile?: Partial<VentureProfile>;
    preferences?: VentureUserPreferences;
    notifications?: VentureNotificationPreferences;
  }) => {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        profile,
        preferences,
        notifications
      })
    });

    const result = await response.json() as
      VentureProfilePayload & { error?: string };

    if (!response.ok) {
      throw new Error(
        result.error || "Venture could not save your profile."
      );
    }

    setPayload(result);
    setState("ready");
    dispatchProfileChanged();

    return result;
  }, []);

  return {
    state,
    payload,
    error,
    refresh,
    update
  };
}
