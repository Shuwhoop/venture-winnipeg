import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  ".env.example",
  "app/admin/experiments/page.tsx",
  "app/admin/experiments/[slug]/page.tsx",
  "app/admin/experiments/experiment-shell.tsx",
  "app/admin/experiments/experiment-status-controls.tsx",
  "app/admin/experiments/experiment-lab.module.css",
  "app/admin/recommendations/page.tsx",
  "app/api/admin/experiments/[id]/route.ts",
  "app/api/admin/experiments/export/route.ts",
  "app/api/experiments/assignment/route.ts",
  "lib/admin/experiment-lab.ts",
  "lib/experiments/client.ts",
  "lib/experiments/types.ts",
  "scripts/check-experiment-lab.mjs",
  "supabase/migrations/20260720230000_create_experiment_lab.sql"
];

const errors = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing ${relativePath}`);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

for (const file of requiredFiles) {
  read(file);
}

const betaTypes =
  read("lib/beta/types.ts");

for (const eventName of [
  "experiment_exposure",
  "outing_saved",
  "outing_unsaved"
]) {
  if (!betaTypes.includes(`"${eventName}"`)) {
    errors.push(
      `Beta event taxonomy is missing ${eventName}`
    );
  }
}

const assignmentRoute =
  read(
    "app/api/experiments/assignment/route.ts"
  );

for (const token of [
  "createHash",
  "traffic_percentage",
  "assignment_version",
  "not-in-traffic",
  "Cache-Control"
]) {
  if (!assignmentRoute.includes(token)) {
    errors.push(
      `Assignment route is missing ${token}`
    );
  }
}

const resultPage =
  read(
    "app/build-outing/results/page.tsx"
  );

for (const token of [
  "useExperimentAssignment",
  "outing-results-presentation-v1",
  "outing_saved",
  "outing-experiment-preview",
  "recommendationVersion"
]) {
  if (!resultPage.includes(token)) {
    errors.push(
      `Outing results integration is missing ${token}`
    );
  }
}

if (
  resultPage.includes(
    "Experiment variant:"
  )
) {
  errors.push(
    "Public outing UI exposes the internal experiment label."
  );
}

const generator =
  read(
    "app/api/outings/generate/route.ts"
  );

for (const token of [
  "RECOMMENDATION_VERSION",
  "route-score-v1",
  "categoryDiversity",
  "neighbourhoodDiversity",
  "stopKindDiversity"
]) {
  if (!generator.includes(token)) {
    errors.push(
      `Outing generator is missing ${token}`
    );
  }
}

const migration =
  read(
    "supabase/migrations/20260720230000_create_experiment_lab.sql"
  );

for (const token of [
  "venture_experiments",
  "experiment_exposure",
  "recommendationVersion",
  "outing-results-presentation-v1",
  "row level security"
]) {
  if (!migration.includes(token)) {
    errors.push(
      `Experiment migration is missing ${token}`
    );
  }
}

if (migration.includes("max(visitor_id)")) {
  errors.push(
    "Migration contains the invalid max(uuid) pattern."
  );
}

const adminLib =
  read(
    "lib/admin/experiment-lab.ts"
  );

for (const token of [
  "wilsonInterval",
  "minimum_sample_size",
  "negativeFeedbackRate",
  "getRecommendationLab",
  "getExperimentExportRows"
]) {
  if (!adminLib.includes(token)) {
    errors.push(
      `Experiment analysis is missing ${token}`
    );
  }
}

const env =
  read(".env.example");

if (
  !env.includes(
    "NEXT_PUBLIC_EXPERIMENTS_ENABLED"
  )
) {
  errors.push(
    ".env.example is missing the experiment feature flag."
  );
}

if (errors.length > 0) {
  console.error(
    "\nExperiment Lab check failed:\n"
  );

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  "Experiment Lab structural check passed."
);
