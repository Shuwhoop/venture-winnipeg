import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = false;

function fail(message) {
  failed = true;
  console.error(`FAIL: ${message}`);
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function expect(relativePath, snippets) {
  const content = read(relativePath);
  if (!content) return;
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      fail(`${relativePath} is missing: ${snippet}`);
    }
  }
  if (snippets.every((snippet) => content.includes(snippet))) {
    pass(relativePath);
  }
}

function checkBalancedCss(relativePath) {
  const content = read(relativePath);
  if (!content) return;
  let depth = 0;
  let inComment = false;
  let quote = null;
  let escaped = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];
    if (inComment) {
      if (character === "*" && next === "/") {
        inComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "*") {
      inComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth < 0) {
      fail(`${relativePath} has an extra closing brace`);
      return;
    }
  }
  if (depth !== 0 || inComment || quote) {
    fail(`${relativePath} has unbalanced CSS syntax`);
    return;
  }
  pass(`${relativePath} CSS structure`);
}

expect("lib/visit-history.ts", [
  "VISIT_HISTORY_STORAGE_KEY",
  "createVisitRecord",
  "getVisitedListingKeys",
  "getVisitedEventOccurrenceKeys",
  "removeLatestVisitForListing"
]);

expect("lib/account-sync.ts", [
  "CloudVisitRow",
  'from("user_visits")',
  "writeVisitHistory(mergedVisits)",
  "visitedCount"
]);

expect("lib/account-sync-storage.ts", [
  '| "visit"',
  'record.kind === "visit"'
]);

expect("components/visit-button.tsx", [
  '"I went here"',
  'eventName: "visit_logged"',
  "fallbackEventDate"
]);

expect("components/visit-history-dashboard.tsx", [
  "Your Winnipeg history",
  "New to Me is now available",
  "getVisitHistoryStats"
]);

expect("app/build-outing/page.tsx", [
  'title: "Only somewhere new"',
  "textRequestsSomewhereNew",
  "visitedListingKeys",
  "effectiveDiscoveryPreference"
]);

expect("app/api/outings/generate/route.ts", [
  "isPreviouslyVisited",
  'draft.discoveryPreference === "new-only"',
  'draft.discoveryPreference === "mix"',
  "visitedEventOccurrenceKeys"
]);

expect("app/api/outings/generate/add-stop/route.ts", [
  'draft.discoveryPreference === "new-only"',
  "isPreviouslyVisited"
]);

expect("app/api/outings/generate/replace-stop/route.ts", [
  'draft.discoveryPreference === "new-only"',
  "isPreviouslyVisited"
]);

expect("app/build-outing/results/page.tsx", [
  "Mark complete",
  "handleConfirmCompletion",
  "completionSheetOpen",
  "<VisitButton"
]);

expect("app/listings/[slug]/page.tsx", [
  "<VisitButton",
  "listingSnapshot"
]);

expect("app/profile/page.tsx", [
  "<VisitHistoryDashboard"
]);

expect("lib/beta/types.ts", [
  '"outing_completed"',
  '"visit_logged"',
  '"visit_removed"'
]);

expect("supabase/migrations/20260723190000_create_visit_history.sql", [
  "create table if not exists public.user_visits",
  "create or replace function public.set_updated_at()",
  "alter table public.user_visits enable row level security",
  'create policy "Users can read their visit history"'
]);

checkBalancedCss("components/visit-button.module.css");
checkBalancedCss("components/visit-history-dashboard.module.css");
checkBalancedCss("app/build-outing/build-outing-experience.module.css");
checkBalancedCss("app/build-outing/results/results-refresh.module.css");

const resultsPage = read("app/build-outing/results/page.tsx");
if (resultsPage.includes("getStopKind(replacementStop.listing)")) {
  fail("Replacement option still passes a listing where a stop is required");
} else {
  pass("replacement stop type wiring");
}

if (failed) {
  console.error("VENTURE VISIT HISTORY + NEW TO ME CHECK FAILED");
  process.exit(1);
}

console.log("VENTURE VISIT HISTORY + NEW TO ME VERIFIED");
