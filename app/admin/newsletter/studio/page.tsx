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
  LegacyNewsletterDraftMigration
} from "./legacy-draft-migration";

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
      <LegacyNewsletterDraftMigration />

      <header className={styles.hero}>
        <div>
          <span>
            NEWSLETTER PRODUCTION
          </span>

          <h1>
            The Thursday Venture studio
          </h1>

          <p>
            The Draft Vault above is the source of truth for the full editorial issue. Preview it, send yourself the real issue test, then create a reviewable Resend draft. The editor below is only a quick starter workspace.
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
