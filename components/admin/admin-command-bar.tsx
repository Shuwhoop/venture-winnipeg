"use client";

import Link from "next/link";
import {
  usePathname
} from "next/navigation";

import styles from "./admin-command-bar.module.css";

const GROUPS = [
  {
    title: "Listings and operations",
    links: [
      ["/admin/data-health", "Data health"],
      ["/admin/quick-repair", "Quick repair"],
      ["/admin/inventory-plan", "Inventory plan"],
      ["/admin/import", "Import inventory"],
      ["/admin/submissions", "Submissions"],
      ["/admin/reports", "Incorrect-info reports"],
      ["/admin/claims", "Business claims"]
    ]
  },
  {
    title: "Analytics and data science",
    links: [
      ["/admin/analytics", "Analytics overview"],
      ["/admin/analytics/funnels", "Funnels"],
      ["/admin/analytics/retention", "Retention"],
      ["/admin/analytics/inventory", "Inventory analytics"],
      ["/admin/analytics/feedback", "Feedback analysis"],
      ["/admin/experiments", "Experiments"],
      ["/admin/recommendations", "Recommendations"],
      ["/admin/data-pipeline", "Data pipeline"],
      ["/admin/beta", "Beta inbox"]
    ]
  },
  {
    title: "Public Venture",
    links: [
      ["/", "View homepage"],
      ["/explore", "Explore"],
      ["/build-outing", "Build outing"],
      ["/submit", "Submit listing"]
    ]
  }
] as const;

function isActive(
  pathname: string,
  href: string
): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href ||
    pathname.startsWith(`${href}/`);
}

function currentLabel(
  pathname: string
): string {
  for (const group of GROUPS) {
    const match = group.links.find(
      ([href]) => isActive(pathname, href)
    );

    if (match) {
      return match[1];
    }
  }

  if (
    pathname.startsWith(
      "/admin/listings/"
    )
  ) {
    return "Listing editor";
  }

  return "Admin workspace";
}

export function AdminCommandBar() {
  const pathname = usePathname();

  return (
    <nav
      className={styles.bar}
      aria-label="Venture administrator navigation"
    >
      <div className={styles.topRow}>
        <Link
          className={styles.homeLink}
          href="/admin"
        >
          <span className={styles.mark}>
            V
          </span>
          <span>
            Admin · {currentLabel(pathname)}
          </span>
        </Link>

        <div className={styles.quickLinks}>
          <Link
            href="/admin/data-health"
            className={
              isActive(
                pathname,
                "/admin/data-health"
              )
                ? styles.active
                : ""
            }
          >
            Listings
          </Link>
          <Link
            href="/admin/analytics"
            className={
              isActive(
                pathname,
                "/admin/analytics"
              )
                ? styles.active
                : ""
            }
          >
            Analytics
          </Link>
        </div>

        <details className={styles.details}>
          <summary className={styles.menuButton}>
            All admin tools
          </summary>

          <div className={styles.menu}>
            {GROUPS.map((group) => (
              <section
                className={styles.group}
                key={group.title}
              >
                <p className={styles.groupTitle}>
                  {group.title}
                </p>
                <div className={styles.links}>
                  {group.links.map(
                    ([href, label]) => (
                      <Link
                        href={href}
                        key={href}
                        className={
                          isActive(
                            pathname,
                            href
                          )
                            ? styles.active
                            : ""
                        }
                      >
                        {label}
                      </Link>
                    )
                  )}
                </div>
              </section>
            ))}
          </div>
        </details>
      </div>
    </nav>
  );
}
