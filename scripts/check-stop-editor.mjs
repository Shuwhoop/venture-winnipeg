import {
  existsSync,
  readFileSync
} from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const files = {
  page: resolve(root, "app/build-outing/results/page.tsx"),
  css: resolve(root, "app/build-outing/results/results-refresh.module.css"),
  replaceRoute: resolve(root, "app/api/outings/generate/replace-stop/route.ts"),
  removeRoute: resolve(root, "app/api/outings/generate/remove-stop/route.ts"),
  schedule: resolve(root, "lib/outing-schedule-validation.ts"),
  notes: resolve(root, "VENTURE_STOP_EDITOR.md")
};

for (const [name, file] of Object.entries(files)) {
  if (!existsSync(file)) {
    throw new Error(`Missing ${name}: ${file}`);
  }
}

const page = readFileSync(files.page, "utf8");
const css = readFileSync(files.css, "utf8");
const replaceRoute = readFileSync(files.replaceRoute, "utf8");
const removeRoute = readFileSync(files.removeRoute, "utf8");
const schedule = readFileSync(files.schedule, "utf8");

const requirements = [
  [page, 'from "@/lib/outing-schedule-validation"', "schedule validator import"],
  [page, "openReplacementOptions", "replacement chooser"],
  [page, "applyReplacementOption", "replacement application"],
  [page, "handleRemoveStop", "remove-stop action"],
  [page, "stopMenuPanel", "per-stop edit menu"],
  [page, "Open directions", "directions action"],
  [page, "SMART ROUTE CHECK", "timing warning interface"],
  [page, "Fix the timing", "timing repair action"],
  [page, "replacementSheetOrder", "replacement mobile sheet"],
  [css, ".scheduleCheckCard", "schedule warning styles"],
  [css, ".stopMenuPanel", "stop menu styles"],
  [css, ".replacementSheet", "replacement panel styles"],
  [css, ":global(body.venture-route-reordering) .refreshRoot", "CSS Modules-safe drag selector"],
  [replaceRoute, "previewOnly", "replacement preview mode"],
  [replaceRoute, "replacementListingKey", "replacement identity response"],
  [replaceRoute, "if (!previewOnly)", "preview analytics guard"],
  [removeRoute, "repairOutingSchedule", "remove-stop timing repair"],
  [schedule, "export function validateOutingSchedule", "schedule validation utility"],
  [schedule, "place-closes-", "business-hours warning"],
  [schedule, "event-start-", "fixed-event warning"],
  [schedule, "outing-runs-late", "outing-window warning"],
  [schedule, "export function repairOutingSchedule", "timing repair utility"]
];

for (const [content, marker, label] of requirements) {
  if (!content.includes(marker)) {
    throw new Error(`Verification failed: ${label}`);
  }
}

if (css.includes(":global(body.venture-route-reordering) {")) {
  throw new Error(
    "Verification failed: the old impure CSS Modules selector is still present."
  );
}

console.log("VENTURE STOP EDITOR VERIFIED");
