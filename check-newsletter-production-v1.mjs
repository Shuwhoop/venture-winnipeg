import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "app/admin/newsletter/studio/page.tsx",
  "app/admin/newsletter/studio/newsletter-studio.tsx",
  "app/admin/newsletter/studio/page.module.css",
  "app/api/admin/newsletter/setup/route.ts",
  "app/api/admin/newsletter/sync/route.ts",
  "app/api/admin/newsletter/preview/route.ts",
  "app/api/admin/newsletter/test/route.ts",
  "app/api/admin/newsletter/broadcasts/route.ts",
  "app/api/newsletter/webhooks/resend/route.ts",
  "lib/newsletter/campaign-draft.ts",
  "lib/newsletter/campaign-input.ts",
  "lib/newsletter/campaign-template.ts",
  "lib/newsletter/production.ts",
  "VENTURE_NEWSLETTER_PRODUCTION_V1_0.md",
  "VENTURE_NEWSLETTER_PRODUCTION_V1_0_1.md"
];

const failures = [];

for (const relativePath of requiredFiles) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
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

requireText("lib/newsletter/campaign-template.ts", [
  "{{{contact.first_name|there}}}",
  "{{{RESEND_UNSUBSCRIBE_URL}}}",
  "VENTURE_POSTAL_ADDRESS"
]);

requireText("lib/newsletter/resend.ts", [
  "Confirmed Venture Subscribers",
  "Venture This Weekend",
  "createResendBroadcastDraft"
]);

requireText("lib/newsletter/production.ts", [
  "syncNewsletterAudience",
  "syncSingleNewsletterSubscriber"
]);

requireText("app/api/newsletter/webhooks/resend/route.ts", [
  "resend.webhooks.verify",
  "email.bounced",
  "email.complained",
  "email.suppressed",
  "suppression.added"
]);

requireText("app/api/admin/newsletter/broadcasts/route.ts", [
  "createResendBroadcastDraft",
  "Draft created in Resend"
]);


const studioCssFile = path.join(
  root,
  "app/admin/newsletter/studio/page.module.css"
);

if (fs.existsSync(studioCssFile)) {
  const content = fs.readFileSync(studioCssFile, "utf8");

  if (/^button:focus-visible/m.test(content) || /^a:focus-visible/m.test(content)) {
    failures.push("Newsletter Studio focus selectors must be scoped to a local CSS Module class.");
  }

  if (!content.includes(".page button:focus-visible") || !content.includes(".page a:focus-visible")) {
    failures.push("Newsletter Studio is missing locally scoped focus-visible selectors.");
  }
}

const broadcastFile = path.join(
  root,
  "app/api/admin/newsletter/broadcasts/route.ts"
);

if (fs.existsSync(broadcastFile)) {
  const content = fs.readFileSync(broadcastFile, "utf8");

  if (/send\s*:\s*true/.test(content)) {
    failures.push("Broadcast route must not send immediately.");
  }
}

if (failures.length > 0) {
  console.error("Venture Newsletter Production V1.0.1 check failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("Venture Newsletter Production V1.0.1 structural check passed.");
