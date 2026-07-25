"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDDEN_PATHS = [
  "/build-outing",
  "/listings",
  "/admin",
  "/sign-in",
  "/offline"
];

export function FloatingBuildAction() {
  const pathname = usePathname();

  if (
    HIDDEN_PATHS.some((path) =>
      pathname.startsWith(path)
    )
  ) {
    return null;
  }

  return (
    <Link
      className="floating-build-action"
      href="/build-outing"
      aria-label="Build an outing"
    >
      <span aria-hidden="true">＋</span>
      <strong>Build an Outing</strong>
    </Link>
  );
}
