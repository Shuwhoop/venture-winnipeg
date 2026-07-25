import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? process.cwd();
const page = path.join(root, "app", "admin", "community", "page.tsx");
const css = path.join(root, "app", "admin", "community", "page.module.css");

for (const file of [page, css]) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file}`);
  }
}

const pageText = fs.readFileSync(page, "utf8");
const cssText = fs.readFileSync(css, "utf8");

const required = [
  "Build the month in three simple steps.",
  "Build the itinerary",
  "Edit the experience",
  "Guests and attendance",
  "Advanced details"
];

for (const value of required) {
  if (!pageText.includes(value)) {
    throw new Error(`Missing expected UI copy: ${value}`);
  }
}

if (!cssText.includes(".stepPanel")) {
  throw new Error("Missing simplified step-panel styling.");
}

console.log("VENTURE COMMUNITY BUILDER SIMPLIFIED VERIFIED");
