"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";

import { AdminCommandBar } from "@/components/admin/admin-command-bar";
import { VentureAnalytics } from "@/components/analytics/venture-analytics";
import { BetaFeedback } from "@/components/beta-feedback/beta-feedback";
import { BottomNav } from "@/components/bottom-nav";
import { AppFoundationRuntime } from "@/components/app-foundation/app-foundation";
import { AccountSyncRuntime } from "@/components/account-sync/account-sync";

const ADMIN_AUTH_PATHS = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password"
];

const PUBLICATION_PATHS = [
  "/newsletter",
  "/submit",
  "/privacy",
  "/terms",
  "/support",
  "/accessibility"
];

function isPublicationPath(pathname: string) {
  return (
    pathname === "/" ||
    PUBLICATION_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )
  );
}

function useRouteKind() {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminAuth = ADMIN_AUTH_PATHS.some((path) => pathname.startsWith(path));

  return {
    pathname,
    isAdmin,
    isAdminAuth,
    isPublication: isPublicationPath(pathname)
  };
}

export function AdminRouteChrome() {
  const { isAdmin, isAdminAuth } = useRouteKind();

  useEffect(() => {
    const shouldUseAdminShell = isAdmin && !isAdminAuth;

    document.body.classList.toggle(
      "venture-admin-route",
      shouldUseAdminShell
    );

    return () => {
      document.body.classList.remove("venture-admin-route");
    };
  }, [isAdmin, isAdminAuth]);

  if (!isAdmin || isAdminAuth) return null;

  return (
    <>
      <style>{`
        .venture-body.venture-admin-route .app-shell {
          width: min(100%, 1440px);
          padding-bottom: 28px;
        }

        .venture-body.venture-admin-route .page-content {
          padding: 22px clamp(16px, 2.4vw, 34px) 46px;
        }

        @media (max-width: 720px) {
          .venture-body.venture-admin-route .page-content {
            padding: 14px 10px 32px;
          }
        }
      `}</style>
      <AdminCommandBar />
    </>
  );
}

export function PublicRouteChrome({
  analyticsEnabled,
  betaFeedbackEnabled
}: {
  analyticsEnabled: boolean;
  betaFeedbackEnabled: boolean;
}) {
  const { pathname, isAdmin, isPublication } = useRouteKind();

  useEffect(() => {
    document.body.classList.toggle(
      "venture-publication-route",
      !isAdmin && isPublication
    );

    return () => {
      document.body.classList.remove("venture-publication-route");
    };
  }, [isAdmin, isPublication]);

  if (isAdmin) return null;

  if (isPublication) {
    return (
      <>
        <style>{`
          .venture-body.venture-publication-route {
            background:
              radial-gradient(circle at 12% 8%, rgba(255, 207, 0, .16), transparent 26%),
              radial-gradient(circle at 88% 18%, rgba(220, 47, 59, .11), transparent 24%),
              #fff8ef;
          }

          .venture-body.venture-publication-route .app-shell {
            width: min(100%, 1120px);
            padding-bottom: 30px;
          }

          .venture-body.venture-publication-route .app-header {
            margin: 14px clamp(10px, 2.4vw, 24px) 0;
            border: 2px solid #0b2b50;
            border-radius: 18px;
            background: rgba(255, 255, 255, .9);
            box-shadow: 4px 4px 0 rgba(11, 43, 80, .12);
          }

          .venture-body.venture-publication-route .profile-header-avatar {
            display: none;
          }

          .venture-body.venture-publication-route .page-content {
            padding: 18px clamp(8px, 2.4vw, 24px) 42px;
          }
        `}</style>
        {analyticsEnabled ? (
          <Suspense fallback={null}>
            <VentureAnalytics />
          </Suspense>
        ) : null}
      </>
    );
  }

  return (
    <>
      <AppFoundationRuntime showInstall={pathname === "/"} />
      <AccountSyncRuntime />
      <BottomNav />
      {analyticsEnabled ? (
        <Suspense fallback={null}>
          <VentureAnalytics />
        </Suspense>
      ) : null}
      {betaFeedbackEnabled && pathname === "/" ? <BetaFeedback /> : null}
    </>
  );
}
