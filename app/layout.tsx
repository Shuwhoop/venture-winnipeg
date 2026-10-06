import type {
  Metadata,
  Viewport
} from "next";

import Link from "next/link";

import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./venture-theme.css";
import "./venture-city-pulse-theme.css";
import "./venture-city-pulse-theme-v1-1.css";
import "./venture-dakota-polish.css";

import {
  AdminRouteChrome,
  PublicRouteChrome
} from "@/components/app-route-chrome";

import {
  ServiceWorkerRegistration
} from "@/components/service-worker-registration";
import {
  RouteAccessibilityRuntime
} from "@/components/accessibility/route-accessibility";
import {
  ProfileHeaderAvatar
} from "@/components/profile/profile-header-avatar";

import { VentureSupportAccess } from "@/components/venture-support-access";
export const metadata: Metadata = {
  title: "Venture",

  description:
    "Find what is happening in Winnipeg now: events, nightlife, food, culture, free finds, and local discoveries worth knowing about.",

  applicationName:
    "Venture",

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Venture"
  },

  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },

  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor:
    "#0b2b50",

  width:
    "device-width",

  initialScale: 1,

  viewportFit:
    "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="venture-body venture-app-first"
        suppressHydrationWarning
      >
        <a
          className="skip-link"
          href="#venture-main-content"
        >
          Skip to main content
        </a>

        <RouteAccessibilityRuntime />

        <div className="app-shell">
          <header className="app-header">
            <Link
              className="brand"
              href="/"
              aria-label="Venture by Boogie Bangers home"
            >
              <span className="brand-mark">
                <span>V</span>
                <i aria-hidden="true" />
              </span>

              <span className="brand-copy">
                <strong>
                  Venture
                </strong>

                <small>
                  Discover Your City.
                </small>
              </span>
            </Link>

            <ProfileHeaderAvatar />
          </header>

          <AdminRouteChrome />

          <div
            id="venture-main-content"
            className="page-content"
            tabIndex={-1}
          >
            {children}
          </div>

          <PublicRouteChrome
            analyticsEnabled={
              process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !==
              "false"
            }
            betaFeedbackEnabled={
              process.env.NEXT_PUBLIC_BETA_FEEDBACK_ENABLED !==
              "false"
            }
          />

          <ServiceWorkerRegistration />
        </div>
        <VentureSupportAccess />
      </body>
    </html>
  );
}
