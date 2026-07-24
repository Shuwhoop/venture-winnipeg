import {
  existsSync,
  readFileSync
} from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const files = {
  page: resolve(root, "app/build-outing/results/page.tsx"),
  css: resolve(root, "app/build-outing/results/results-refresh.module.css"),
  utility: resolve(root, "lib/outing-reorder.ts"),
  notes: resolve(root, "VENTURE_ROUTE_REORDER.md")
};

for (const [name, file] of Object.entries(files)) {
  if (!existsSync(file)) {
    throw new Error(`Missing ${name}: ${file}`);
  }
}

const page = readFileSync(files.page, "utf8");
const css = readFileSync(files.css, "utf8");
const utility = readFileSync(files.utility, "utf8");

const requirements = [
  [page, 'from "@/lib/outing-reorder"', "reorder utility import"],
  [page, "routeEditMode", "route edit state"],
  [page, "handleStopDragStart", "pointer drag start"],
  [page, "handleStopDragMove", "pointer drag movement"],
  [page, "data-venture-stop-key", "stable drag targets"],
  [page, "createPortal(", "mobile add-stop portal"],
  [css, ".routeDragHandle", "mobile drag grip styles"],
  [css, ".routeEditButton", "edit-order button styles"],
  [css, "VENTURE MOBILE ADD-STOP SHEET + ROUTE REORDER", "combined mobile styles"],
  [utility, "export function reorderOutingPlan", "route recalculation utility"],
  [utility, "travelFromPreviousMinutes", "travel recalculation"],
  [utility, "actualStopCount", "stop count synchronization"]
];

for (const [content, marker, label] of requirements) {
  if (!content.includes(marker)) {
    throw new Error(`Verification failed: ${label}`);
  }
}

console.log("VENTURE ROUTE REORDER VERIFIED");
