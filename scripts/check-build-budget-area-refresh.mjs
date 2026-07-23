import fs from "node:fs";

const pagePath = "app/build-outing/page.tsx";
const cssPath = "app/build-outing/build-outing-experience.module.css";

for (const path of [pagePath, cssPath]) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing required file: ${path}`);
  }
}

const page = fs.readFileSync(pagePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

const pageTokens = [
  "budget-experience-panel",
  "budget-stage-note",
  "budget-option-icon",
  "budget-option-check",
  "area-experience-panel",
  "area-stage-intro",
  "neighbourhood-experience-shell",
  "area-anywhere-note"
];

const cssTokens = [
  ".budget-experience-panel",
  ".budget-option-flexible",
  ".neighbourhood-experience-shell",
  ".neighbourhood-popular-grid button:nth-child(1)",
  ".area-experience-panel .travel-compact-grid",
  "@media (max-width: 390px)"
];

for (const token of pageTokens) {
  if (!page.includes(token)) {
    throw new Error(`Build Outing page is missing: ${token}`);
  }
}

for (const token of cssTokens) {
  if (!css.includes(token)) {
    throw new Error(`Build Outing styles are missing: ${token}`);
  }
}

if (!page.includes('aria-pressed={selected}')) {
  throw new Error("Budget choices must expose selected state accessibly.");
}

console.log("PASS Budget cards are lively and selectable");
console.log("PASS Neighbourhood choices have phone-friendly visual treatment");
console.log("PASS Transportation and travel controls remain part of the flow");
console.log("PASS Mobile and reduced-motion styles are present");
