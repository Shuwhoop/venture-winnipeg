"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./venture-support-access.module.css";

export function VentureSupportAccess() {
  const pathname = usePathname();
  if (!pathname.startsWith("/profile")) return null;

  return (
    <Link className={styles.supportLink} href="/support" aria-label="Contact Venture support">
      <span className={styles.icon} aria-hidden="true">?</span>
      <span><strong>Need help?</strong><small>Contact Venture</small></span>
    </Link>
  );
}
