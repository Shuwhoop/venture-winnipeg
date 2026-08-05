import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "app/build-outing/results/page.tsx");
const cssPath = path.join(root, "app/build-outing/results/results-refresh.module.css");
const notesPath = path.join(root, "VENTURE_OUTING_RESULTS_V2_0.md");

const failures = [];

for (const file of [pagePath, cssPath, notesPath]) {
  if (!fs.existsSync(file)) {
    failures.push(`Missing required file: ${path.relative(root, file)}`);
  }
}

if (failures.length === 0) {
  const page = fs.readFileSync(pagePath, "utf8");
  const css = fs.readFileSync(cssPath, "utf8");

  const checks = [
    [page.includes('aria-label="Jump to a stop"'), "Quick Route navigation is missing."],
    [page.includes("getStopDomId"), "Stop jump targets are missing."],
    [page.includes("handleUndoRemove"), "Undo removal behaviour is missing."],
    [page.includes("setRemovedStopUndo"), "Removed-stop state is missing."],
    [!page.includes("window.confirm("), "The browser removal confirmation still exists."],
    [page.includes('sharing ? "Creating link..." : "Share"'), "Share loading feedback is missing."],
    [page.includes("StopFactIcon"), "Stop fact SVG icons are missing."],
    [page.includes("LockRouteIcon"), "Lock SVG state is missing."],
    [page.includes('"Plan this stop"'), "The clearer stop-detail action is missing."],
    [!page.includes("{option.fitReason}"), "Mechanical option fit reasons are still public."],
    [css.includes("VENTURE OUTING RESULTS V2.0 START"), "V2.0 style marker is missing."],
    [css.includes(".routeNavigator"), "Quick Route styling is missing."],
    [css.includes(".actionToast"), "Action and Undo toast styling is missing."],
    [css.includes("prefers-reduced-motion"), "Reduced-motion support is missing."]
  ];

  for (const [passed, message] of checks) {
    if (!passed) failures.push(message);
  }
}

if (failures.length > 0) {
  console.error("Outing Results V2.0 structural check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Venture Outing Results V2.0 structural check passed.");
