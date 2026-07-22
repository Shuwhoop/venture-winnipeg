import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  page: path.join(root, "app/admin/submissions/page.tsx"),
  client: path.join(root, "app/admin/submissions/moderation-queue-tools.tsx"),
  css: path.join(root, "app/admin/submissions/page.module.css")
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${label} file: ${file}`);
  }
}

const page = fs.readFileSync(files.page, "utf8");
const client = fs.readFileSync(files.client, "utf8");
const css = fs.readFileSync(files.css, "utf8");

const checks = [
  [page.includes("ModerationQueueTools"), "Search tools are rendered"],
  [page.includes('data-moderation-card="true"'), "Queue cards expose searchable metadata"],
  [page.includes("<details"), "Cards use expandable details elements"],
  [page.includes('id="imported-events"'), "Draft events have their own searchable section"],
  [page.includes('.from("events")'), "The page loads event drafts"],
  [page.includes("Edit full listing"), "Full editor actions remain available"],
  [client.includes("querySelectorAll"), "Client-side queue filtering is installed"],
  [client.includes("Expand visible"), "Bulk expand control is installed"],
  [client.includes("Collapse all"), "Bulk collapse control is installed"],
  [css.includes(".queueTools"), "Search panel styling is installed"],
  [css.includes(".cardSummary"), "Collapsed card styling is installed"],
  [css.includes(".inlineEditor"), "Nested quick-edit panel styling is installed"]
];

let failed = false;

for (const [ok, label] of checks) {
  if (ok) {
    console.log(`PASS ${label}`);
  } else {
    failed = true;
    console.error(`FAIL ${label}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("Submission search and expandable queue checks passed.");
