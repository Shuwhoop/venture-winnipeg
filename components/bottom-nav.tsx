"use client";

import {
  useEffect,
  useState
} from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getSavedListingReferences,
  SAVED_LISTINGS_EVENT
} from "@/lib/saved-listings";

const items = [
  {
    href: "/",
    label: "Home",
    icon: "⌂"
  },
  {
    href: "/explore",
    label: "Explore",
    icon: "⌕"
  },
  {
    href: "/tonight",
    label: "Tonight",
    icon: "✦",
    special: true
  },
  {
    href: "/saved",
    label: "Saved",
    icon: "♡"
  },
  {
    href: "/profile",
    label: "Profile",
    icon: "◉"
  }
];

export function BottomNav() {
  const pathname = usePathname();

  const [
    savedCount,
    setSavedCount
  ] = useState(0);

  useEffect(() => {
    function refreshSavedCount() {
      setSavedCount(
        getSavedListingReferences().length
      );
    }

    refreshSavedCount();

    window.addEventListener(
      SAVED_LISTINGS_EVENT,
      refreshSavedCount
    );

    window.addEventListener(
      "storage",
      refreshSavedCount
    );

    return () => {
      window.removeEventListener(
        SAVED_LISTINGS_EVENT,
        refreshSavedCount
      );

      window.removeEventListener(
        "storage",
        refreshSavedCount
      );
    };
  }, []);

  return (
    <nav
      className="bottom-nav"
      aria-label="Primary navigation"
    >
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(
                item.href
              );

        const isSavedLink =
          item.href === "/saved";

        return (
          <Link
            className={`nav-link ${
              active ? "active" : ""
            } ${
              item.special
                ? "special"
                : ""
            }`}
            href={item.href}
            key={item.href}
            aria-current={
              active ? "page" : undefined
            }
          >
            <span className="nav-icon">
              {item.icon}

              {isSavedLink &&
              savedCount > 0 ? (
                <b
                  className="saved-count-badge"
                  aria-label={`${savedCount} saved ${
                    savedCount === 1
                      ? "listing"
                      : "listings"
                  }`}
                >
                  {savedCount > 99
                    ? "99+"
                    : savedCount}
                </b>
              ) : null}
            </span>

            <small>{item.label}</small>
          </Link>
        );
      })}
    </nav>
  );
}