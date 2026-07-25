import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(relativePath, snippets) {
  const content = read(relativePath);
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      throw new Error(`${relativePath} is missing: ${snippet}`);
    }
  }
  return content;
}

requireText("components/bottom-nav.tsx", [
  'href: "/map"',
  'label: "Map"',
  'label: "Today"',
  'label: "Explore"',
  'label: "Saved"',
  'label: "Profile"'
]);

requireText("components/floating-build-action.tsx", [
  'className="floating-build-action"',
  'Build an Outing'
]);

requireText("app/map/page.tsx", [
  "City Map",
  'initialView="map"'
]);

requireText("app/explore/page.tsx", [
  'value: "activities"',
  'label: "Activities"',
  'value: "nightlife"',
  'value: "attractions"',
  'value: "shopping"'
]);

requireText("components/city-map.tsx", [
  "getCatalogueIcon",
  "markerButton.dataset.kind",
  "`Show ${listing.name}`"
]);

const mapSource = read("components/city-map.tsx");
if (mapSource.includes("index + 1") || mapSource.includes("mapIndex")) {
  throw new Error("Catalogue map markers are still numbered.");
}

requireText("app/build-outing/page.tsx", [
  'kind="activity"',
  "anchorDurationMinutes",
  "anchorPlacement",
  "Before anchor",
  "After anchor",
  "Both sides",
  "Suggested time:"
]);

requireText("app/api/outings/generate/route.ts", [
  'value === "activity"',
  "draft.anchorDurationMinutes",
  'draft.anchorPlacement ===',
  'candidate.kind === "activity"',
  "counts.activities += 1"
]);

requireText("app/api/outings/generate/add-stop/route.ts", [
  'requestedKind !== "activity"',
  "next.activities += 1"
]);

requireText("app/api/outings/generate/replace-stop/route.ts", [
  '| "activity"',
  'listing.catalogueKind === "activity"'
]);

requireText("lib/outing-plan-metrics.ts", [
  "mix.activities += 1",
  "next.activities = Math.max"
]);

requireText("components/today-discovery.tsx", [
  "THE CITY CATALOGUE",
  "/explore?filter=activities",
  "Choose any listing, then build around it."
]);

requireText("lib/catalogue.ts", [
  '"board game"',
  "return profile(120, 90, 180);",
  '"axe throwing"',
  '"escape room"',
  '"run club"',
  "return profile(90, 75, 105);",
  'source: "official"'
]);

console.log("VENTURE CATALOGUE + ANCHOR UPDATE VERIFIED");
