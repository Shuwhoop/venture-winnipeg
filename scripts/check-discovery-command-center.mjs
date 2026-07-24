import fs from "node:fs";
import path from "node:path";

const root = process.argv[2]
  ? path.resolve(process.argv[2])
  : process.cwd();

const required = [
  "app/page.tsx",
  "app/explore/page.tsx",
  "app/explore/explore.module.css",
  "components/today-discovery.tsx",
  "components/today-discovery.module.css",
  "components/discovery-filter-sheet.tsx",
  "components/discovery-filter-sheet.module.css",
  "components/explore-experience.tsx",
  "lib/discovery-intent.ts"
];

for (const relative of required) {
  const full = path.join(root, relative);

  if (!fs.existsSync(full)) {
    throw new Error(`Missing ${relative}`);
  }
}

const read = (relative) =>
  fs.readFileSync(
    path.join(root, relative),
    "utf8"
  );

const home = read("app/page.tsx");
const explore = read("app/explore/page.tsx");
const experience = read(
  "components/explore-experience.tsx"
);
const today = read(
  "components/today-discovery.tsx"
);
const intent = read(
  "lib/discovery-intent.ts"
);
const filterSheet = read(
  "components/discovery-filter-sheet.tsx"
);

const checks = [
  [
    home.includes("TodayDiscovery"),
    "Today screen is not connected"
  ],
  [
    explore.includes("parseDiscoveryIntent"),
    "Natural-language discovery is missing"
  ],
  [
    explore.includes("DiscoveryFilterSheet"),
    "Filter sheet is not connected"
  ],
  [
    experience.includes("newToMeOnly"),
    "New-to-Me explore filtering is missing"
  ],
  [
    experience.includes("VISIT_HISTORY_EVENT"),
    "Visit-history live refresh is missing"
  ],
  [
    today.includes("YOUR UNEXPLORED CITY"),
    "Today New-to-Me rail is missing"
  ],
  [
    intent.includes("cheap|affordable"),
    "Budget-language interpretation is missing"
  ],
  [
    filterSheet.includes("createPortal"),
    "Mobile filter sheet portal is missing"
  ]
];

for (const [passed, message] of checks) {
  if (!passed) {
    throw new Error(message);
  }
}

console.log(
  "VENTURE DISCOVERY COMMAND CENTER VERIFIED"
);
