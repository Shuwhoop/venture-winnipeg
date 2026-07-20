import fs from "node:fs";

const requiredFiles = [
  "lib/admin/data-health.ts",
  "app/api/admin/data-health/route.ts",
  "app/admin/data-health/page.tsx",
  "app/admin/data-health/page.module.css"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`MISSING: ${file}`);
    process.exit(1);
  }

  console.log(`FOUND: ${file}`);
}

const page = fs.readFileSync(
  "app/admin/data-health/page.tsx",
  "utf8"
);

const moduleText = fs.readFileSync(
  "lib/admin/data-health.ts",
  "utf8"
);

for (const marker of [
  "requireVentureAdmin",
  "Listing repair queue",
  "Outing eligible",
  "Pitch ready",
  "data-label=\"Listing\"",
  "Public blockers"
]) {
  if (!page.includes(marker)) {
    console.error(`PAGE CHECK FAILED: ${marker}`);
    process.exit(1);
  }
}

for (const marker of [
  "getDataHealthReport",
  "missing-coordinates",
  "stale-source",
  "outingEligible",
  "pitchReady",
  "publishedNeedsAttention",
  "getQueueGroup"
]) {
  if (!moduleText.includes(marker)) {
    console.error(`MODULE CHECK FAILED: ${marker}`);
    process.exit(1);
  }
}

console.log("Admin data health structure check passed.");
