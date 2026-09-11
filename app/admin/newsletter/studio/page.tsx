import Link from "next/link";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  getNewsletterProductionOverview
} from "@/lib/newsletter/production";

import {
  isNewsletterDeliveryConfigured,
  isNewsletterPostalAddressConfigured,
  isNewsletterWebhookConfigured
} from "@/lib/newsletter/resend";

import {
  NewsletterDraftVault
} from "./draft-vault";

import {
  NewsletterStudio
} from "./newsletter-studio";

import styles from "./page.module.css";


export const dynamic =
  "force-dynamic";


export default async function NewsletterStudioPage() {
  const admin =
    await requireVentureAdmin();

  const overview =
    await getNewsletterProductionOverview();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>
            NEWSLETTER PRODUCTION
          </span>

          <h1>
            The Thursday Venture studio
          </h1>

          <p>
            Prepare the issue, preview it, send a private test, and create a reviewable draft inside Resend.
          </p>
        </div>

        <nav aria-label="Newsletter admin navigation">
          <Link href="/admin/newsletter">
            Subscribers
          </Link>

          <Link href="/newsletter">
            Public page
          </Link>
        </nav>
      </header>

      <NewsletterDraftVault />

      <NewsletterStudio
        adminEmail={admin.email}
        initialOverview={{
          activeSubscribers:
            overview.activeSubscribers,
          subscriberError:
            overview.subscriberError,
          resources: {
            segment:
              overview.resources.segment,
            topic:
              overview.resources.topic,
            error:
              overview.resources.error
          },
          broadcasts:
            overview.broadcasts,
          broadcastsError:
            overview.broadcastsError,
          deliveryConfigured:
            isNewsletterDeliveryConfigured(),
          webhookConfigured:
            isNewsletterWebhookConfigured(),
          postalAddressConfigured:
            isNewsletterPostalAddressConfigured()
        }}
      />
    </main>
  );
}
