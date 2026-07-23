import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "app/build-outing/results/page.tsx");
const cssPath = path.join(root, "app/build-outing/results/results-refresh.module.css");

const page = fs.readFileSync(pagePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

const checks = [
  [!page.includes('className="outing-stop-reason"'), "Recommendation-reason callouts removed"],
  [!page.includes("{stop.reason}"), "Generated stop reason text removed"],
  [css.includes("grid-template-columns: 50px minmax(0, 1fr) 34px"), "Add-stop cards use a stable mobile grid"],
  [css.includes("word-break: normal !important"), "Add-stop copy avoids letter-by-letter wrapping"],
  [css.includes("overflow-wrap: normal !important"), "Add-stop copy keeps natural words"],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log("Results cleanup checks passed.");
