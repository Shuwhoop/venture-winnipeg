import {
  redirect
} from "next/navigation";

import {
  getVentureAdmin
} from "@/lib/auth/admin";

import {
  loginAdmin
} from "./actions";

import styles from "./page.module.css";


export const dynamic =
  "force-dynamic";


type LoginSearchParams = {
  error?: string;
  signedOut?: string;
};


function getMessage(
  error:
    string | undefined,
  signedOut:
    string | undefined
) {
  if (
    signedOut === "1"
  ) {
    return {
      tone:
        "success",
      text:
        "You have been signed out."
    } as const;
  }

  if (
    error === "required"
  ) {
    return {
      tone:
        "error",
      text:
        "Sign in with an authorized Venture administrator account."
    } as const;
  }

  if (
    error === "denied"
  ) {
    return {
      tone:
        "error",
      text:
        "That account is not authorized to manage Venture."
    } as const;
  }

  if (
    error === "invalid"
  ) {
    return {
      tone:
        "error",
      text:
        "The email or password was not accepted."
    } as const;
  }

  return null;
}


export default async function AdminLoginPage({
  searchParams
}: {
  searchParams:
    Promise<LoginSearchParams>;
}) {
  const currentAdmin =
    await getVentureAdmin();

  if (currentAdmin) {
    redirect(
      "/admin/submissions"
    );
  }

  const parameters =
    await searchParams;

  const message =
    getMessage(
      parameters.error,
      parameters.signedOut
    );

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
        <div
          className={
            styles.brand
          }
        >
          <span>
            VENTURE ADMIN
          </span>

          <h1>
            Review Winnipeg&apos;s
            next discoveries.
          </h1>

          <p>
            This entrance is reserved
            for approved Venture
            administrators.
          </p>
        </div>

        <form
          action={
            loginAdmin
          }
          className={
            styles.form
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              SECURE SIGN IN
            </span>

            <h2>
              Welcome back
            </h2>
          </div>

          <label>
            <span>
              Admin email
            </span>

            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              required
              type="email"
            />
          </label>

          <label>
            <span>
              Password
            </span>

            <input
              autoComplete="current-password"
              minLength={
                6
              }
              name="password"
              required
              type="password"
            />
          </label>

          <button
            type="submit"
          >
            Sign in
          </button>

          {message ? (
            <p
              className={
                message.tone ===
                  "success"
                  ? styles.success
                  : styles.error
              }
              role="status"
            >
              {message.text}
            </p>
          ) : null}

          <small>
            Accounts are created in
            Supabase Auth. There is no
            public administrator
            registration.
          </small>
        </form>
      </section>
    </main>
  );
}
