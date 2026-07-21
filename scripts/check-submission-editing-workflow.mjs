import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "app/admin/submissions/page.tsx",
  "app/admin/submissions/actions.ts",
  "app/admin/submissions/page.module.css",
  "supabase/migrations/20260721043000_link_submission_drafts.sql"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const page = fs.readFileSync(
  path.join(root, "app/admin/submissions/page.tsx"),
  "utf8"
);
const actions = fs.readFileSync(
  path.join(root, "app/admin/submissions/actions.ts"),
  "utf8"
);
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260721043000_link_submission_drafts.sql"),
  "utf8"
);

const checks = [
  [page.includes("Create draft & edit full listing"), "submission draft editor action"],
  [page.includes("Edit full listing"), "linked and import editor links"],
  [page.includes("Mark complete after publishing"), "linked completion action"],
  [page.includes("returnTo"), "return queue preservation"],
  [actions.includes("openSubmissionInEditor"), "draft creation server action"],
  [actions.includes("completeLinkedSubmission"), "submission completion server action"],
  [actions.includes("submission_draft_created"), "draft creation audit log"],
  [migration.includes("linked_entity_id"), "linked entity migration"],
  [migration.includes("listing_submissions_linked_entity_idx"), "linked entity index"]
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  throw new Error(
    `Submission workflow check failed: ${failed.map(([, label]) => label).join(", ")}`
  );
}

console.log("Venture submission-to-editor workflow check passed.");
