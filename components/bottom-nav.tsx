"use client";

import {
  useEffect,
  useState
} from "react";

import Link from "next/link";

import {
  usePathname
} from "next/navigation";

import {
  getSavedListingReferences,
  SAVED_LISTINGS_EVENT
} from "@/lib/saved-listings";

import {
  getSavedOutings,
  SAVED_OUTINGS_EVENT
} from "@/lib/saved-outings";

type NavIconName =
  | "home"
  | "explore"
  | "build"
  | "saved"
  | "profile";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  special?: boolean;
};

const items: NavItem[] = [
  {
    href: "/",
    label: "Today",
    icon: "home"
  },
  {
    href: "/explore",
    label: "Explore",
    icon: "explore"
  },
  {
    href: "/build-outing",
    label: "Build",
    icon: "build",
    special: true
  },
  {
    href: "/saved",
    label: "Saved",
    icon: "saved"
  },
  {
    href: "/profile",
    label: "Profile",
    icon: "profile"
  }
];

function NavigationIcon({
  name
}: {
  name: NavIconName;
}) {
  if (name === "home") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-9Z"
        />

        <path
          d="M9 21v-7h6v7"
        />
      </svg>
    );
  }

  if (name === "explore") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
        />

        <path
          d="m15.8 8.2-2.2 5.4-5.4 2.2 2.2-5.4 5.4-2.2Z"
        />
      </svg>
    );
  }

  if (name === "build") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M12 2.7 14 8l5.3 2-5.3 2-2 5.3-2-5.3-5.3-2 5.3-2 2-5.3Z"
        />

        <path
          d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"
        />
      </svg>
    );
  }

  if (name === "saved") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M20.8 8.7c0 5.5-8.8 11-8.8 11s-8.8-5.5-8.8-11A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
      />

      <path
        d="M4.5 21c.5-5 3-7.5 7.5-7.5s7 2.5 7.5 7.5"
      />
    </svg>
  );
}

export function BottomNav() {
  const pathname =
    usePathname();

  const [
    savedCount,
    setSavedCount
  ] = useState(0);

  useEffect(() => {
    function refreshSavedCount() {
      const savedListings =
        getSavedListingReferences()
          .length;

      const savedOutings =
        getSavedOutings()
          .length;

      setSavedCount(
        savedListings +
        savedOutings
      );
    }

    refreshSavedCount();

    window.addEventListener(
      SAVED_LISTINGS_EVENT,
      refreshSavedCount
    );

    window.addEventListener(
      SAVED_OUTINGS_EVENT,
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
        SAVED_OUTINGS_EVENT,
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
              active
                ? "active"
                : ""
            } ${
              item.special
                ? "special"
                : ""
            }`}
            href={item.href}
            key={item.href}
            aria-current={
              active
                ? "page"
                : undefined
            }
          >
            <span className="nav-icon">
              <NavigationIcon
                name={item.icon}
              />

              {isSavedLink &&
              savedCount > 0 ? (
                <b
                  className="saved-count-badge"
                  aria-label={`${savedCount} saved ${
                    savedCount === 1
                      ? "item"
                      : "items"
                  }`}
                >
                  {savedCount > 99
                    ? "99+"
                    : savedCount}
                </b>
              ) : null}
            </span>

            <small>
              {item.label}
            </small>
          </Link>
        );
      })}
    </nav>
  );
}