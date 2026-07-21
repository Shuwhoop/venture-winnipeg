import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["app/admin/quick-repair/page.tsx", "QuickRepairClient"],
  ["app/admin/quick-repair/quick-repair-client.tsx", "Save all changed"],
  ["app/admin/quick-repair/page.module.css", ".saveBar"],
  ["app/api/admin/quick-repair/route.ts", "isSameOrigin"],
  ["lib/admin/quick-repair.ts", "admin_quick_repair"],
  ["lib/admin/quick-repair-types.ts", "QuickRepairChange"],
  ["app/admin/data-health/page.tsx", "/admin/quick-repair"]
];

const errors = [];

for (const [relative, marker] of checks) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    errors.push(`Missing ${relative}`);
    continue;
  }

  const content = fs.readFileSync(absolute, "utf8");
  if (!content.includes(marker)) {
    errors.push(`${relative} does not include ${marker}`);
  }
}

if (errors.length > 0) {
  console.error("Quick Repair checker failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Venture Quick Repair structural checker passed.");
