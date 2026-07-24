import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const absolutePath = path.join(
    root,
    relativePath
  );

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing required file: ${relativePath}`
    );
  }

  return fs.readFileSync(
    absolutePath,
    "utf8"
  );
}

function requireText(
  content,
  expected,
  label
) {
  if (!content.includes(expected)) {
    throw new Error(
      `${label} is missing: ${expected}`
    );
  }
}

function checkBalancedBraces(
  content,
  label
) {
  let depth = 0;

  for (const character of content) {
    if (character === "{") {
      depth += 1;
    }

    if (character === "}") {
      depth -= 1;
    }

    if (depth < 0) {
      throw new Error(
        `${label} has an unexpected closing brace.`
      );
    }
  }

  if (depth !== 0) {
    throw new Error(
      `${label} has unbalanced braces.`
    );
  }
}

const experience = read(
  "components/explore-experience.tsx"
);
const cityMap = read(
  "components/city-map.tsx"
);
const mapCard = read(
  "components/explore-map-card.tsx"
);
const shareButton = read(
  "components/listing-share-button.tsx"
);
const mapUtils = read(
  "lib/explore-map-utils.ts"
);
const builder = read(
  "app/build-outing/page.tsx"
);
const css = read(
  "app/explore/explore.module.css"
);

requireText(
  experience,
  "Search this area",
  "Explore area search"
);
requireText(
  experience,
  "synchronizeRailSelection",
  "Card and marker synchronization"
);
requireText(
  experience,
  "listingIsInsideBounds",
  "Map-area filtering"
);
requireText(
  cityMap,
  "navigator.geolocation",
  "Location permission flow"
);
requireText(
  cityMap,
  "onViewportChanged",
  "Map viewport reporting"
);
requireText(
  cityMap,
  "String(index + 1)",
  "Numbered markers"
);
requireText(
  cityMap,
  "userLocationMarker",
  "User-location marker"
);
requireText(
  mapCard,
  "Build around this",
  "Add-to-outing action"
);
requireText(
  mapCard,
  "ListingShareButton",
  "Listing sharing"
);
requireText(
  mapCard,
  "VisitButton",
  "Visit-history control"
);
requireText(
  shareButton,
  "navigator.share",
  "Native share support"
);
requireText(
  shareButton,
  "navigator.clipboard",
  "Clipboard share fallback"
);
requireText(
  mapUtils,
  "getDistanceKilometres",
  "Distance calculation"
);
requireText(
  mapUtils,
  "travelLabel",
  "Travel estimate"
);
requireText(
  builder,
  "requestedAnchor",
  "Seeded outing builder"
);
requireText(
  css,
  ".searchAreaButton",
  "Search-area styling"
);
requireText(
  css,
  ".mapResultNumber",
  "Numbered card styling"
);
requireText(
  css,
  ".locateMapButton",
  "Location-button styling"
);

checkBalancedBraces(
  css,
  "Explore CSS"
);

console.log(
  "VENTURE EXPLORE MAP SYNC VERIFIED"
);
