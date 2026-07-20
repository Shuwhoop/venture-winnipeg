import { readFileSync } from "node:fs";

const checks = [
  [
    "app/admin/import/page.tsx",
    ["Inventory Import", "requireVentureAdmin", "InventoryImportWorkbench"]
  ],
  [
    "app/admin/import/import-workbench.tsx",
    [
      '"use client"',
      "/api/admin/import/preview",
      "/api/admin/import/commit",
      "Import safe rows",
      "Download"
    ]
  ],
  [
    "app/admin/import/history/page.tsx",
    ["Import History", "getInventoryImportHistory", "requireVentureAdmin"]
  ],
  [
    "app/api/admin/import/preview/route.ts",
    ["getVentureAdmin", "previewInventoryImport", "Cache-Control"]
  ],
  [
    "app/api/admin/import/commit/route.ts",
    ["getVentureAdmin", "commitInventoryImport", "isSameOrigin"]
  ],
  [
    "lib/admin/inventory-import.ts",
    [
      "MAX_IMPORT_ROWS",
      "parseCsv",
      "source_url",
      'status: "draft"',
      'verification_status: "unverified"',
      "inventory_import_batch",
      "getInventoryImportHistory"
    ]
  ],
  [
    "public/templates/venture-place-import.csv",
    ["name,slug,place_type", "source_url"]
  ],
  [
    "public/templates/venture-event-import.csv",
    ["title,slug,short_description", "venue_slug", "source_url"]
  ]
];

for (const [path, expected] of checks) {
  let content;

  try {
    content = readFileSync(path, "utf8");
  } catch {
    console.error(`MISSING: ${path}`);
    process.exit(1);
  }

  console.log(`FOUND: ${path}`);

  for (const marker of expected) {
    if (!content.includes(marker)) {
      console.error(`CHECK FAILED in ${path}: ${marker}`);
      process.exit(1);
    }
  }
}

console.log("Admin inventory import structural checks passed.");
