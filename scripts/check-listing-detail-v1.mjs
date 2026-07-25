import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const required = [
  "app/listings/[slug]/page.tsx",
  "app/listings/[slug]/page.module.css",
  "components/listing-detail-action-dock.tsx",
  "components/listing-detail-action-dock.module.css",
  "components/listing-detail-map.tsx",
  "components/listing-detail-map.module.css",
  "components/listing-share-button.tsx",
  "lib/data/listing-detail.ts"
];

const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing ${relativePath}`);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

for (const file of required) {
  read(file);
}

const page = read("app/listings/[slug]/page.tsx");
const pageCss = read("app/listings/[slug]/page.module.css");
const dock = read("components/listing-detail-action-dock.tsx");
const map = read("components/listing-detail-map.tsx");
const share = read("components/listing-share-button.tsx");
const data = read("lib/data/listing-detail.ts");

const checks = [
  [page.includes("ListingDetailActionDock"), "Action dock is not connected"],
  [page.includes("ListingDetailMap"), "Detail map is not connected"],
  [page.includes("WHY VENTURE PICKED IT"), "Venture reasoning section is missing"],
  [page.includes("KEEP EXPLORING"), "Related listings section is missing"],
  [page.includes("visualGallery"), "Swipe gallery is missing"],
  [pageCss.includes("VENTURE LISTING DETAIL V1.0"), "Detail v1 styles are missing"],
  [dock.includes("Build around this"), "Build-around action is missing"],
  [map.includes("getVentureMapConfiguration"), "Map provider configuration is missing"],
  [share.includes("source?: string"), "Share analytics source support is missing"],
  [data.includes("image_url"), "Event image support is missing"],
  [data.includes("imageUrl: row.image_url"), "Event image mapping is missing"]
];

for (const [passed, message] of checks) {
  if (!passed) {
    failures.push(message);
  }
}

if (failures.length > 0) {
  console.error("VENTURE LISTING DETAIL V1.0 CHECK FAILED");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("VENTURE LISTING DETAIL V1.0 VERIFIED");
