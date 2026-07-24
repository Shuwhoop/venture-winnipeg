import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "app/build-outing/results/page.tsx");
const cssPath = path.join(root, "app/build-outing/results/results-refresh.module.css");

const page = fs.readFileSync(pagePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

const checks = [
  [page.includes("styles.whenCard"), "combined date and start card"],
  [page.includes("styles.whenMain"), "primary date layout"],
  [page.includes("styles.whenTime"), "contained start-time layout"],
  [css.includes("Venture results blueprint balance v0.1"), "blueprint refresh styles"],
  [css.includes("@media (max-width: 330px)"), "small-phone fallback"],
];

let failed = false;
for (const [passed, label] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  failed ||= !passed;
}

if (failed) process.exit(1);
console.log("Results blueprint balance checks passed.");
