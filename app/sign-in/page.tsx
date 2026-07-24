"use client";

import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useState
} from "react";

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
  const [message, setMessage] =
    useState("");

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
    setMessage("");

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
          <form onSubmit={handleSubmit}>
            <header>
              <span>NO PASSWORD TO REMEMBER</span>
              <h2>Email me a sign-in link</h2>
              <p>
                Venture uses a one-time secure link. No password cupboard, no
                forgotten-key drama.
              </p>
            </header>

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
                  setMessage("");
                }}
                disabled={status === "sending"}
              />
            </label>

            <button
              type="submit"
              disabled={status === "sending"}
            >
              {status === "sending"
                ? "Sending secure link…"
                : "Continue with email"}
            </button>

            {status === "error" || callbackError ? (
              <p className={styles.error} role="alert">
                {message || callbackError}
              </p>
            ) : null}
          </form>
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

      <Link className={styles.backLink} href={nextPath}>
        Continue without signing in
      </Link>
    </main>
  );
}
