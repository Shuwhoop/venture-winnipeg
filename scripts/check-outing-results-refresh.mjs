import { readFileSync } from "node:fs";

const page = readFileSync(
  "app/build-outing/results/page.tsx",
  "utf8"
);

const css = readFileSync(
  "app/build-outing/results/results-refresh.module.css",
  "utf8"
);

const checks = [
  [page.includes('results-refresh.module.css'), "CSS module import"],
  [page.includes('expandedOrders'), "collapsible stop details"],
  [page.includes('Refresh unlocked'), "refresh action"],
  [page.includes('Show details'), "details toggle"],
  [page.includes('data-plan-status'), "plan status marker"],
  [css.includes('.refreshRoot'), "scoped results styles"],
  [css.includes('@media (max-width: 420px)'), "mobile breakpoint"],
  [css.includes('prefers-reduced-motion'), "reduced motion support"]
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  console.error("Outing results refresh check failed:");
  for (const [, label] of failed) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log("Venture outing results refresh check passed.");
