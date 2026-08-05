import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "app/saved/page.tsx",
  "app/saved/saved-v1.module.css",
  "components/saved/saved-listing-card.tsx",
  "components/saved-empty-state/saved-empty-state.tsx",
  "VENTURE_SAVED_V1_0.md"
];

const failures = [];

for (const relativePath of requiredFiles) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
  }
}

function read(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
}

if (failures.length === 0) {
  const page = read("app/saved/page.tsx");
  const card = read("components/saved/saved-listing-card.tsx");
  const empty = read("components/saved-empty-state/saved-empty-state.tsx");
  const styles = read("app/saved/saved-v1.module.css");

  const checks = [
    [page.includes('type SavedView ='), "Saved collection view types are missing."],
    [page.includes('placeholder="Search your saved collection"'), "Saved search is missing."],
    [page.includes('value: "places"'), "Places filter is missing."],
    [page.includes('value: "events"'), "Events filter is missing."],
    [page.includes('value: "outings"'), "Outings filter is missing."],
    [page.includes("handleUndo"), "Undo removal behaviour is missing."],
    [page.includes("SavedListingCard"), "The dedicated saved listing card is not connected."],
    [card.includes("/build-outing?anchor="), "Build-around action is missing."],
    [card.includes("/listings/"), "Listing detail action is missing."],
    [empty.includes('href="/build-outing"'), "The empty-state outing link is incorrect."],
    [styles.includes(".undoToast"), "Undo toast styling is missing."],
    [styles.includes(".tabs"), "Saved filter styling is missing."]
  ];

  for (const [passed, message] of checks) {
    if (!passed) {
      failures.push(message);
    }
  }

  const publicCopy = `${page}\n${card}\n${empty}`.toLowerCase();
  const privateTerms = [
    "rights checked",
    "photo rights protected",
    "approved for commercial use",
    "permission evidence"
  ];

  for (const term of privateTerms) {
    if (publicCopy.includes(term)) {
      failures.push(`Admin-only photo wording leaked into Saved: ${term}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Saved V1.0 structural check failed:\n");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("Saved V1.0 structural check passed.");
