import fs from "node:fs";
import path from "node:path";

const root = process.argv[2]
  ? path.resolve(process.argv[2])
  : process.cwd();

const componentPath = path.join(
  root,
  "components/today-discovery.tsx"
);
const cssPath = path.join(
  root,
  "components/today-discovery.module.css"
);

for (const file of [componentPath, cssPath]) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${path.relative(root, file)}`);
  }
}

const component = fs.readFileSync(
  componentPath,
  "utf8"
);
const css = fs.readFileSync(
  cssPath,
  "utf8"
);

const checks = [
  [
    component.includes("WINNIPEG IS MOVING"),
    "City ticker is missing"
  ],
  [
    component.includes("FeaturedListing"),
    "Featured Venture pick is missing"
  ],
  [
    component.includes("modeGrid"),
    "Quick discovery grid is missing"
  ],
  [
    component.includes("Build my outing"),
    "Primary outing-builder action is missing"
  ],
  [
    component.includes("YOUR UNEXPLORED CITY"),
    "New-to-Me discovery rail is missing"
  ],
  [
    css.includes("var(--venture-yellow"),
    "Venture yellow theme token is missing"
  ],
  [
    css.includes("var(--venture-red"),
    "Venture red theme token is missing"
  ],
  [
    css.includes("--home-pink: #e88d8b"),
    "Venture coral accent is missing"
  ],
  [
    !css.includes("#7c3aed") &&
      !css.includes("#6d28d9") &&
      !css.includes("#8b5cf6"),
    "Old purple homepage colours are still present"
  ],
  [
    css.includes("prefers-reduced-motion"),
    "Reduced-motion support is missing"
  ]
];

for (const [passed, message] of checks) {
  if (!passed) {
    throw new Error(message);
  }
}

console.log(
  "VENTURE PRIMARY HOMEPAGE VERIFIED"
);
