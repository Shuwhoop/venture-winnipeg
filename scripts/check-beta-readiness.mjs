import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "app/admin/beta-readiness/page.tsx",
  "app/admin/beta-readiness/beta-readiness-client.tsx",
  "app/admin/beta-readiness/page.module.css",
  "lib/admin/beta-readiness.ts",
  "lib/admin/beta-readiness-types.ts"
];

const failures = [];

for (const relativePath of requiredFiles) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing ${relativePath}`);
  }
}

function requireText(relativePath, snippets) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    return;
  }

  const text = fs.readFileSync(fullPath, "utf8");

  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      failures.push(`${relativePath} is missing: ${snippet}`);
    }
  }
}

requireText("app/admin/beta-readiness/page.tsx", [
  "requireVentureAdmin",
  "getBetaReadinessReport",
  "BetaReadinessClient"
]);

requireText("app/admin/beta-readiness/beta-readiness-client.tsx", [
  "venture:beta-readiness:v1",
  "MANUAL_CHECKS",
  "Print summary",
  "Launch notes"
]);

requireText("lib/admin/beta-readiness.ts", [
  "trustedPlaces: 15",
  "futureEvents: 10",
  "getDataPipelineLab(30)",
  "getBetaInsights(30)"
]);

requireText("app/admin/page.tsx", [
  "/admin/beta-readiness",
  "Beta readiness"
]);

requireText("components/admin/admin-command-bar.tsx", [
  "/admin/beta-readiness",
  "Beta readiness"
]);

requireText("tsconfig.json", [
  '"venture-backups"',
  '"venture-backups/**"'
]);

if (failures.length > 0) {
  console.error("Beta readiness structural check failed:\n");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("Beta readiness structural check passed.");
