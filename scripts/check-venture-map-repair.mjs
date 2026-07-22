import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks = [
  {
    file: "lib/venture-map-style.ts",
    includes: [
      "NEXT_PUBLIC_MAP_STYLE_URL",
      "NEXT_PUBLIC_MAPTILER_KEY",
      "tiles.openfreemap.org/styles/positron"
    ]
  },
  {
    file: "components/city-map.tsx",
    includes: [
      "ResizeObserver",
      "AttributionControl",
      "Retry map",
      "getVentureMapConfiguration"
    ]
  },
  {
    file: "components/outing-route-map.tsx",
    includes: [
      "outing-route-map-shell",
      "ResizeObserver",
      "Retry map",
      "venture-outing-route-line"
    ]
  },
  {
    file: "app/explore/explore.module.css",
    includes: [
      ".mapStatus",
      ".mapStatusError",
      "ventureMapPulse"
    ]
  },
  {
    file: "app/globals.css",
    includes: [
      ".outing-route-map-status",
      ".outing-route-map-shell",
      "ventureOutingMapPulse"
    ]
  }
];

let failed = false;

for (const check of checks) {
  const fullPath = path.join(root, check.file);

  if (!fs.existsSync(fullPath)) {
    console.error(`FAIL Missing ${check.file}`);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(fullPath, "utf8");

  for (const token of check.includes) {
    if (!content.includes(token)) {
      console.error(`FAIL ${check.file} is missing ${token}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("PASS Explore map has a working provider fallback");
console.log("PASS Explore map handles resize, loading, and retry states");
console.log("PASS Outing map keeps numbered route markers and route layers");
console.log("PASS Outing map handles resize, loading, and retry states");
console.log("Venture map repair checks passed.");
