import {
  existsSync,
  readFileSync
} from "node:fs";

import {
  resolve
} from "node:path";


const root =
  process.cwd();

let failed =
  false;


function read(
  relativePath
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

    return "";
  }

  console.log(
    `FOUND: ${relativePath}`
  );

  return readFileSync(
    fullPath,
    "utf8"
  );
}


function requireText(
  relativePath,
  source,
  required
) {
  for (
    const value
    of required
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


const builderPath =
  "app/build-outing/page.tsx";

const resultsPath =
  "app/build-outing/results/page.tsx";

const optionsPath =
  "app/api/outings/options/route.ts";

const generatePath =
  "app/api/outings/generate/route.ts";

const replacePath =
  "app/api/outings/generate/replace-stop/route.ts";

const addPath =
  "app/api/outings/generate/add-stop/route.ts";

const mapPath =
  "components/outing-route-map.tsx";

const savedPath =
  "lib/saved-outings.ts";

const cssPath =
  "app/globals.css";


const builder =
  read(builderPath);

const results =
  read(resultsPath);

const options =
  read(optionsPath);

const generate =
  read(generatePath);

const replace =
  read(replacePath);

const add =
  read(addPath);

const map =
  read(mapPath);

const saved =
  read(savedPath);

const css =
  read(cssPath);


requireText(
  builderPath,
  builder,
  [
    '"surprise"',
    '"mix"',
    '"anchor"',
    "stopMix",
    "totalStops",
    "allowedKinds",
    "anchorListingKey",
    "soloVibe",
    "soloPace",
    "groupVibe",
    "groupPriority",
    "Who is this outing for?",
    "Choose your exact stop mix",
    "Where does the outing begin?",
    "/api/outings/options",
    "Create my outing"
  ]
);


if (
  builder.includes(
    "SubmitListingEntry"
  ) ||
  builder.includes(
    "submit-listing-entry"
  )
) {
  console.error(
    "BUILDER CHECK FAILED: the persistent listing-submission card is still rendered inside the wizard."
  );

  failed =
    true;
}


requireText(
  generatePath,
  generate,
  [
    "buildRequestedSlots",
    "buildSurpriseSequence",
    "buildMixSequence",
    "anchorListingKey",
    "chooseProposal",
    "Math.random()",
    "requestedMix",
    "actualMix",
    "getPublishedEventListings",
    "getPublishedPlaceListings"
  ]
);


requireText(
  optionsPath,
  options,
  [
    "getPublishedEventListings",
    "getPublishedPlaceListings",
    "getListingKind",
    "official_source",
    "verified_venture",
    "verified_business"
  ]
);


requireText(
  resultsPath,
  results,
  [
    "/api/outings/generate/add-stop",
    "handleAddStop",
    "handleReplaceStop",
    "handleRefreshUnlocked",
    "lockedOrders",
    "Add another stop",
    "outing-map-first-stage",
    "outing-timeline-v3"
  ]
);


const mapPosition =
  results.indexOf(
    'className="outing-map-first-stage"'
  );

const summaryPosition =
  results.indexOf(
    "outing-plan-summary-v3"
  );

const timelinePosition =
  results.indexOf(
    "outing-timeline-v3"
  );


if (
  mapPosition < 0 ||
  summaryPosition < 0 ||
  timelinePosition < 0 ||
  !(
    mapPosition <
      summaryPosition &&
    summaryPosition <
      timelinePosition
  )
) {
  console.error(
    "RESULTS ORDER CHECK FAILED: the map must appear before the plan summary and itinerary details."
  );

  failed =
    true;
}


requireText(
  replacePath,
  replace,
  [
    "targetKind",
    "getListingKind",
    "maxTravelMinutes"
  ]
);


requireText(
  addPath,
  add,
  [
    "requestedKind",
    "findSlotForListing",
    "incrementMix",
    "No verified"
  ]
);


requireText(
  mapPath,
  map,
  [
    "Your route at a glance",
    "outing-map-stop-strip",
    "outing-route-map-featured",
    "buildGoogleMapsUrl"
  ]
);


requireText(
  savedPath,
  saved,
  [
    "OutingStopKind",
    "OutingStopMix",
    "buildMethod?",
    "requestedMix?",
    "actualMix?",
    "anchorListingKey?"
  ]
);


requireText(
  cssPath,
  css,
  [
    "VENTURE OUTING CREATOR V3",
    "container-type: inline-size",
    ".outing-build-method-grid",
    ".outing-anchor-builder",
    ".outing-map-first-stage",
    ".outing-route-panel-featured",
    ".outing-add-stop-panel",
    ".outing-stop-card-v3",
    "@container (max-width: 390px)",
    "prefers-reduced-motion"
  ]
);


let cssDepth =
  0;

let minimumCssDepth =
  0;

let inComment =
  false;

let quote =
  null;

let escaped =
  false;


for (
  let index = 0;
  index < css.length;
  index += 1
) {
  const character =
    css[index];

  const next =
    css[index + 1];

  if (inComment) {
    if (
      character === "*" &&
      next === "/"
    ) {
      inComment =
        false;

      index += 1;
    }

    continue;
  }

  if (quote) {
    if (escaped) {
      escaped =
        false;

      continue;
    }

    if (
      character === "\\"
    ) {
      escaped =
        true;

      continue;
    }

    if (
      character === quote
    ) {
      quote =
        null;
    }

    continue;
  }

  if (
    character === "/" &&
    next === "*"
  ) {
    inComment =
      true;

    index += 1;

    continue;
  }

  if (
    character === '"' ||
    character === "'"
  ) {
    quote =
      character;

    continue;
  }

  if (
    character === "{"
  ) {
    cssDepth += 1;
  }

  if (
    character === "}"
  ) {
    cssDepth -= 1;

    minimumCssDepth =
      Math.min(
        minimumCssDepth,
        cssDepth
      );
  }
}


if (
  cssDepth !== 0 ||
  minimumCssDepth < 0
) {
  console.error(
    "CSS CHECK FAILED: app/globals.css has unbalanced braces."
  );

  failed =
    true;
}


if (failed) {
  process.exitCode =
    1;
} else {
  console.log(
    "\nVenture Outing Creator V3 checks passed."
  );
}
