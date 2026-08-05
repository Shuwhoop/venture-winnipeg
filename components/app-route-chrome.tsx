"use client";

import {
  Suspense
} from "react";

import {
  usePathname
} from "next/navigation";

import {
  AdminCommandBar
} from "@/components/admin/admin-command-bar";
import {
  VentureAnalytics
} from "@/components/analytics/venture-analytics";
import {
  BetaFeedback
} from "@/components/beta-feedback/beta-feedback";
import {
  BottomNav
} from "@/components/bottom-nav";
import {
  AppFoundationRuntime
} from "@/components/app-foundation/app-foundation";
import {
  AccountSyncRuntime
} from "@/components/account-sync/account-sync";

const ADMIN_AUTH_PATHS = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password"
];

function useRouteKind() {
  const pathname = usePathname();
  const isAdmin =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");
  const isAdminAuth =
    ADMIN_AUTH_PATHS.some(
      (path) => pathname.startsWith(path)
    );

  return {
    pathname,
    isAdmin,
    isAdminAuth
  };
}

export function AdminRouteChrome() {
  const {
    isAdmin,
    isAdminAuth
  } = useRouteKind();

  if (!isAdmin || isAdminAuth) {
    return null;
  }

  return <AdminCommandBar />;
}

export function PublicRouteChrome({
  analyticsEnabled,
  betaFeedbackEnabled
}: {
  analyticsEnabled: boolean;
  betaFeedbackEnabled: boolean;
}) {
  const {
    pathname,
    isAdmin
  } = useRouteKind();

  if (isAdmin) {
    return null;
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
      {betaFeedbackEnabled &&
      pathname === "/" ? (
        <BetaFeedback />
      ) : null}
    </>
  );
}
