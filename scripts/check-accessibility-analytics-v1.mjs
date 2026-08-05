import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(
    path.join(root, file),
    "utf8"
  );
}

function requireText(file, values) {
  const text = read(file);

  for (const value of values) {
    if (!text.includes(value)) {
      throw new Error(
        `${file} is missing: ${value}`
      );
    }
  }
}

requireText("app/layout.tsx", [
  "skip-link",
  "venture-main-content",
  "RouteAccessibilityRuntime"
]);

requireText(
  "components/accessibility/route-accessibility.tsx",
  [
    "aria-live=\"polite\"",
    "preventScroll: true",
    "page loaded"
  ]
);

requireText("app/venture-theme.css", [
  "VENTURE ACCESSIBILITY + ANALYTICS V1.0 START",
  "prefers-reduced-motion: reduce",
  "forced-colors: active"
]);

requireText("components/today-discovery.tsx", [
  "handleHorizontalRailKeyDown",
  "discovery_search_submitted",
  "listing_card_selected"
]);

requireText("components/explore-experience.tsx", [
  "discovery_results_viewed",
  "discovery_zero_results",
  "explore-list-tab",
  "explore-map-panel",
  "handleResultRailKeyDown"
]);

requireText("components/city-map.tsx", [
  "mapMotionDuration",
  "venture-map-description",
  "essential: false"
]);

requireText("lib/beta/client.ts", [
  "RECENT_EVENT_WINDOW_MS",
  "sanitizeAnalyticsProperties",
  "[email]",
  "[phone]",
  "isRecentDuplicate",
  "eventVersion: 3"
]);

requireText("lib/admin/analytics-lab.ts", [
  "buildJourneySignals",
  "zeroResultRate",
  "topSearches",
  "topFilters"
]);

requireText("app/admin/analytics/page.tsx", [
  "Discovery and conversion signals",
  "Top search phrases",
  "Most-used filters"
]);

const allowedText = read("lib/beta/types.ts");
const allowedBlock =
  allowedText.split("] as const")[0];
const allowed = new Set(
  Array.from(
    allowedBlock.matchAll(/"([a-z0-9_]+)"/g),
    (match) => match[1]
  )
);

const roots = ["app", "components", "lib"];
const invalid = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true
  })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) {
      continue;
    }

    if (
      entry.name.includes(".backup") ||
      entry.name.endsWith(".bak")
    ) {
      continue;
    }

    const text = fs.readFileSync(fullPath, "utf8");

    for (const match of text.matchAll(
      /eventName\s*:\s*["']([a-z0-9_]+)["']/g
    )) {
      if (!allowed.has(match[1])) {
        invalid.push(
          `${path.relative(root, fullPath)}: ${match[1]}`
        );
      }
    }
  }
}

for (const directory of roots) {
  walk(path.join(root, directory));
}

if (invalid.length > 0) {
  throw new Error(
    `Unknown analytics event names:\n${invalid.join("\n")}`
  );
}

console.log(
  "Venture Accessibility + Analytics V1.0 structural check passed."
);
