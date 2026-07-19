import type {
  Metadata,
  Viewport
} from "next";

import Link from "next/link";

import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./venture-theme.css";

import {
  BottomNav
} from "@/components/bottom-nav";

import {
  ServiceWorkerRegistration
} from "@/components/service-worker-registration";

export const metadata: Metadata = {
  title:
    "Venture by Boogie Bangers | Discover Your City",

  description:
    "Find trustworthy events, restaurants, and complete outings across Winnipeg.",

  applicationName:
    "Venture"
};

export const viewport: Viewport = {
  themeColor:
    "#ffcf00",

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
        className="venture-body"
        suppressHydrationWarning
      >
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

            <Link
              className="avatar"
              href="/profile"
              aria-label="Open profile"
            >
              PM
            </Link>
          </header>

          <main className="page-content">
            {children}
          </main>

          <BottomNav />

          <ServiceWorkerRegistration />
        </div>
      </body>
    </html>
  );
}