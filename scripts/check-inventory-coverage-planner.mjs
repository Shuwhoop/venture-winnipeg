import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "app/admin/inventory-plan/page.tsx",
  "app/admin/inventory-plan/page.module.css",
  "app/api/admin/inventory-plan/export/route.ts",
  "lib/admin/inventory-planner.ts"
];

const errors = [];

for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) {
    errors.push(`Missing ${relative}`);
  }
}

const planner = fs.readFileSync(
  path.join(root, "lib/admin/inventory-planner.ts"),
  "utf8"
);
const page = fs.readFileSync(
  path.join(root, "app/admin/inventory-plan/page.tsx"),
  "utf8"
);
const exportRoute = fs.readFileSync(
  path.join(root, "app/api/admin/inventory-plan/export/route.ts"),
  "utf8"
);

for (const text of [
  "trustedPublishedPlaces",
  "trustedFutureEvents",
  "repairCandidates",
  "upcomingEventsByWeek",
  "getDataHealthReport"
]) {
  if (!planner.includes(text)) {
    errors.push(`Planner is missing ${text}`);
  }
}

for (const text of [
  "Inventory Coverage Plan",
  "Practical priorities",
  "Drafts worth finishing first",
  "/api/admin/inventory-plan/export"
]) {
  if (!page.includes(text)) {
    errors.push(`Planner page is missing ${text}`);
  }
}

if (!exportRoute.includes("getVentureAdmin")) {
  errors.push("CSV export is not protected by admin authentication");
}

if (errors.length > 0) {
  console.error("Inventory Coverage Planner checker failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Venture Inventory Coverage Planner checker passed.");
