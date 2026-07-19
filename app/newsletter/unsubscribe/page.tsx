import Link from "next/link";

import UnsubscribeForm from "./unsubscribe-form";

import {
  verifyNewsletterToken
} from "@/lib/newsletter/tokens";

import styles from "../page.module.css";


export const dynamic =
  "force-dynamic";


export default async function UnsubscribePage({
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
            "unsubscribe"
        })
      : null;

  return (
    <main
      className={
        styles.page
      }
    >
      <section
        className={
          styles.hero
        }
      >
        <span>
          EMAIL PREFERENCES
        </span>

        <h1>
          {validToken
            ? "Leaving the Thursday list?"
            : "That link did not work."}
        </h1>

        {validToken ? (
          <UnsubscribeForm
            token={token}
          />
        ) : (
          <>
            <p>
              The unsubscribe link is
              invalid or has expired.
            </p>

            <Link href="/">
              Return to Venture
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
