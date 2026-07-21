import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "app", "listings", "[slug]", "page.tsx");
const cssPath = path.join(root, "app", "listings", "[slug]", "page.module.css");

const problems = [];

for (const file of [pagePath, cssPath]) {
  if (!fs.existsSync(file)) problems.push(`Missing ${file}`);
}

if (problems.length === 0) {
  const page = fs.readFileSync(pagePath, "utf8");
  const css = fs.readFileSync(cssPath, "utf8");

  const pageChecks = [
    ["compact quick actions", "Make the next move"],
    ["collapsed weekly schedule", "View the full weekly schedule"],
    ["accessibility disclosure", "Accessibility"],
    ["transit disclosure", "Transit"],
    ["parking disclosure", "Parking"],
    ["compact phone action", ">Call</strong>"],
  ];

  const cssChecks = [
    ["container queries", "@container"],
    ["reduced-motion support", "prefers-reduced-motion"],
    ["entry animation", "@keyframes riseIn"],
    ["compact secondary actions", ".secondaryActions"],
    ["visit disclosure cards", ".disclosureCard"],
  ];

  for (const [label, needle] of pageChecks) {
    if (!page.includes(needle)) problems.push(`Missing ${label}`);
  }

  for (const [label, needle] of cssChecks) {
    if (!css.includes(needle)) problems.push(`Missing ${label}`);
  }
}

if (problems.length > 0) {
  console.error("Listing detail refresh check failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("Venture listing detail refresh check passed.");
