import fs from "node:fs";

const checks = [
  [
    "app/layout.tsx",
    ["BetaFeedback", "NEXT_PUBLIC_BETA_FEEDBACK_ENABLED"]
  ],
  [
    "components/beta-feedback/beta-feedback.tsx",
    ["feedback_opened", "/api/beta/feedback", "permissionToContact"]
  ],
  [
    "app/api/beta/event/route.ts",
    ["checkBetaRateLimit", "beta_events", "isAllowedBetaOrigin"]
  ],
  [
    "app/api/beta/feedback/route.ts",
    ["beta_feedback", "cleanFeedbackMessage", "permission_to_contact"]
  ],
  [
    "app/admin/beta/page.tsx",
    ["requireVentureAdmin", "Outside-test funnel", "Recent feedback"]
  ],
  [
    "lib/admin/beta-insights.ts",
    ["getBetaInsights", "beta_events", "beta_feedback"]
  ],
  [
    "supabase/migrations/20260720190000_create_beta_feedback.sql",
    ["enable row level security", "revoke all", "service_role"]
  ]
];

let failed = false;

for (const [file, required] of checks) {
  if (!fs.existsSync(file)) {
    console.error(`MISSING: ${file}`);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(file, "utf8");

  for (const text of required) {
    if (!content.includes(text)) {
      console.error(`CHECK FAILED in ${file}: ${text}`);
      failed = true;
    }
  }

  if (!failed) {
    console.log(`FOUND: ${file}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("Beta feedback and insights checks passed.");
