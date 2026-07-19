import {
  existsSync,
  readFileSync
} from "node:fs";

const files = [
  "app/api/newsletter/subscribe/route.ts",
  "supabase/migrations/20260718225500_reconcile_newsletter_subscriber_schema.sql"
];

let failed = false;

for (const file of files) {
  if (!existsSync(file)) {
    console.error(`MISSING: ${file}`);
    failed = true;
  }
}

if (!failed) {
  const route = readFileSync(files[0], "utf8");
  const migration = readFileSync(files[1], "utf8");

  for (const required of [
    "consent_text_version",
    "Newsletter legacy lookup failed",
    "Newsletter insert failed",
    'email_normalized:\n            email'
  ]) {
    if (!route.includes(required)) {
      console.error(`ROUTE CHECK FAILED: ${required}`);
      failed = true;
    }
  }

  for (const required of [
    "consent_text_version set default 'legacy'",
    "newsletter_subscribers_email_normalized_uidx",
    "add column if not exists consent_version text"
  ]) {
    if (!migration.includes(required)) {
      console.error(`MIGRATION CHECK FAILED: ${required}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("Newsletter schema compatibility checks passed.");
}
