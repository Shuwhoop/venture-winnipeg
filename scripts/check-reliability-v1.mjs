import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "VENTURE_RELIABILITY_V1_0.md",
  "components/reliability/venture-state.tsx",
  "components/reliability/venture-state.module.css",
  "app/loading.tsx",
  "app/error.tsx",
  "app/global-error.tsx",
  "app/not-found.tsx",
  "app/explore/loading.tsx",
  "app/explore/error.tsx",
  "app/saved/loading.tsx",
  "app/saved/error.tsx",
  "app/listings/[slug]/loading.tsx",
  "app/listings/[slug]/error.tsx",
  "app/build-outing/loading.tsx",
  "app/build-outing/error.tsx",
  "app/build-outing/results/loading.tsx",
  "app/build-outing/results/error.tsx",
  "app/outings/[shareCode]/loading.tsx",
  "app/outings/[shareCode]/error.tsx",
  "public/sw.js"
];

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Missing Reliability V1.0 file: ${relativePath}`);
    process.exit(1);
  }
}

const serviceWorker = fs.readFileSync(
  path.join(root, "public/sw.js"),
  "utf8"
);

if (!serviceWorker.includes('CACHE_VERSION = "venture-app-v5"')) {
  console.error("The Reliability V1.0 service-worker cache version is missing.");
  process.exit(1);
}

const foundation = fs.readFileSync(
  path.join(root, "components/app-foundation/app-foundation.tsx"),
  "utf8"
);

if (!foundation.includes("Back online")) {
  console.error("The reconnection message is missing from AppFoundationRuntime.");
  process.exit(1);
}

console.log("Venture Reliability V1.0 structural check passed.");
