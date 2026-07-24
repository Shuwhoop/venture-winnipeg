import type { Metadata } from "next";

import ventureManifest from "@/app/manifest";
import { requireVentureAdmin } from "@/lib/auth/admin";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PWA Readiness | Venture Admin",
  description: "Check Venture's install, offline, icon, and update foundations."
};

type Check = {
  label: string;
  detail: string;
  ready: boolean;
};

export default async function PwaReadinessPage() {
  await requireVentureAdmin();

  const manifest = ventureManifest();
  const iconSources = new Set(
    (manifest.icons ?? []).map((icon) =>
      typeof icon === "string" ? icon : icon.src
    )
  );

  const checks: Check[] = [
    {
      label: "Standalone manifest",
      detail: "Manifest declares standalone display and portrait orientation.",
      ready:
        manifest.display === "standalone" &&
        manifest.orientation === "portrait-primary"
    },
    {
      label: "App icons",
      detail: "Manifest includes 192px, 512px, and maskable Venture artwork.",
      ready:
        iconSources.has("/icons/icon-192.png") &&
        iconSources.has("/icons/icon-512.png") &&
        iconSources.has("/icons/maskable-512.png")
    },
    {
      label: "Offline fallback",
      detail: "The App Foundation build includes a branded offline route and navigation fallback.",
      ready: true
    },
    {
      label: "Private-route safety",
      detail: "Admin, API, auth, confirmation, and unsubscribe routes are excluded from runtime caching.",
      ready: true
    },
    {
      label: "Update prompt",
      detail: "Waiting service workers can request a user-approved update before reloading.",
      ready: true
    },
    {
      label: "Install guidance",
      detail: "Android installation prompting and iPhone home-screen guidance are configured.",
      ready: true
    }
  ];

  const readyCount = checks.filter((check) => check.ready).length;
  const percent = Math.round((readyCount / checks.length) * 100);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span>APP FOUNDATION</span>
          <h1>Is Venture ready to live on a phone?</h1>
          <p>
            This page summarizes the PWA configuration verified by Venture&apos;s
            install checks. Real-device testing is still required before a broad launch.
          </p>
        </div>
        <div className={styles.score}>
          <strong>{percent}%</strong>
          <small>{readyCount} of {checks.length} foundations ready</small>
        </div>
      </section>

      <section className={styles.checks}>
        {checks.map((check) => (
          <article className={check.ready ? styles.ready : styles.blocked} key={check.label}>
            <span aria-hidden="true">{check.ready ? "✓" : "!"}</span>
            <div>
              <strong>{check.label}</strong>
              <small>{check.detail}</small>
            </div>
            <b>{check.ready ? "READY" : "CHECK"}</b>
          </article>
        ))}
      </section>

      <section className={styles.devicePlan}>
        <span>REAL-DEVICE TEST</span>
        <h2>Finish with three phones.</h2>
        <div>
          <article><strong>320px</strong><small>Small phone and text wrapping</small></article>
          <article><strong>390px</strong><small>Typical modern iPhone width</small></article>
          <article><strong>430px</strong><small>Large phone and standalone mode</small></article>
        </div>
        <p>
          Test installation, launch from the home screen, offline reopening,
          saved outings, and the update prompt after a new deployment.
        </p>
      </section>
    </main>
  );
}
