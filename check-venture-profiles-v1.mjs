import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const requiredFiles = [
  "VENTURE_PROFILES_V1_0.md",
  "supabase/migrations/20260805193000_create_private_profile_system.sql",
  "app/profile/page.tsx",
  "app/profile/loading.tsx",
  "app/profile/error.tsx",
  "app/profile/onboarding/page.tsx",
  "app/profile/edit/page.tsx",
  "app/profile/preferences/page.tsx",
  "app/profile/settings/page.tsx",
  "app/profile/profile-system.module.css",
  "app/api/profile/route.ts",
  "app/api/profile/avatar/route.ts",
  "app/api/profile/newsletter/route.ts",
  "app/api/profile/export/route.ts",
  "app/api/profile/delete/route.ts",
  "app/admin/users/page.tsx",
  "app/admin/users/page.module.css",
  "components/profile/profile-pages.tsx",
  "components/profile/profile-avatar-editor.tsx",
  "components/profile/profile-header-avatar.tsx",
  "components/profile/use-profile-data.ts",
  "lib/profile-system.ts",
  "lib/profile-server.ts",
  "lib/server-rate-limit.ts",
  "proxy.ts"
];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Missing ${relativePath}`);
  }
}

function requireText(relativePath, fragments) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    return;
  }

  const content = fs.readFileSync(fullPath, "utf8");

  for (const fragment of fragments) {
    if (!content.includes(fragment)) {
      failures.push(`${relativePath} is missing: ${fragment}`);
    }
  }
}

requireText(
  "supabase/migrations/20260805193000_create_private_profile_system.sql",
  [
    "create table if not exists public.user_preferences",
    "create table if not exists public.notification_preferences",
    "profile_visibility in ('private', 'public')",
    "Users can read their own profile",
    "Users can upload their own avatar",
    "on_auth_user_created_venture_profile"
  ]
);

requireText("components/profile/profile-pages.tsx", [
  "ProfileDashboard",
  "ProfileOnboarding",
  "ProfilePreferencesEditor",
  "ProfileSettings",
  "Download my Venture data",
  "Delete account permanently",
  "Resend confirmation"
]);

requireText("lib/supabase/proxy.ts", [
  "PUBLIC_ADMIN_PATHS",
  "Administrator access is required.",
  "VENTURE_ADMIN_EMAILS"
]);

requireText("proxy.ts", [
  '"/admin/:path*"',
  '"/api/admin/:path*"',
  '"/profile/:path*"'
]);

requireText("app/api/profile/route.ts", [
  "isSameOriginRequest",
  "consumeRateLimit",
  "Too many profile changes"
]);

requireText("app/api/profile/delete/route.ts", [
  'body.confirmation !== "DELETE"',
  "admin.auth.admin.deleteUser"
]);


const neighbourhoodFile = path.join(root, "lib/winnipeg-neighbourhoods.ts");

if (fs.existsSync(neighbourhoodFile)) {
  const neighbourhoodSource = fs.readFileSync(neighbourhoodFile, "utf8");
  const declarationCount = (
    neighbourhoodSource.match(/export\s+const\s+WINNIPEG_NEIGHBOURHOODS\s*=/g) ?? []
  ).length;

  if (declarationCount !== 1) {
    failures.push(
      `lib/winnipeg-neighbourhoods.ts must declare WINNIPEG_NEIGHBOURHOODS exactly once; found ${declarationCount}`
    );
  }
}

const backupFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", ".venv", "venv"].includes(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (
      entry.name.endsWith(".bak") ||
      entry.name.includes(".backup-") ||
      entry.name.includes(".before-")
    ) {
      backupFiles.push(path.relative(root, fullPath));
    }
  }
}

walk(root);

if (backupFiles.length > 0) {
  failures.push(
    `Source backup files remain: ${backupFiles.slice(0, 5).join(", ")}`
  );
}

if (failures.length > 0) {
  console.error("Venture Profiles V1.0 check failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("Venture Profiles V1.0.1 structural check passed.");
