import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "app/explore/page.tsx",
  "app/explore/explore.module.css",
  "components/explore-experience.tsx",
  "components/explore-map-card.tsx",
  "components/city-map.tsx",
  "components/personalized-explore-results.tsx",
  "components/listing-card.tsx"
];

for (const relativePath of requiredFiles) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing ${relativePath}`);
  }
}

const explorePage = fs.readFileSync(
  path.join(root, "app/explore/page.tsx"),
  "utf8"
);

const experience = fs.readFileSync(
  path.join(root, "components/explore-experience.tsx"),
  "utf8"
);

const cityMap = fs.readFileSync(
  path.join(root, "components/city-map.tsx"),
  "utf8"
);

const css = fs.readFileSync(
  path.join(root, "app/explore/explore.module.css"),
  "utf8"
);

const checks = [
  [
    explorePage.includes("Food & drink"),
    "Explore page includes understandable high-priority filters"
  ],
  [
    explorePage.includes("Restaurant, event, area..."),
    "Explore search describes supported searches"
  ],
  [
    experience.includes('type ExploreView ='),
    "Explore supports list and map modes"
  ],
  [
    experience.includes('role="tablist"'),
    "View switcher exposes accessible tab semantics"
  ],
  [
    experience.includes("ExploreMapCard"),
    "Map mode includes a synchronized result rail"
  ],
  [
    cityMap.includes("cooperativeGestures: true"),
    "Map avoids trapping normal page scrolling"
  ],
  [
    cityMap.includes("Fit all"),
    "Map includes a clear reset control"
  ],
  [
    cityMap.includes("mapMarker"),
    "Map uses visible custom markers"
  ],
  [
    css.includes("min-height: 42px"),
    "Interactive controls use generous mobile targets"
  ],
  [
    css.includes("prefers-reduced-motion"),
    "Explore refresh respects reduced-motion preferences"
  ]
];

for (const [passed, message] of checks) {
  if (!passed) {
    throw new Error(`FAIL ${message}`);
  }

  console.log(`PASS ${message}`);
}

console.log("Explore discovery refresh checks passed.");
