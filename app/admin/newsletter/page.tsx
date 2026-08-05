import Link from "next/link";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  isNewsletterDeliveryConfigured,
  isUsingResendTestSender
} from "@/lib/newsletter/resend";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import styles from "./page.module.css";


export const dynamic =
  "force-dynamic";


type NewsletterSubscriber = {
  id: string;
  first_name: string;
  email: string;
  status: string;
  consent_source: string;
  confirmed_at: string | null;
  confirmation_sent_at: string | null;
  confirmation_error: string | null;
  welcome_sent_at: string | null;
  welcome_error: string | null;
  last_signup_at: string;
  created_at: string;
};


function formatDate(
  value: string | null
): string {
  if (!value) {
    return "Not yet";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
      timeZone:
        "America/Winnipeg"
    }
  ).format(date);
}


export default async function AdminNewsletterPage({
  searchParams
}: {
  searchParams:
    Promise<{
      q?: string;
      status?: string;
    }>;
}) {
  const admin =
    await requireVentureAdmin();

  const parameters =
    await searchParams;

  const query =
    parameters.q
      ?.trim()
      .slice(0, 80) ||
    "";

  const status =
    parameters.status ||
    "all";

  const supabase =
    getSupabaseAdminClient();

  let request =
    supabase
      .from(
        "newsletter_subscribers"
      )
      .select(
        "id, first_name, email, status, consent_source, confirmed_at, confirmation_sent_at, confirmation_error, welcome_sent_at, welcome_error, last_signup_at, created_at"
      )
      .order(
        "last_signup_at",
        {
          ascending:
            false
        }
      )
      .limit(250);

  if (
    status !== "all"
  ) {
    request =
      request.eq(
        "status",
        status
      );
  }

  if (query) {
    const safeQuery =
      query.replaceAll(",", " ");

    request =
      request.or(
        `first_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`
      );
  }

  const result =
    await request;

  const subscribers =
    (result.data || []) as NewsletterSubscriber[];

  const allResult =
    await supabase
      .from(
        "newsletter_subscribers"
      )
      .select(
        "status"
      )
      .limit(5000);

  const allStatuses =
    (allResult.data || []) as {
      status: string;
    }[];

  const counts = {
    total:
      allStatuses.length,
    active:
      allStatuses.filter(
        (item) =>
          item.status ===
          "active"
      ).length,
    pending:
      allStatuses.filter(
        (item) =>
          item.status ===
          "pending"
      ).length,
    unsubscribed:
      allStatuses.filter(
        (item) =>
          item.status ===
          "unsubscribed"
      ).length
  };

  const deliveryConfigured =
    isNewsletterDeliveryConfigured();

  const testSender =
    isUsingResendTestSender();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>
            SECURE ADMIN TOOL
          </span>

          <h1>
            Thursday Venture subscribers
          </h1>

          <p>
            Review confirmations, delivery problems, and the active Winnipeg newsletter audience.
          </p>
        </div>

        <div className={styles.adminIdentity}>
          <small>
            Signed in as
          </small>

          <strong>
            {admin.email}
          </strong>
        </div>
      </header>

      <section className={styles.readiness}>
        <div className={deliveryConfigured ? styles.ready : styles.blocked}>
          <strong>
            {deliveryConfigured
              ? "Email delivery configured"
              : "Email delivery incomplete"}
          </strong>

          <p>
            {deliveryConfigured
              ? "Resend and the sender address are present."
              : "Add RESEND_API_KEY and VENTURE_EMAIL_FROM in Vercel."}
          </p>
        </div>

        <div className={testSender ? styles.warning : styles.ready}>
          <strong>
            {testSender
              ? "Beta sender only"
              : "Custom sender selected"}
          </strong>

          <p>
            {testSender
              ? "onboarding@resend.dev is best for testing with the Resend account email."
              : "Confirm the sender domain remains verified in Resend."}
          </p>
        </div>

        <Link href="/admin/newsletter/studio">
          Open campaign studio
        </Link>

        <Link href="/newsletter">
          Open public page
        </Link>
      </section>

      <section className={styles.metrics}>
        <div>
          <span>
            TOTAL
          </span>

          <strong>
            {counts.total}
          </strong>
        </div>

        <div>
          <span>
            ACTIVE
          </span>

          <strong>
            {counts.active}
          </strong>
        </div>

        <div>
          <span>
            PENDING
          </span>

          <strong>
            {counts.pending}
          </strong>
        </div>

        <div>
          <span>
            UNSUBSCRIBED
          </span>

          <strong>
            {counts.unsubscribed}
          </strong>
        </div>
      </section>

      <form className={styles.filters}>
        <label>
          <span>
            Search
          </span>

          <input
            defaultValue={query}
            name="q"
            placeholder="Name or email"
            type="search"
          />
        </label>

        <label>
          <span>
            Status
          </span>

          <select
            defaultValue={status}
            name="status"
          >
            <option value="all">
              All statuses
            </option>

            <option value="active">
              Active
            </option>

            <option value="pending">
              Pending confirmation
            </option>

            <option value="unsubscribed">
              Unsubscribed
            </option>

            <option value="bounced">
              Bounced
            </option>

            <option value="complained">
              Complained
            </option>
          </select>
        </label>

        <button type="submit">
          Apply filters
        </button>

        <Link href="/admin/newsletter">
          Clear
        </Link>
      </form>

      {result.error || allResult.error ? (
        <section className={styles.errorCard}>
          <strong>
            Newsletter data could not load
          </strong>

          <p>
            Apply the newsletter launch migration in Supabase, then reload this page.
          </p>

          <code>
            {result.error?.message ||
              allResult.error?.message}
          </code>
        </section>
      ) : subscribers.length === 0 ? (
        <section className={styles.empty}>
          <h2>
            No matching subscribers
          </h2>

          <p>
            New signups will appear here after the public form is used.
          </p>
        </section>
      ) : (
        <section className={styles.list}>
          {subscribers.map(
            (subscriber) => (
              <article
                key={subscriber.id}
                className={styles.subscriber}
              >
                <div className={styles.subscriberHeading}>
                  <div>
                    <span className={`${styles.status} ${styles[subscriber.status] || ""}`}>
                      {subscriber.status}
                    </span>

                    <h2>
                      {subscriber.first_name}
                    </h2>

                    <a href={`mailto:${subscriber.email}`}>
                      {subscriber.email}
                    </a>
                  </div>

                  <small>
                    {subscriber.consent_source}
                  </small>
                </div>

                <dl>
                  <div>
                    <dt>
                      Last signup
                    </dt>

                    <dd>
                      {formatDate(
                        subscriber.last_signup_at
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Confirmed
                    </dt>

                    <dd>
                      {formatDate(
                        subscriber.confirmed_at
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Confirmation sent
                    </dt>

                    <dd>
                      {formatDate(
                        subscriber.confirmation_sent_at
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Welcome sent
                    </dt>

                    <dd>
                      {formatDate(
                        subscriber.welcome_sent_at
                      )}
                    </dd>
                  </div>
                </dl>

                {subscriber.confirmation_error || subscriber.welcome_error ? (
                  <div className={styles.deliveryError}>
                    <strong>
                      Delivery note
                    </strong>

                    <p>
                      {subscriber.confirmation_error ||
                        subscriber.welcome_error}
                    </p>
                  </div>
                ) : null}
              </article>
            )
          )}
        </section>
      )}
    </main>
  );
}
