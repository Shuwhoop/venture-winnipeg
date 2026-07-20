import {
  existsSync,
  readFileSync
} from "node:fs";
import {
  resolve
} from "node:path";

const root =
  process.cwd();

const checks = [
  {
    file:
      "app/admin/analytics/page.tsx",
    tokens: [
      "Analytics Lab",
      "ANALYTICS_METRIC_GLOSSARY",
      "Events CSV"
    ]
  },
  {
    file:
      "app/admin/analytics/funnels/page.tsx",
    tokens: [
      "Core session funnel",
      "previousRate"
    ]
  },
  {
    file:
      "app/admin/analytics/retention/page.tsx",
    tokens: [
      "WEEKLY COHORT MATRIX",
      "week.observable"
    ]
  },
  {
    file:
      "app/admin/analytics/inventory/page.tsx",
    tokens: [
      "Coverage and engagement together",
      "upcomingByWeek"
    ]
  },
  {
    file:
      "app/admin/analytics/feedback/page.tsx",
    tokens: [
      "Common words",
      "negativePages"
    ]
  },
  {
    file:
      "app/api/admin/analytics/export/route.ts",
    tokens: [
      "getVentureAdmin",
      "Content-Disposition",
      "private, no-store"
    ]
  },
  {
    file:
      "components/analytics/venture-analytics.tsx",
    tokens: [
      "session_started",
      "page_view",
      "outing_builder_opened"
    ]
  },
  {
    file:
      "lib/admin/analytics-lab.ts",
    tokens: [
      "ANALYTICS_EVENT_TAXONOMY",
      "ANALYTICS_METRIC_GLOSSARY",
      "buildRetention",
      "getAnalyticsExportRows",
      "MIN_RELIABLE_SESSIONS"
    ]
  },
  {
    file:
      "lib/beta/client.ts",
    tokens: [
      "SESSION_TIMEOUT_MS",
      "VISITOR_COOKIE",
      "sessionStorage",
      "deviceClass"
    ]
  },
  {
    file:
      "lib/beta/server.ts",
    tokens: [
      "recordServerBetaEvent",
      "cleanVisitorId",
      "client_created_at"
    ]
  },
  {
    file:
      "supabase/migrations/20260720213000_create_analytics_lab.sql",
    tokens: [
      "visitor_id uuid",
      "venture_analytics_sessions",
      "venture_analytics_daily",
      "revoke all"
    ]
  }
];

let failed = false;

for (const check of checks) {
  const path =
    resolve(root, check.file);

  if (!existsSync(path)) {
    console.error(
      `Missing: ${check.file}`
    );
    failed = true;
    continue;
  }

  const source =
    readFileSync(
      path,
      "utf8"
    );

  for (const token of check.tokens) {
    if (!source.includes(token)) {
      console.error(
        `Missing token "${token}" in ${check.file}`
      );
      failed = true;
    }
  }
}

const layout =
  readFileSync(
    resolve(
      root,
      "app/layout.tsx"
    ),
    "utf8"
  );

if (
  !layout.includes(
    "NEXT_PUBLIC_ANALYTICS_ENABLED"
  ) ||
  !layout.includes(
    "<VentureAnalytics />"
  )
) {
  console.error(
    "Root layout is not mounting the analytics component behind its environment switch."
  );
  failed = true;
}

const feedback =
  readFileSync(
    resolve(
      root,
      "components/beta-feedback/beta-feedback.tsx"
    ),
    "utf8"
  );

if (
  feedback.includes(
    'eventName: "page_view"'
  )
) {
  console.error(
    "BetaFeedback still records page views, which would duplicate global analytics."
  );
  failed = true;
}

const eventTypes =
  readFileSync(
    resolve(
      root,
      "lib/beta/types.ts"
    ),
    "utf8"
  );

for (
  const eventName of [
    "listing_saved",
    "outing_generated",
    "outing_shared",
    "newsletter_signup",
    "report_submitted"
  ]
) {
  if (!eventTypes.includes(eventName)) {
    console.error(
      `Event taxonomy is missing ${eventName}.`
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  "Analytics Lab structural checks passed."
);
