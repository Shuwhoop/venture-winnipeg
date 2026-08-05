"use client";

import {
  useEffect
} from "react";

import {
  usePathname,
  useSearchParams
} from "next/navigation";

import {
  getBetaIdentity,
  hasTrackedSessionStart,
  markSessionStartTracked,
  trackBetaEvent
} from "@/lib/beta/client";

function getPageGroup(
  pathname: string
): string {
  if (pathname === "/") {
    return "home";
  }

  if (
    pathname === "/explore" ||
    pathname === "/tonight"
  ) {
    return "discovery";
  }

  if (pathname.startsWith("/listings/")) {
    return "listing";
  }

  if (pathname.startsWith("/build-outing")) {
    return "outing-builder";
  }

  if (pathname.startsWith("/outings/")) {
    return "shared-outing";
  }

  if (pathname === "/saved") {
    return "saved";
  }

  if (pathname === "/newsletter") {
    return "newsletter";
  }

  return "other";
}

export function VentureAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const query =
    searchParams.get("q") ?? "";
  const filter =
    searchParams.get("filter");
  const when =
    searchParams.get("when");
  const price =
    searchParams.get("price");
  const occasion =
    searchParams.get("occasion");
  const areaSelected =
    Boolean(searchParams.get("area"));
  const nearbyRequested =
    searchParams.get("near") === "me";
  const isAdmin =
    pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    const identity =
      getBetaIdentity();

    const timeout =
      window.setTimeout(() => {
        if (!hasTrackedSessionStart()) {
          trackBetaEvent({
            eventName:
              "session_started",
            pagePath:
              pathname,
            properties: {
              entryPath:
                pathname,
              isNewVisitor:
                identity.isNewVisitor
            }
          });

          markSessionStartTracked();
        }

        trackBetaEvent({
          eventName:
            "page_view",
          pagePath:
            pathname,
          properties: {
            pageGroup:
              getPageGroup(pathname),
            hasSearchParameters:
              searchKey.length > 0,
            queryLength:
              query.trim().length,
            filter,
            when,
            price,
            occasion,
            areaSelected,
            nearbyRequested
          }
        });

        if (
          pathname === "/explore" ||
          pathname === "/tonight"
        ) {
          trackBetaEvent({
            eventName:
              "discovery_viewed",
            pagePath:
              pathname,
            properties: {
              surface:
                pathname === "/tonight"
                  ? "tonight"
                  : "explore"
            }
          });
        } else if (
          pathname === "/build-outing"
        ) {
          trackBetaEvent({
            eventName:
              "outing_builder_opened",
            pagePath:
              pathname
          });
        } else if (
          pathname ===
          "/build-outing/results"
        ) {
          trackBetaEvent({
            eventName:
              "outing_result_viewed",
            pagePath:
              pathname
          });
        } else if (
          pathname.startsWith("/outings/")
        ) {
          trackBetaEvent({
            eventName:
              "shared_outing_viewed",
            pagePath:
              pathname
          });
        } else if (
          pathname === "/saved"
        ) {
          trackBetaEvent({
            eventName:
              "saved_page_viewed",
            pagePath:
              pathname
          });
        }
      }, 350);

    return () =>
      window.clearTimeout(timeout);
  }, [
    areaSelected,
    filter,
    isAdmin,
    nearbyRequested,
    occasion,
    pathname,
    price,
    query,
    searchKey,
    when
  ]);

  return null;
}
