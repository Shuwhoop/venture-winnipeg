import {
  existsSync,
  readFileSync
} from "node:fs";

import {
  resolve
} from "node:path";


const root =
  process.cwd();


const requiredFiles = [
  "app/build-outing/page.tsx",
  "app/build-outing/results/page.tsx",
  "app/api/outings/generate/route.ts",
  "app/api/outings/generate/replace-stop/route.ts",
  "lib/saved-outings.ts",
  "app/globals.css"
];


let failed =
  false;


for (
  const relativePath
  of requiredFiles
) {
  const fullPath =
    resolve(
      root,
      relativePath
    );

  if (
    !existsSync(
      fullPath
    )
  ) {
    console.error(
      `MISSING: ${relativePath}`
    );

    failed =
      true;
  } else {
    console.log(
      `FOUND: ${relativePath}`
    );
  }
}


function requireText(
  relativePath,
  expected
) {
  const fullPath =
    resolve(
      root,
      relativePath
    );

  if (
    !existsSync(
      fullPath
    )
  ) {
    return;
  }

  const source =
    readFileSync(
      fullPath,
      "utf8"
    );

  for (
    const value
    of expected
  ) {
    if (
      !source.includes(
        value
      )
    ) {
      console.error(
        `CHECK FAILED in ${relativePath}: ${value}`
      );

      failed =
        true;
    }
  }
}


requireText(
  "app/build-outing/page.tsx",
  [
    "partySize",
    "maxTravelMinutes",
    "mustIncludeTerms",
    "avoidTerms",
    "outing-party-size-card",
    "outing-custom-preferences",
    "outing-travel-limit"
  ]
);


requireText(
  "app/build-outing/results/page.tsx",
  [
    "lockedOrders",
    "handleReplaceStop",
    "handleRefreshUnlocked",
    "/api/outings/generate/replace-stop",
    "Refresh unlocked",
    "outing-stop-controls"
  ]
);


requireText(
  "app/api/outings/generate/route.ts",
  [
    "maxTravelMinutes",
    "avoidTerms",
    "matchesAnyTerm",
    "estimatedGroupTotalCad",
    "missingMustIncludeTerms"
  ]
);


requireText(
  "app/api/outings/generate/replace-stop/route.ts",
  [
    "maxTravelMinutes",
    "avoidTerms",
    "matchesAnyTerm",
    "draft.maxTravelMinutes"
  ]
);


requireText(
  "lib/saved-outings.ts",
  [
    "partySize?: number",
    "maxTravelMinutes?: number",
    "estimatedGroupTotalCad?"
  ]
);


requireText(
  "app/globals.css",
  [
    "VENTURE BUILD AN OUTING INTELLIGENCE UPGRADE",
    "container-type: inline-size",
    ".outing-stop-controls",
    "@container (max-width: 390px)",
    "prefers-reduced-motion"
  ]
);


if (failed) {
  process.exitCode =
    1;
} else {
  console.log(
    "\nBuild an Outing intelligence checks passed."
  );
}
