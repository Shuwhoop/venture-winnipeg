import {
  readFileSync
} from "node:fs";

import {
  resolve
} from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const files = {
  results: read("app/build-outing/results/page.tsx"),
  css: read("app/build-outing/results/results-refresh.module.css"),
  addStop: read("app/api/outings/generate/add-stop/route.ts"),
  replaceStop: read("app/api/outings/generate/replace-stop/route.ts"),
  removeStop: read("app/api/outings/generate/remove-stop/route.ts"),
  metrics: read("lib/outing-plan-metrics.ts"),
  betaTypes: read("lib/beta/types.ts"),
  detail: read("components/outing-detail-experience.tsx"),
  detailCss: read("components/outing-detail-experience.module.css")
};

const checks = [
  [
    files.results.includes("plan?.stops.length ?? 0"),
    "live stop count uses the stops array"
  ],
  [
    files.results.includes("openAddStopOptions") &&
      files.results.includes("BEST VERIFIED FITS"),
    "candidate-selection bottom sheet"
  ],
  [
    files.results.includes("selectedListingKey") &&
      files.results.includes("Your outing now has"),
    "selected candidate commit and live count feedback"
  ],
  [
    files.results.includes("handleRemoveStop") &&
      files.results.includes("/api/outings/generate/remove-stop"),
    "remove-stop control"
  ],
  [
    files.addStop.includes("previewOnly") &&
      files.addStop.includes("optionPreviews"),
    "add-stop preview API"
  ],
  [
    files.addStop.includes("withOutingPlanMetrics") &&
      !files.addStop.includes("planId:\n        crypto.randomUUID()"),
    "add-stop metrics and stable plan id"
  ],
  [
    files.replaceStop.includes("withOutingPlanMetrics") &&
      !files.replaceStop.includes("planId:\n        crypto.randomUUID()"),
    "replacement keeps totals and saved identity synchronized"
  ],
  [
    files.removeStop.includes("outing_stop_removed") &&
      files.removeStop.includes("rebuildTravel"),
    "remove-stop route recalculates travel"
  ],
  [
    files.metrics.includes("actualStopCount = plan.stops.length") &&
      files.metrics.includes("estimatedGroupTotalCad"),
    "shared outing metrics helper"
  ],
  [
    files.betaTypes.includes('"outing_stop_removed"'),
    "remove analytics event registered"
  ],
  [
    files.detail.includes("orderedStops") &&
      files.detail.includes(".slice(0, 5)"),
    "saved and shared route graphic is dynamic"
  ],
  [
    files.css.includes("Venture dynamic add-stop system v0.3") &&
      files.css.includes("addStopSheetBackdrop") &&
      files.css.includes("stopCountPop"),
    "bottom-sheet and count animations"
  ],
  [
    files.css.includes("#f4edff") &&
      files.css.includes("#fff1bd"),
    "lavender and warm-yellow palette preserved"
  ],
  [
    files.detailCss.includes("Dynamic saved/shared route count v0.3"),
    "dynamic route detail styling"
  ]
];

const failed = checks.filter(([passed]) => !passed);

if (failed.length > 0) {
  for (const [, label] of failed) {
    console.error(`FAILED: ${label}`);
  }

  process.exit(1);
}

for (const [, label] of checks) {
  console.log(`OK: ${label}`);
}

console.log("\nVENTURE DYNAMIC ADD-STOP VERIFIED");
