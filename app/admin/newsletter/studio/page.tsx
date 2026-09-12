import Link from "next/link";

import { requireVentureAdmin } from "@/lib/auth/admin";
import { getNewsletterProductionOverview } from "@/lib/newsletter/production";
import {
  isNewsletterDeliveryConfigured,
  isNewsletterPostalAddressConfigured,
  isNewsletterWebhookConfigured
} from "@/lib/newsletter/resend";

import { NewsletterDraftVault } from "./draft-vault";
import { NewsletterEditorialBuilder } from "./editorial-builder";
import { NewsletterProductionPanel } from "./production-panel";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function NewsletterStudioPage() {
  await requireVentureAdmin();
  const overview = await getNewsletterProductionOverview();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>NEWSLETTER PRODUCTION</span>
          <h1>The Thursday Venture studio</h1>
          <p>
            Build the Winnipeg edit story by story, add only the details that
            actually help, then preview the finished issue before it ever
            reaches Resend.
          </p>
        </div>

        <nav aria-label="Newsletter admin navigation">
          <Link href="/admin/newsletter/tips">Editorial inbox</Link>
          <Link href="/admin/newsletter">Subscribers</Link>
          <Link href="/newsletter">Public page</Link>
        </nav>
      </header>

      <NewsletterProductionPanel
        initialOverview={{
          activeSubscribers: overview.activeSubscribers,
          subscriberError: overview.subscriberError,
          resources: {
            segment: overview.resources.segment,
            topic: overview.resources.topic,
            error: overview.resources.error
          },
          deliveryConfigured: isNewsletterDeliveryConfigured(),
          webhookConfigured: isNewsletterWebhookConfigured(),
          postalAddressConfigured: isNewsletterPostalAddressConfigured()
        }}
      />

      <NewsletterEditorialBuilder />
      <NewsletterDraftVault />
    </main>
  );
}
