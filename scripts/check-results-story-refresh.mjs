import fs from "node:fs";

const checks = [
  ["app/build-outing/results/page.tsx", [
    "function SaveRouteIcon",
    "function ShareRouteIcon",
    "function RefreshRouteIcon",
    "function TravelModeIcon",
    "outing-travel-copy",
    "outing-travel-pulse",
    "YOUR NIGHT, SCENE BY SCENE",
    "styles.shareAction",
    "DetailChevron"
  ]],
  ["app/build-outing/results/results-refresh.module.css", [
    ".shareAction",
    ".saveIcon",
    ".refreshIcon",
    ".outing-travel-copy",
    "routeRailMove",
    "stopCardGleam",
    "travelPulse",
    "prefers-reduced-motion"
  ]]
];

for (const [file, needles] of checks) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file}`);
  }

  const text = fs.readFileSync(file, "utf8");

  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`${file} is missing: ${needle}`);
    }
  }
}

console.log("PASS Venture results story refresh structure");
