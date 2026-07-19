import {
  existsSync,
  readFileSync
} from "node:fs";

import {
  resolve
} from "node:path";


const root =
  process.cwd();


const requiredFiles = [
  "app/api/newsletter/subscribe/route.ts",
  "app/api/newsletter/unsubscribe/route.ts",
  "app/newsletter/page.tsx",
  "app/newsletter/unsubscribe/page.tsx",
  "app/newsletter/unsubscribe/unsubscribe-form.tsx",
  "components/newsletter-signup/newsletter-signup.tsx",
  "components/newsletter-signup/newsletter-signup.module.css",
  "lib/venture-brand.ts",
  "lib/newsletter/emails.ts",
  "lib/newsletter/resend.ts",
  "lib/newsletter/subscribers.ts",
  "lib/newsletter/tokens.ts",
  "supabase/migrations/20260718213000_create_newsletter_subscribers.sql"
];


let failed =
  false;


for (
  const relativePath
  of requiredFiles
) {
  const fullPath =
    resolve(
      root,
      relativePath
    );

  if (!existsSync(fullPath)) {
    console.error(
      `MISSING: ${relativePath}`
    );

    failed =
      true;
  } else {
    console.log(
      `FOUND: ${relativePath}`
    );
  }
}


function requireText(
  relativePath,
  values
) {
  const fullPath =
    resolve(
      root,
      relativePath
    );

  if (!existsSync(fullPath)) {
    return;
  }

  const content =
    readFileSync(
      fullPath,
      "utf8"
    );

  for (
    const value
    of values
  ) {
    if (!content.includes(value)) {
      console.error(
        `CHECK FAILED in ${relativePath}: ${value}`
      );

      failed =
        true;
    }
  }
}


requireText(
  "app/api/newsletter/subscribe/route.ts",
  [
    "newsletter_subscribers",
    "consent_text",
    "createNewsletterToken",
    "sendNewsletterEmail"
  ]
);


requireText(
  "components/newsletter-signup/newsletter-signup.tsx",
  [
    "EVERY THURSDAY",
    "required",
    'type="checkbox"',
    "unsubscribe at any time"
  ]
);


requireText(
  "lib/newsletter/emails.ts",
  [
    "Prince Malimbiza",
    "make it easier for people to come together",
    "create more memories",
    "support the local"
  ]
);


requireText(
  "supabase/migrations/20260718213000_create_newsletter_subscribers.sql",
  [
    "email_normalized",
    "consent_source",
    "consent_version",
    "unsubscribed_at",
    "enable row level security"
  ]
);


const packagePaths =
  requiredFiles.map(
    (relativePath) =>
      resolve(
        root,
        relativePath
      )
  );


let princeOccurrences =
  0;

for (
  const fullPath
  of packagePaths
) {
  if (!existsSync(fullPath)) {
    continue;
  }

  const content =
    readFileSync(
      fullPath,
      "utf8"
    );

  princeOccurrences +=
    content.split(
      "Prince Malimbiza"
    ).length - 1;
}


if (princeOccurrences !== 2) {
  console.error(
    `NAME CHECK FAILED: Prince Malimbiza should appear only in the HTML and text welcome message. Found ${princeOccurrences} occurrences.`
  );

  failed =
    true;
}


if (failed) {
  process.exitCode =
    1;
} else {
  console.log(
    "\nVenture newsletter foundation checks passed."
  );
}
