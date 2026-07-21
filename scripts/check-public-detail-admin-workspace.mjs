import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing ${relativePath}`);
    return "";
  }

  return fs.readFileSync(fullPath, "utf8");
}

function expect(relativePath, text) {
  const content = read(relativePath);

  if (!content.includes(text)) {
    errors.push(`${relativePath} is missing: ${text}`);
  }
}

expect("app/admin/page.tsx", "Run the whole platform from here");
expect("components/admin/admin-command-bar.tsx", "All admin tools");
expect("components/app-route-chrome.tsx", "AdminRouteChrome");
expect("components/claim-listing-form.tsx", "Claim this listing");
expect("app/listings/[slug]/page.tsx", "Getting there and access");
expect("app/listings/[slug]/page.tsx", "Google Maps");
expect("components/report-issue-form.tsx", "Report incorrect information");
expect("app/api/claims/route.ts", "business_claim_requests");
expect("app/admin/claims/page.tsx", "Business claims");
expect("app/admin/reports/page.tsx", "Incorrect-info reports");
expect("app/admin/listings/[entityType]/[id]/listing-editor-form.tsx", "Save and return");
expect("app/admin/listings/[entityType]/[id]/page.tsx", "returnTo");
expect("app/page.tsx", "SubmitListingEntry");
expect("app/build-outing/page.tsx", "SubmitListingEntry");
expect("supabase/migrations/20260721023000_create_business_claim_requests.sql", "create table if not exists public.business_claim_requests");
expect("lib/data/places.ts", "priceLevel");

const placesSource = read("lib/data/places.ts");
if (placesSource.includes("google_rating,")) {
  errors.push("lib/data/places.ts still fetches stored Google ratings for public cards");
}

if (errors.length > 0) {
  console.error("Public detail and admin workspace check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Venture public detail and admin workspace check passed.");
