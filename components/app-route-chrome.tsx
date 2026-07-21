"use client";

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
  const { isAdmin } = useRouteKind();

  if (isAdmin) {
    return null;
  }

  return (
    <>
      <BottomNav />
      {analyticsEnabled ? (
        <VentureAnalytics />
      ) : null}
      {betaFeedbackEnabled ? (
        <BetaFeedback />
      ) : null}
    </>
  );
}
