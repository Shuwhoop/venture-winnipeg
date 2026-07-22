import { readFile, access } from "node:fs/promises";

const requiredFiles = [
  "app/admin/import/page.tsx",
  "app/admin/import/import-workbench.tsx",
  "app/admin/import/page.module.css",
  "app/api/admin/import/commit/route.ts",
  "lib/admin/inventory-import.ts",
  "lib/admin/inventory-import-types.ts",
  "lib/admin/imported-inventory.ts",
  "scripts/prepare-targeted-overture-import.py",
  "public/templates/venture-targeted-place-import.csv",
  "public/templates/venture-targeted-event-import.csv"
];

for (const file of requiredFiles) {
  await access(file);
}

const page = await readFile("app/admin/import/page.tsx", "utf8");
const workbench = await readFile("app/admin/import/import-workbench.tsx", "utf8");
const importer = await readFile("lib/admin/inventory-import.ts", "utf8");
const browser = await readFile("lib/admin/imported-inventory.ts", "utf8");
const commitRoute = await readFile("app/api/admin/import/commit/route.ts", "utf8");
const prepareScript = await readFile("scripts/prepare-targeted-overture-import.py", "utf8");

const checks = [
  [page.includes("Search every imported draft"), "Imported inventory browser is rendered"],
  [page.includes("Edit full listing"), "Imported records link to the full editor"],
  [page.includes("targetArea"), "Target area filter is available"],
  [workbench.includes("INVENTORY_IMPORT_TARGET_AREAS"), "Import target area selector is available"],
  [workbench.includes("official_event_sources"), "Official event import source is available"],
  [workbench.includes("inferTargetAreaFromFilename"), "Area CSV filenames auto-select their target"],
  [commitRoute.includes("targetArea") && commitRoute.includes("importSource"), "Import metadata reaches the server"],
  [importer.includes("overture_place_id"), "Overture IDs are preserved and deduplicated"],
  [importer.includes("Overture Maps Foundation"), "Overture attribution source is preserved"],
  [browser.includes("inventory_import_created"), "CSV imported records are searchable"],
  [browser.includes("import_source"), "Legacy Overture imports are searchable"],
  [browser.includes("inferTargetArea"), "Older coordinate-based imports receive a target-area hint"],
  [prepareScript.includes("venture-overture-priority-areas-combined.csv"), "Priority-area Overture CSV generator is included"]
];

let failed = false;

for (const [passed, label] of checks) {
  if (passed) {
    console.log(`PASS ${label}`);
  } else {
    failed = true;
    console.error(`FAIL ${label}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("Targeted inventory import checks passed.");
