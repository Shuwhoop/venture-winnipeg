import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/accessibility/page.tsx",
  "app/trust-pages.module.css",
  "components/public-footer.tsx",
  "components/public-footer.module.css",
  "components/app-route-chrome.tsx"
];

const missing = requiredFiles.filter(
  (file) => !fs.existsSync(path.join(root, file))
);

if (missing.length > 0) {
  console.error("Missing public trust files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const chrome = fs.readFileSync(
  path.join(root, "components/app-route-chrome.tsx"),
  "utf8"
);

const footer = fs.readFileSync(
  path.join(root, "components/public-footer.tsx"),
  "utf8"
);

const privacy = fs.readFileSync(
  path.join(root, "app/privacy/page.tsx"),
  "utf8"
);

const terms = fs.readFileSync(
  path.join(root, "app/terms/page.tsx"),
  "utf8"
);

const accessibility = fs.readFileSync(
  path.join(root, "app/accessibility/page.tsx"),
  "utf8"
);

const checks = [
  [chrome.includes("<PublicFooter />"), "Public footer is rendered on public routes"],
  [footer.includes('href="/privacy"'), "Footer links to Privacy"],
  [footer.includes('href="/terms"'), "Footer links to Terms"],
  [footer.includes('href="/accessibility"'), "Footer links to Accessibility"],
  [privacy.includes("Anonymous product analytics"), "Privacy page documents analytics"],
  [privacy.includes("unsubscribe"), "Privacy page documents newsletter choices"],
  [terms.includes("Check official information"), "Terms tell users to verify listing details"],
  [terms.includes("User submissions"), "Terms cover submissions and claims"],
  [accessibility.includes("Known beta limitations"), "Accessibility page states beta limitations"],
  [accessibility.includes("reduced-motion"), "Accessibility page includes reduced-motion commitment"]
];

const failed = checks.filter(([passed]) => !passed);

for (const [passed, label] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

if (failed.length > 0) {
  process.exit(1);
}

console.log("Public trust foundation checks passed.");
