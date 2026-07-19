import {
  existsSync,
  readFileSync
} from "node:fs";

import {
  resolve
} from "node:path";


const migrationPath =
  resolve(
    process.cwd(),
    "supabase/migrations/20260718213000_create_newsletter_subscribers.sql"
  );


if (
  !existsSync(
    migrationPath
  )
) {
  console.error(
    "MISSING: newsletter migration"
  );

  process.exit(1);
}


const sql =
  readFileSync(
    migrationPath,
    "utf8"
  );


const required = [
  "add column if not exists consent_text text",
  "add column if not exists welcome_sent_at timestamptz",
  "newsletter_subscribers_status_check",
  "newsletter_subscribers_email_normalized_uidx",
  "enable row level security",
  "grant select, insert, update",
  "comment on column"
];


let failed =
  false;


for (
  const value
  of required
) {
  if (
    !sql.includes(
      value
    )
  ) {
    console.error(
      `CHECK FAILED: ${value}`
    );

    failed =
      true;
  }
}


if (
  /create table if not exists[\s\S]*?consent_text text not null[\s\S]*?;\s*[\s\S]*?comment on column/.test(
    sql
  ) &&
  !sql.includes(
    "add column if not exists consent_text text"
  )
) {
  console.error(
    "CHECK FAILED: migration is not compatible with an existing table."
  );

  failed =
    true;
}


if (failed) {
  process.exitCode =
    1;
} else {
  console.log(
    "Newsletter migration compatibility checks passed."
  );
}
