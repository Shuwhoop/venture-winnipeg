import {
  readFileSync,
  existsSync
} from "node:fs";
import {
  resolve
} from "node:path";

const root = process.cwd();
const requiredFiles = [
  "app/admin/data-pipeline/page.tsx",
  "app/admin/data-pipeline/events/page.tsx",
  "app/admin/data-pipeline/quality/page.tsx",
  "app/admin/data-pipeline/pipeline-shell.tsx",
  "app/admin/data-pipeline/pipeline-test-button.tsx",
  "app/admin/data-pipeline/data-pipeline.module.css",
  "app/api/admin/data-pipeline/export/route.ts",
  "lib/admin/data-pipeline.ts"
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    throw new Error(`Missing ${file}`);
  }
}

const read = (file) =>
  readFileSync(resolve(root, file), "utf8");

const overview = read(
  "app/admin/data-pipeline/page.tsx"
);
const events = read(
  "app/admin/data-pipeline/events/page.tsx"
);
const quality = read(
  "app/admin/data-pipeline/quality/page.tsx"
);
const exportRoute = read(
  "app/api/admin/data-pipeline/export/route.ts"
);
const pipeline = read(
  "lib/admin/data-pipeline.ts"
);
const betaTypes = read(
  "lib/beta/types.ts"
);
const betaClient = read(
  "lib/beta/client.ts"
);
const betaServer = read(
  "lib/beta/server.ts"
);
const migration = read(
  "supabase/migrations/20260720213000_create_analytics_lab.sql"
);

for (const page of [overview, events, quality]) {
  if (!page.includes("requireVentureAdmin")) {
    throw new Error(
      "Every data-pipeline page must require an administrator."
    );
  }
}

if (!exportRoute.includes("getVentureAdmin")) {
  throw new Error(
    "The data-pipeline export must require an administrator."
  );
}

for (const token of [
  "duplicate_event",
  "slow_ingestion",
  "invalid_exposure",
  "missing_recommendation_version",
  "sequence_warning",
  "qualityScore"
]) {
  if (!pipeline.includes(token)) {
    throw new Error(
      `Data-pipeline diagnostics are missing ${token}`
    );
  }
}

if (!betaTypes.includes('"pipeline_test"')) {
  throw new Error(
    "The safe pipeline test event is missing from the event taxonomy."
  );
}

if (
  !betaClient.includes("NEXT_PUBLIC_ANALYTICS_ENVIRONMENT") ||
  !betaServer.includes("getBetaEnvironment")
) {
  throw new Error(
    "Analytics environment metadata is not instrumented."
  );
}

if (
  migration.includes("node .\\scripts") ||
  !migration.includes("venture_analytics_sessions") ||
  !migration.includes("array_agg(visitor_id")
) {
  throw new Error(
    "The Analytics Lab migration is still corrupted or incomplete."
  );
}

console.log(
  "Venture Data Pipeline Monitor structural checks passed."
);
