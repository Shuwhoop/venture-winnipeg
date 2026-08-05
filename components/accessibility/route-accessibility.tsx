"use client";

import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  usePathname
} from "next/navigation";

function getRouteLabel(
  pathname: string
): string {
  if (pathname === "/") {
    return "Today";
  }

  if (pathname === "/explore") {
    return "Explore";
  }

  if (pathname === "/saved") {
    return "Saved";
  }

  if (pathname === "/profile") {
    return "Profile";
  }

  if (pathname === "/build-outing") {
    return "Build an outing";
  }

  if (pathname === "/build-outing/results") {
    return "Your outing plan";
  }

  if (pathname.startsWith("/listings/")) {
    return "Listing details";
  }

  if (pathname.startsWith("/outings/")) {
    return "Shared outing";
  }

  if (pathname.startsWith("/admin")) {
    return "Venture administration";
  }

  return pathname
    .split("/")
    .filter(Boolean)
    .map((part) =>
      part
        .replaceAll("-", " ")
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase()
        )
    )
    .join(" · ") || "Venture";
}

export function RouteAccessibilityRuntime() {
  const pathname = usePathname();
  const previousPathRef = useRef(pathname);
  const [announcement, setAnnouncement] =
    useState("");

  useEffect(() => {
    if (
      previousPathRef.current ===
      pathname
    ) {
      return;
    }

    previousPathRef.current = pathname;

    const frame =
      window.requestAnimationFrame(() => {
        const main =
          document.getElementById(
            "venture-main-content"
          );

        main?.focus({
          preventScroll: true
        });

        setAnnouncement(
          `${getRouteLabel(pathname)} page loaded.`
        );
      });

    return () =>
      window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div
      className="route-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {announcement}
    </div>
  );
}
