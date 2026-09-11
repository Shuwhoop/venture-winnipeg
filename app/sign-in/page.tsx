"use client";

import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useState
} from "react";

import NewsletterSignup from "@/components/newsletter-signup/newsletter-signup";
import {
  getSupabaseBrowserClient
} from "@/lib/supabase/client";

import styles from "./page.module.css";

function safeNextPath(
  value: string | null
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/profile";
  }

  return value;
}

export default function SignInPage() {
  const [nextPath, setNextPath] =
    useState("/profile");
  const [callbackError, setCallbackError] =
    useState<string | null>(null);

  useEffect(() => {
    const searchParams =
      new URLSearchParams(
        window.location.search
      );

    setNextPath(
      safeNextPath(
        searchParams.get("next")
      )
    );
    setCallbackError(
      searchParams.get("error")
    );
  }, []);

  const [email, setEmail] =
    useState("");
  const [status, setStatus] =
    useState<
      "idle" | "sending" | "sent" | "error"
    >("idle");
  const [googleStatus, setGoogleStatus] =
    useState<"idle" | "redirecting" | "error">("idle");
  const [message, setMessage] =
    useState("");

  async function handleGoogleSignIn() {
    setGoogleStatus("redirecting");
    setStatus("idle");
    setMessage("");
    setCallbackError(null);

    try {
      const supabase =
        getSupabaseBrowserClient();

      const callbackUrl = new URL(
        "/auth/callback",
        window.location.origin
      );

      callbackUrl.searchParams.set(
        "next",
        nextPath
      );
      callbackUrl.searchParams.set(
        "provider",
        "google"
      );

      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: callbackUrl.toString(),
            queryParams: {
              prompt: "select_account"
            }
          }
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      setGoogleStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Google sign-in could not start."
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setStatus("error");
      setMessage("Enter the email you want to use for Venture.");
      return;
    }

    setStatus("sending");
    setGoogleStatus("idle");
    setMessage("");
    setCallbackError(null);

    try {
      const supabase =
        getSupabaseBrowserClient();

      const callbackUrl = new URL(
        "/auth/callback",
        window.location.origin
      );

      callbackUrl.searchParams.set(
        "next",
        nextPath
      );
      callbackUrl.searchParams.set(
        "provider",
        "email"
      );

      const { error } =
        await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo:
              callbackUrl.toString(),
            shouldCreateUser: true
          }
        });

      if (error) {
        throw error;
      }

      setStatus("sent");
      setMessage(
        `A secure Venture link is on its way to ${normalizedEmail}.`
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Venture could not send the sign-in email."
      );
    }
  }

  const visibleError =
    message || callbackError;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.logo} aria-hidden="true">
          <span>V</span>
          <i />
        </div>

        <span>VENTURE ACCOUNT</span>
        <h1>Your city plans, wherever you open Venture.</h1>
        <p>
          Sign in only when it becomes useful. Guest browsing and outing
          building stay completely open.
        </p>
      </section>

      <section className={styles.formCard}>
        {status === "sent" ? (
          <div className={styles.sentState} role="status">
            <span aria-hidden="true">✦</span>
            <h2>Check your inbox</h2>
            <p>{message}</p>
            <small>
              Open the link on this device. It will return you to Venture and
              merge your local saves with your account.
            </small>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setMessage("");
              }}
            >
              Use another email
            </button>
          </div>
        ) : (
          <div className={styles.signInStack}>
            <header className={styles.signInHeader}>
              <span>QUICK ACCOUNT ACCESS</span>
              <h2>Continue to Venture</h2>
              <p>
                Use Google for one-tap access, or keep using Venture&apos;s secure
                email link.
              </p>
            </header>

            <button
              className={styles.googleButton}
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={
                googleStatus === "redirecting" ||
                status === "sending"
              }
            >
              <svg
                className={styles.googleIcon}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.6 12.23c0-.71-.06-1.23-.2-1.77H12v3.4h5.52c-.11.85-.71 2.13-2.04 2.99l-.02.11 2.96 2.3.2.02c1.84-1.7 2.98-4.2 2.98-7.05Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.69 0 4.95-.89 6.6-2.42l-3.14-2.43c-.84.57-1.96.97-3.46.97-2.64 0-4.88-1.79-5.68-4.26l-.11.01-3.08 2.38-.04.1A9.98 9.98 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.32 13.86A6.02 6.02 0 0 1 6 12c0-.65.11-1.27.3-1.86l-.01-.12-3.12-2.42-.1.05A10 10 0 0 0 2 12c0 1.57.37 3.05 1.09 4.35l3.23-2.49Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.88c1.87 0 3.13.81 3.84 1.46l2.83-2.76C16.93 2.96 14.69 2 12 2a9.98 9.98 0 0 0-8.93 5.65l3.23 2.49C7.11 7.67 9.35 5.88 12 5.88Z"
                />
              </svg>
              <span>
                {googleStatus === "redirecting"
                  ? "Opening Google…"
                  : "Continue with Google"}
              </span>
            </button>

            <div className={styles.divider} aria-hidden="true">
              <span>or continue with email</span>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setStatus("idle");
                    setGoogleStatus("idle");
                    setMessage("");
                  }}
                  disabled={
                    status === "sending" ||
                    googleStatus === "redirecting"
                  }
                />
              </label>

              <button
                type="submit"
                disabled={
                  status === "sending" ||
                  googleStatus === "redirecting"
                }
              >
                {status === "sending"
                  ? "Sending secure link…"
                  : "Continue with email"}
              </button>
            </form>

            {status === "error" || googleStatus === "error" || callbackError ? (
              <p className={styles.error} role="alert">
                {visibleError}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className={styles.benefits}>
        <article>
          <span aria-hidden="true">♡</span>
          <strong>Keep your saves</strong>
          <small>Places, events, and full outings move with you.</small>
        </article>
        <article>
          <span aria-hidden="true">↻</span>
          <strong>Merge, do not erase</strong>
          <small>Your existing device saves are folded into the account.</small>
        </article>
        <article>
          <span aria-hidden="true">◌</span>
          <strong>Guest mode remains</strong>
          <small>Explore first. Sign in only when you see the value.</small>
        </article>
      </section>

      <section className={styles.newsletterArea}>
        <div className={styles.newsletterIntro}>
          <span>DON&apos;T NEED AN ACCOUNT?</span>
          <h2>Just want the good Winnipeg stuff in your inbox?</h2>
          <p>
            The Thursday Venture is separate from a Venture account. Join with
            your name and email, confirm once, and get the weekly city edit.
          </p>
          <Link href="/newsletter">See what the newsletter is for →</Link>
        </div>

        <NewsletterSignup placement="sign-in" />
      </section>

      <Link className={styles.backLink} href={nextPath}>
        Continue without signing in
      </Link>
    </main>
  );
}
