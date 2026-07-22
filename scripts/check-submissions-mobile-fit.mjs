import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cssPath = path.join(root, "app/admin/submissions/page.module.css");
const css = fs.readFileSync(cssPath, "utf8");

const checks = [
  ["submissions container enabled", css.includes("container-name: submissionsPage")],
  ["phone container breakpoint", css.includes("@container submissionsPage (max-width: 760px)")],
  ["filters collapse to one column", css.includes(".queueFilters {\n    grid-template-columns: 1fr;")],
  ["hero phone sizing", css.includes("font-size: clamp(2.25rem, 11cqw, 3.35rem)")],
  ["overflow clipped", css.includes("overflow-x: clip")]
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failed = true;
}

if (failed) process.exit(1);
console.log("Submissions mobile fit checks passed.");
