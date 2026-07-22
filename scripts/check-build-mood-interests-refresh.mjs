import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "app", "build-outing", "page.tsx");
const cssPath = path.join(root, "app", "build-outing", "build-outing-experience.module.css");

const page = fs.readFileSync(pagePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

const checks = [
  [page.includes("function getInterestIcon"), "interest icons are defined"],
  [page.includes('className="outing-personalization-panel mood-stage-panel"'), "mood panels use the refreshed layout"],
  [page.includes('className="outing-experience-copy"'), "mood and pace text have stable wrappers"],
  [page.includes('className="wizard-compact-panel interest-stage-panel"'), "interest step uses the refreshed panel"],
  [page.includes('className="interest-chip-icon"'), "interest chips include visible icons"],
  [css.includes("Mood + Interests phone refresh v0.1"), "refresh styles are present"],
  [css.includes("word-break: keep-all"), "titles cannot collapse letter by letter"],
  [css.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"), "interest cards use a phone-safe grid"],
  [css.includes("@media (max-width: 390px)"), "small-phone rules are present"],
  [css.includes("prefers-reduced-motion"), "reduced-motion support remains present"]
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log("Build mood and interests refresh checks passed.");
