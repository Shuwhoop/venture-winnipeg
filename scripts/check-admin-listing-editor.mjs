import fs from "node:fs";

const requiredFiles = [
  "lib/admin/listing-editor-types.ts",
  "lib/admin/listing-editor.ts",
  "app/api/admin/listings/[entityType]/[id]/route.ts",
  "app/admin/listings/[entityType]/[id]/page.tsx",
  "app/admin/listings/[entityType]/[id]/listing-editor-form.tsx",
  "app/admin/listings/[entityType]/[id]/page.module.css"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`MISSING: ${file}`);
    process.exit(1);
  }

  console.log(`FOUND: ${file}`);
}

const moduleText = fs.readFileSync(
  "lib/admin/listing-editor.ts",
  "utf8"
);

const routeText = fs.readFileSync(
  "app/api/admin/listings/[entityType]/[id]/route.ts",
  "utf8"
);

const formText = fs.readFileSync(
  "app/admin/listings/[entityType]/[id]/listing-editor-form.tsx",
  "utf8"
);

const healthPage = fs.readFileSync(
  "app/admin/data-health/page.tsx",
  "utf8"
);

for (const marker of [
  "updateAdminListing",
  "audit_log",
  "listing_sources",
  "SRID=4326;POINT",
  "admin-listing-editor"
]) {
  if (!moduleText.includes(marker)) {
    console.error(`MODULE CHECK FAILED: ${marker}`);
    process.exit(1);
  }
}

for (const marker of [
  "getVentureAdmin",
  "isSameOrigin",
  "MAX_BODY_LENGTH",
  "updateAdminListing"
]) {
  if (!routeText.includes(marker)) {
    console.error(`ROUTE CHECK FAILED: ${marker}`);
    process.exit(1);
  }
}

for (const marker of [
  "Save listing",
  "Primary source URL",
  "Source checked",
  "Freshness expires",
  "weeklyHours"
]) {
  if (!formText.includes(marker)) {
    console.error(`FORM CHECK FAILED: ${marker}`);
    process.exit(1);
  }
}

if (!healthPage.includes("/admin/listings/${record.entityType}/${record.id}")) {
  console.error("DATA HEALTH CHECK FAILED: repair link missing");
  process.exit(1);
}

console.log("Admin listing editor structure check passed.");
