import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${relativePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

const page = read("app/explore/page.tsx");
const experience = read("components/explore-experience.tsx");
const requestForm = read("components/explore-missing-listing-request.tsx");
const api = read("app/api/explore/requests/route.ts");
const adminPage = read("app/admin/submissions/requests/page.tsx");
const layout = read("app/admin/submissions/layout.tsx");
const migration = read("supabase/migrations/20260722170000_create_explore_listing_requests.sql");

const checks = [
  [page.includes("searchQuery={q.trim()}"), "Explore passes the search query"],
  [experience.includes("ExploreMissingListingRequest"), "Explore renders missing-listing request UI"],
  [requestForm.includes("/api/explore/requests"), "Request form calls API"],
  [api.includes("explore_listing_requests"), "API stores request in Supabase"],
  [api.includes("sendExploreRequestEmail"), "API supports email notification"],
  [adminPage.includes("Missing listing requests"), "Admin request queue exists"],
  [layout.includes("/admin/submissions/requests"), "Submissions navigation links to requests"],
  [migration.includes("create table if not exists public.explore_listing_requests"), "Database migration exists"],
  [migration.includes("to service_role"), "Service role permissions exist"]
];

let failed = false;

for (const [passed, label] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("Explore missing-listing request checks passed.");
