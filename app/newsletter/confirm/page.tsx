import Link from "next/link";

import ConfirmForm from "./confirm-form";

import {
  verifyNewsletterToken
} from "@/lib/newsletter/tokens";

import styles from "../page.module.css";


export const dynamic =
  "force-dynamic";


export default async function ConfirmNewsletterPage({
  searchParams
}: {
  searchParams:
    Promise<{
      token?: string;
    }>;
}) {
  const parameters =
    await searchParams;

  const token =
    parameters.token ||
    "";

  const validToken =
    token
      ? verifyNewsletterToken({
          token,
          purpose:
            "confirm"
        })
      : null;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span>
          THE THURSDAY VENTURE
        </span>

        <h1>
          {validToken
            ? "One tap from Thursday."
            : "That confirmation link expired."}
        </h1>

        {validToken ? (
          <ConfirmForm
            token={token}
          />
        ) : (
          <div className={styles.preferencePanel}>
            <p>
              Submit the newsletter form again and Venture will send a fresh confirmation link.
            </p>

            <Link href="/newsletter">
              Get a new confirmation email
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
