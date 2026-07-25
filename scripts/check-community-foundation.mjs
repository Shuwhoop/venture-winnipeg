import fs from "node:fs";
import path from "node:path";

const root =
  process.argv[2] ??
  process.cwd();

const requiredFiles = [
  "app/community/page.tsx",
  "app/community/[slug]/page.tsx",
  "app/community/actions.ts",
  "app/community/community.module.css",
  "app/community/guidelines/page.tsx",
  "app/admin/community/page.tsx",
  "app/admin/community/actions.ts",
  "app/admin/community/page.module.css",
  "components/community-rsvp-dashboard.tsx",
  "components/community-rsvp-dashboard.module.css",
  "lib/community.ts",
  "lib/community-types.ts",
  "supabase/migrations/20260725130000_create_venture_community.sql",
  "VENTURE_COMMUNITY_FOUNDATION.md"
];

const missing =
  requiredFiles.filter(
    (relativePath) =>
      !fs.existsSync(
        path.join(
          root,
          relativePath
        )
      )
  );

if (missing.length > 0) {
  console.error(
    "Missing Venture community files:"
  );

  for (const file of missing) {
    console.error(`- ${file}`);
  }

  process.exit(1);
}

function read(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
}

const migration =
  read(
    "supabase/migrations/20260725130000_create_venture_community.sql"
  );

const requiredMigrationTokens = [
  "community_experiences",
  "community_experience_stops",
  "community_rsvps",
  "rsvp_to_community_experience",
  "cancel_community_rsvp",
  "No payments are processed"
];

for (
  const token of
  requiredMigrationTokens
) {
  if (!migration.includes(token)) {
    console.error(
      `Migration is missing: ${token}`
    );
    process.exit(1);
  }
}

const forbiddenPaymentTables = [
  "community_payments",
  "community_refunds",
  "community_payouts",
  "stripe_checkout"
];

for (
  const token of
  forbiddenPaymentTables
) {
  if (
    migration
      .toLowerCase()
      .includes(
        token
      )
  ) {
    console.error(
      `Experience-only release contains payment infrastructure: ${token}`
    );
    process.exit(1);
  }
}

const home =
  read(
    "components/today-discovery.tsx"
  );

if (
  !home.includes(
    "VENTURE IS BUILDING"
  ) ||
  !home.includes(
    "/community/"
  )
) {
  console.error(
    "Today does not feature the monthly community experience."
  );
  process.exit(1);
}

const profile =
  read(
    "app/profile/page.tsx"
  );

if (
  !profile.includes(
    "CommunityRsvpDashboard"
  )
) {
  console.error(
    "Profile does not include community RSVPs."
  );
  process.exit(1);
}

const adminHome =
  read(
    "app/admin/page.tsx"
  );

if (
  !adminHome.includes(
    '"/admin/community"'
  )
) {
  console.error(
    "Admin home does not link to community operations."
  );
  process.exit(1);
}

console.log(
  "VENTURE COMMUNITY EXPERIENCE FOUNDATION VERIFIED"
);
