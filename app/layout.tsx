import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

export const metadata: Metadata = {
  title: "Venture | Discover Your City",
  description: "Find trustworthy events, restaurants, and complete outings across Winnipeg.",
  applicationName: "Venture",
};

export const viewport: Viewport = {
  themeColor: "#6d28d9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <a className="brand" href="/" aria-label="Venture home">
              <span className="brand-mark">V</span>
              <span>
                <strong>Venture</strong>
                <small>Discover Your City.</small>
              </span>
            </a>
            <button className="avatar" type="button" aria-label="Open profile">PM</button>
          </header>
          <main className="page-content">{children}</main>
          <BottomNav />
          <ServiceWorkerRegistration />
        </div>
      </body>
    </html>
  );
}
