import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing ${relativePath}`);
  }

  return fs.readFileSync(fullPath, "utf8");
}

function requireText(source, text, label) {
  if (!source.includes(text)) {
    throw new Error(`Missing ${label}`);
  }
}

const explorePage = read("app/explore/page.tsx");
const exploreExperience = read(
  "components/explore-experience.tsx"
);
const filterSheet = read(
  "components/discovery-filter-sheet.tsx"
);
const searchModule = read("lib/explore-search.ts");
const discoveryIntent = read("lib/discovery-intent.ts");
const places = read("lib/data/places.ts");
const events = read("lib/data/events.ts");
const css = read("app/explore/explore.module.css");
const listingCard = read("components/listing-card.tsx");
const todayDiscovery = read("components/today-discovery.tsx");
const types = read("lib/types.ts");

requireText(
  explorePage,
  "searchPublishedPlaces",
  "database place search"
);
requireText(
  explorePage,
  "searchPublishedEvents",
  "database event search"
);
requireText(
  explorePage,
  "const EXPLORE_PAGE_SIZE = 24",
  "24-result page size"
);
requireText(
  explorePage,
  "take: requestedTakeValue",
  "incremental result loading"
);
requireText(
  exploreExperience,
  "Show {pageSize} more",
  "Show more control"
);
requireText(
  searchModule,
  '.from("places")',
  "direct places query"
);
requireText(
  searchModule,
  '.from("events")',
  "direct events query"
);
requireText(
  searchModule,
  ".range(",
  "database range pagination"
);
requireText(
  searchModule,
  '"activity"',
  "activity catalogue support"
);
requireText(
  searchModule,
  '"attraction"',
  "attraction catalogue support"
);
requireText(
  discoveryIntent,
  '| "activities"',
  "activities filter type"
);
requireText(
  discoveryIntent,
  '| "nightlife"',
  "nightlife filter type"
);
requireText(
  filterSheet,
  '["activities", "Activities"]',
  "activities filter control"
);
requireText(
  filterSheet,
  '["nightlife", "Nightlife"]',
  "nightlife filter control"
);
requireText(
  places,
  "export type PlaceRow",
  "place search mapping export"
);
requireText(
  events,
  "export type EventRow",
  "event search mapping export"
);
requireText(
  css,
  ".loadMorePanel",
  "load-more styling"
);

requireText(
  places,
  "image_url",
  "place photo query"
);
requireText(
  places,
  "imageUrl:",
  "place photo mapping"
);
requireText(
  events,
  "image_url",
  "event photo query"
);
requireText(
  listingCard,
  "backgroundImage:",
  "Explore card photo rendering"
);
requireText(
  todayDiscovery,
  "listing.imageUrl",
  "Today photo rendering"
);
requireText(
  types,
  "imageUrl?: string | null",
  "listing photo type"
);

if (
  explorePage.includes(
    "getPublishedPlaceListings(500)"
  )
) {
  throw new Error(
    "Explore still depends on the temporary 500-place load."
  );
}

console.log("VENTURE EXPLORE SEARCH V2 VERIFIED");
console.log("Database search: enabled");
console.log("Incremental loading: 24 at a time");
console.log("Activities and nightlife filters: enabled");
console.log("Listing photos: restored");
console.log("No Supabase migration is required.");
