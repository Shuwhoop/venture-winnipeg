import fs from "node:fs";

const pagePath = "app/build-outing/results/page.tsx";
const cssPath = "app/build-outing/results/results-refresh.module.css";

for (const path of [pagePath, cssPath]) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing required file: ${path}`);
  }
}

const page = fs.readFileSync(pagePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

const pageChecks = [
  "function SnapshotIcon",
  "function AddStopIcon",
  "Your night&apos;s little blueprint",
  "One more memory?",
  "addStopChoice"
];

const cssChecks = [
  ".snapshotBadge",
  ".snapshotRouteLine",
  ".addStopPanel",
  ".addStopChoice",
  "@keyframes addChoiceShine"
];

for (const value of pageChecks) {
  if (!page.includes(value)) {
    throw new Error(`Results page check failed: ${value}`);
  }
}

for (const value of cssChecks) {
  if (!css.includes(value)) {
    throw new Error(`Results CSS check failed: ${value}`);
  }
}

console.log("PASS Results snapshot and add-stop refresh is installed.");
