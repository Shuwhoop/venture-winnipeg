"use client";

import {
  FormEvent,
  useEffect,
  useState
} from "react";

import Link from "next/link";

import {
  useRouter
} from "next/navigation";

import {
  getSupabaseBrowserClient
} from "@/lib/supabase/client";

import styles from "./page.module.css";


type RecoveryState =
  | "loading"
  | "ready"
  | "saving"
  | "error";


export default function ResetAdminPasswordPage() {
  const router =
    useRouter();

  const [
    recoveryState,
    setRecoveryState
  ] =
    useState<RecoveryState>(
      "loading"
    );

  const [
    password,
    setPassword
  ] =
    useState("");

  const [
    confirmation,
    setConfirmation
  ] =
    useState("");

  const [
    message,
    setMessage
  ] =
    useState(
      "Checking your recovery link..."
    );

  useEffect(
    () => {
      let active =
        true;

      const supabase =
        getSupabaseBrowserClient();

      const {
        data: {
          subscription
        }
      } =
        supabase
          .auth
          .onAuthStateChange(
            (
              event,
              session
            ) => {
              if (
                !active
              ) {
                return;
              }

              if (
                (
                  event ===
                    "PASSWORD_RECOVERY" ||
                  event ===
                    "SIGNED_IN"
                ) &&
                session
              ) {
                setRecoveryState(
                  "ready"
                );

                setMessage(
                  "Choose a new password for your Venture administrator account."
                );
              }
            }
          );

      async function initializeRecovery() {
        try {
          const url =
            new URL(
              window.location.href
            );

          const code =
            url.searchParams.get(
              "code"
            );

          const hash =
            new URLSearchParams(
              url.hash.startsWith(
                "#"
              )
                ? url.hash.slice(1)
                : url.hash
            );

          const accessToken =
            hash.get(
              "access_token"
            );

          const refreshToken =
            hash.get(
              "refresh_token"
            );

          if (code) {
            const {
              error
            } =
              await supabase
                .auth
                .exchangeCodeForSession(
                  code
                );

            if (error) {
              throw error;
            }
          } else if (
            accessToken &&
            refreshToken
          ) {
            const {
              error
            } =
              await supabase
                .auth
                .setSession({
                  access_token:
                    accessToken,

                  refresh_token:
                    refreshToken
                });

            if (error) {
              throw error;
            }
          }

          /*
           * Remove credentials from the
           * visible address bar as soon
           * as they have been consumed.
           */
          window.history
            .replaceState(
              {},
              document.title,
              "/admin/reset-password"
            );

          const {
            data,
            error
          } =
            await supabase
              .auth
              .getSession();

          if (error) {
            throw error;
          }

          if (
            !data.session
          ) {
            throw new Error(
              "No valid recovery session was found."
            );
          }

          if (
            active
          ) {
            setRecoveryState(
              "ready"
            );

            setMessage(
              "Choose a new password for your Venture administrator account."
            );
          }
        } catch (error) {
          console.error(
            "Password recovery initialization failed:",
            error
          );

          if (
            active
          ) {
            setRecoveryState(
              "error"
            );

            setMessage(
              "This recovery link is invalid, expired, or has already been used. Request a fresh reset email."
            );
          }
        }
      }

      void initializeRecovery();

      return () => {
        active =
          false;

        subscription
          .unsubscribe();
      };
    },
    []
  );

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      recoveryState !==
      "ready"
    ) {
      return;
    }

    if (
      password.length < 12
    ) {
      setMessage(
        "Use at least 12 characters for the new password."
      );

      return;
    }

    if (
      password !==
      confirmation
    ) {
      setMessage(
        "The two password entries do not match."
      );

      return;
    }

    setRecoveryState(
      "saving"
    );

    setMessage(
      "Updating your password..."
    );

    try {
      const supabase =
        getSupabaseBrowserClient();

      const {
        error
      } =
        await supabase
          .auth
          .updateUser({
            password
          });

      if (error) {
        throw error;
      }

      await supabase
        .auth
        .signOut();

      router.replace(
        "/admin/login?passwordUpdated=1"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Password update failed:",
        error
      );

      setRecoveryState(
        "ready"
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "The password could not be updated."
      );
    }
  }

  const formDisabled =
    recoveryState !==
    "ready";

  return (
    <main
      className={
        styles.page
      }
    >
      <section
        className={
          styles.card
        }
      >
        <span
          className={
            styles.eyebrow
          }
        >
          VENTURE ADMIN
        </span>

        <h1>
          Set a new password
        </h1>

        <p
          className={
            recoveryState ===
            "error"
              ? styles.error
              : styles.message
          }
          role="status"
        >
          {message}
        </p>

        {recoveryState !==
        "error" ? (
          <form
            className={
              styles.form
            }
            onSubmit={
              handleSubmit
            }
          >
            <label>
              <span>
                New password
              </span>

              <input
                autoComplete="new-password"
                disabled={
                  formDisabled
                }
                minLength={
                  12
                }
                onChange={
                  (
                    inputEvent
                  ) =>
                    setPassword(
                      inputEvent
                        .target
                        .value
                    )
                }
                required
                type="password"
                value={
                  password
                }
              />
            </label>

            <label>
              <span>
                Confirm password
              </span>

              <input
                autoComplete="new-password"
                disabled={
                  formDisabled
                }
                minLength={
                  12
                }
                onChange={
                  (
                    inputEvent
                  ) =>
                    setConfirmation(
                      inputEvent
                        .target
                        .value
                    )
                }
                required
                type="password"
                value={
                  confirmation
                }
              />
            </label>

            <button
              disabled={
                formDisabled
              }
              type="submit"
            >
              {
                recoveryState ===
                "saving"
                  ? "Updating..."
                  : "Update password"
              }
            </button>
          </form>
        ) : null}

        <Link
          className={
            styles.back
          }
          href={
            recoveryState ===
            "error"
              ? "/admin/forgot-password"
              : "/admin/login"
          }
        >
          {
            recoveryState ===
            "error"
              ? "Request a fresh reset link"
              : "Return to admin sign in"
          }
        </Link>
      </section>
    </main>
  );
}
