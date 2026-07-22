import fs from "node:fs";

const checks = [
  {
    file: "app/build-outing/page.tsx",
    includes: [
      "build-outing-experience.module.css",
      "STEP_VISUALS",
      "OutingResultTransition",
      "styles.stepDots"
    ],
    excludes: [
      "SubmitListingEntry"
    ]
  },
  {
    file: "components/app-route-chrome.tsx",
    includes: [
      'pathname === "/"',
      "<BetaFeedback />"
    ]
  },
  {
    file: "components/outing-result-transition.module.css",
    includes: [
      "width: min(100vw, 500px)",
      "transform: translateX(-50%)",
      "@media (max-width: 390px)"
    ]
  },
  {
    file: "components/outing-route-map.tsx",
    includes: [
      "buildGoogleMapsRouteUrl",
      "Open full route in Google Maps"
    ]
  },
  {
    file: "lib/google-maps-route.ts",
    includes: [
      "https://www.google.com/maps/dir/?",
      'parameters.set(\n      "waypoints"'
    ]
  },
  {
    file: "app/saved/outings/[planId]/page.tsx",
    includes: [
      "OutingDetailExperience",
      "Remove saved outing"
    ]
  },
  {
    file: "app/outings/[shareCode]/page.tsx",
    includes: [
      "OutingDetailExperience",
      "Build your own outing"
    ]
  },
  {
    file: "components/outing-detail-experience.tsx",
    includes: [
      "OutingRouteMap",
      "ADVENTURE SNAPSHOT",
      "STOP BY STOP"
    ]
  },
  {
    file: "app/build-outing/results/results-refresh.module.css",
    includes: [
      "Venture outing finale v0.3",
      ".routeRecipeCard",
      ".outing-route-heading a"
    ]
  }
];

let failed = false;

for (const check of checks) {
  if (!fs.existsSync(check.file)) {
    console.error(`FAIL Missing ${check.file}`);
    failed = true;
    continue;
  }

  const contents = fs.readFileSync(check.file, "utf8");

  for (const token of check.includes ?? []) {
    if (!contents.includes(token)) {
      console.error(`FAIL ${check.file} missing: ${token}`);
      failed = true;
    }
  }

  for (const token of check.excludes ?? []) {
    if (contents.includes(token)) {
      console.error(`FAIL ${check.file} still contains: ${token}`);
      failed = true;
    }
  }

  if (!failed) {
    console.log(`PASS ${check.file}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("Outing experience rebuild checks passed.");
