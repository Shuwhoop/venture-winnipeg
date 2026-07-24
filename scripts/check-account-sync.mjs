import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "app/layout.tsx",
  "app/sign-in/page.tsx",
  "app/sign-in/page.module.css",
  "app/auth/callback/route.ts",
  "app/offline/saved/page.tsx",
  "components/account-sync/account-sync.tsx",
  "components/bottom-nav.tsx",
  "components/account-sync/account-sync.module.css",
  "lib/account-sync.ts",
  "lib/account-sync-storage.ts",
  "lib/saved-listings.ts",
  "lib/saved-outings.ts",
  "supabase/migrations/20260723013000_create_account_sync.sql",
  "public/sw.js",
  "VENTURE_APP_FIRST_DIRECTION.md"
];

const missing = requiredFiles.filter(
  (file) =>
    !fs.existsSync(path.join(root, file))
);

if (missing.length > 0) {
  console.error("Account Sync check failed. Missing files:");
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const checks = [
  [
    "app/layout.tsx",
    "venture-app-first"
  ],
  [
    "components/bottom-nav.tsx",
    'label: "Today"'
  ],
  [
    "components/app-route-chrome.tsx",
    "<AccountSyncRuntime />"
  ],
  [
    "components/app-route-chrome.tsx",
    "<PublicFooter />",
    false
  ],
  [
    "app/profile/page.tsx",
    "<AccountSyncCard />"
  ],
  [
    "app/saved/page.tsx",
    "<SavedSyncBanner />"
  ],
  [
    "proxy.ts",
    '"/auth/:path*"'
  ],
  [
    "public/sw.js",
    'url.pathname.startsWith("/saved")'
  ],
  [
    "supabase/migrations/20260723013000_create_account_sync.sql",
    "alter table public.user_saved_listings enable row level security"
  ],
  [
    "supabase/migrations/20260723013000_create_account_sync.sql",
    "auth.uid() = user_id"
  ]
];

for (const [file, expected, shouldContain = true] of checks) {
  const fullPath = path.join(root, file);

  if (!fs.existsSync(fullPath)) {
    console.error(`Account Sync check failed. Missing ${file}.`);
    process.exit(1);
  }

  const contents = fs.readFileSync(fullPath, "utf8");
  const contains = contents.includes(expected);

  if (contains !== shouldContain) {
    console.error(
      shouldContain
        ? `Account Sync check failed. ${file} does not contain ${expected}.`
        : `Account Sync check failed. ${file} still contains ${expected}.`
    );
    process.exit(1);
  }
}

const serviceWorker = fs.readFileSync(
  path.join(root, "public/sw.js"),
  "utf8"
);

for (const unsafePath of [
  "/admin",
  "/api",
  "/auth",
  "/sign-in",
  "/profile",
  "/saved"
]) {
  if (!serviceWorker.includes(unsafePath)) {
    console.error(
      `Service worker is missing the private-route exclusion ${unsafePath}.`
    );
    process.exit(1);
  }
}

console.log("Venture Account Sync structural checks passed.");
