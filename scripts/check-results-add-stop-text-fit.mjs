import fs from "node:fs";

const page = fs.readFileSync("app/build-outing/results/page.tsx", "utf8");
const css = fs.readFileSync("app/build-outing/results/results-refresh.module.css", "utf8");

const checks = [
  [page.includes("Find a bite near the route"), "Food helper copy is refreshed"],
  [page.includes("Add something happening"), "Event helper copy is refreshed"],
  [page.includes("Finish with a relaxed drink"), "Drinks helper copy is refreshed"],
  [css.includes('button) > .addStopCopy'), "Copy span override is present"],
  [css.includes("width: auto !important"), "Copy width is released from the old icon rule"],
  [css.includes("word-break: keep-all !important"), "Words no longer split letter by letter"],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log("Results add-stop text-fit checks passed.");
