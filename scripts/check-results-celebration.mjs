import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["app/build-outing/page.tsx", "OutingResultTransition", "Build page renders the transition"],
  ["app/build-outing/page.tsx", "isLaunchingResults", "Build page waits before navigating"],
  ["components/outing-result-transition.tsx", "WINNIPEG / CITY DISCOVERY", "Transition carries Venture identity"],
  ["components/outing-result-transition.module.css", ".bandGrid", "Transition has animated colour bands"],
  ["app/build-outing/results/page.tsx", "TONIGHT&apos;S ROUTE RECIPE", "Route recipe is refreshed"],
  ["app/build-outing/results/page.tsx", "ADVENTURE SNAPSHOT", "Results include the adventure snapshot"],
  ["app/build-outing/results/results-refresh.module.css", ".routeRecipeCard", "Recipe card has dedicated styling"],
  ["app/build-outing/results/results-refresh.module.css", ".statCard", "Summary cards have dedicated styling"]
];

let failed = false;

for (const [relative, needle, label] of checks) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    console.error(`FAIL ${label}: missing ${relative}`);
    failed = true;
    continue;
  }

  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(needle)) {
    console.error(`FAIL ${label}`);
    failed = true;
  } else {
    console.log(`PASS ${label}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("Venture results celebration checks passed.");
