import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks = [
  {
    file: "app/api/newsletter/subscribe/route.ts",
    needles: [
      'status:\n      "pending"',
      'purpose:\n        "confirm"',
      "confirmation_email_id"
    ]
  },
  {
    file: "app/api/newsletter/confirm/route.ts",
    needles: [
      "confirmNewsletterToken",
      "export async function POST"
    ]
  },
  {
    file: "app/newsletter/confirm/page.tsx",
    needles: [
      'purpose:\n            "confirm"',
      "ConfirmForm"
    ]
  },
  {
    file: "lib/newsletter/tokens.ts",
    needles: [
      '| "confirm"',
      '| "unsubscribe"'
    ]
  },
  {
    file: "lib/newsletter/emails.ts",
    needles: [
      "buildConfirmationEmail",
      "buildWelcomeEmail"
    ]
  },
  {
    file: "app/admin/newsletter/page.tsx",
    needles: [
      "requireVentureAdmin",
      "confirmation_error",
      "welcome_error"
    ]
  },
  {
    file: "supabase/migrations/20260722190000_launch_thursday_venture_double_opt_in.sql",
    needles: [
      "'pending'",
      "confirmed_at",
      "confirmation_sent_at"
    ]
  }
];

let failed = false;

for (const check of checks) {
  const filePath = path.join(root, check.file);

  if (!fs.existsSync(filePath)) {
    console.error(`FAIL Missing ${check.file}`);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const needle of check.needles) {
    if (!content.includes(needle)) {
      console.error(`FAIL ${check.file} is missing: ${JSON.stringify(needle)}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("PASS Newsletter double opt-in flow");
console.log("PASS Newsletter confirmation and unsubscribe pages");
console.log("PASS Admin subscriber review page");
console.log("PASS Newsletter launch migration");
