import {
  readFileSync
} from "node:fs";

import {
  resolve
} from "node:path";

const root = process.cwd();

const files = {
  resultsPage: readFileSync(
    resolve(root, "app/build-outing/results/page.tsx"),
    "utf8"
  ),
  resultsCss: readFileSync(
    resolve(root, "app/build-outing/results/results-refresh.module.css"),
    "utf8"
  ),
  detailPage: readFileSync(
    resolve(root, "components/outing-detail-experience.tsx"),
    "utf8"
  ),
  detailCss: readFileSync(
    resolve(root, "components/outing-detail-experience.module.css"),
    "utf8"
  ),
  generate: readFileSync(
    resolve(root, "app/api/outings/generate/route.ts"),
    "utf8"
  ),
  addStop: readFileSync(
    resolve(root, "app/api/outings/generate/add-stop/route.ts"),
    "utf8"
  ),
  replaceStop: readFileSync(
    resolve(root, "app/api/outings/generate/replace-stop/route.ts"),
    "utf8"
  )
};

const checks = [
  [
    files.resultsPage.includes("M12 15V3.75"),
    "new share icon"
  ],
  [
    files.resultsPage.includes("The plan, without the clutter"),
    "cleaner outing snapshot copy"
  ],
  [
    files.resultsPage.includes("EXTEND THE ROUTE"),
    "additional-stop copy"
  ],
  [
    files.resultsPage.includes("animationDelay: `${Math.min(stopIndex, 6) * 90}ms`"),
    "staggered route animation"
  ],
  [
    files.resultsCss.includes("Venture outing results polish v0.2"),
    "results polish styles"
  ],
  [
    files.resultsCss.includes("grid-template-columns: 46px minmax(0, 1fr) 30px"),
    "stable add-stop text layout"
  ],
  [
    !files.detailPage.includes("{stop.reason}"),
    "recommendation statement removed from saved and shared outings"
  ],
  [
    files.detailCss.includes("Venture outing detail calm pass v0.2"),
    "saved and shared outing polish"
  ],
  [
    !files.generate.includes("Matches ${candidate.matchedInterests"),
    "old generated Matches statement removed"
  ],
  [
    !files.addStop.includes("Replacement matches"),
    "old add-stop replacement statement removed"
  ],
  [
    !files.replaceStop.includes("Replacement matches"),
    "old replacement statement removed"
  ]
];

const failed = checks.filter(([passed]) => !passed);

if (failed.length > 0) {
  for (const [, label] of failed) {
    console.error(`FAILED: ${label}`);
  }

  process.exit(1);
}

for (const [, label] of checks) {
  console.log(`OK: ${label}`);
}

console.log("\nVENTURE OUTING RESULTS POLISH VERIFIED");
