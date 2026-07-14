"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/explore", label: "Explore", icon: "⌕" },
  { href: "/tonight", label: "Tonight", icon: "✦", special: true },
  { href: "/saved", label: "Saved", icon: "♡" },
  { href: "/profile", label: "Profile", icon: "◉" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            className={`nav-link ${active ? "active" : ""} ${item.special ? "special" : ""}`}
            href={item.href}
            key={item.href}
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </Link>
        );
      })}
    </nav>
  );
}
