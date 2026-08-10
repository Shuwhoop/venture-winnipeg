import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks = [
  ["lib/api/production-protection.ts", "protectMutationRequest"],
  ["lib/api/production-protection.ts", "venture_api_failure"],
  ["lib/api/request-validation.ts", "validateGenerateOutingShape"],
  ["app/api/outings/generate/route.ts", 'scope: "outing-generate"'],
  ["app/api/outings/generate/add-stop/route.ts", 'scope: "outing-add-stop"'],
  ["app/api/outings/generate/replace-stop/route.ts", 'scope: "outing-replace-stop"'],
  ["app/api/outings/generate/remove-stop/route.ts", 'scope: "outing-remove-stop"'],
  ["app/api/outings/[shareCode]/group/route.ts", "group-remix:"],
  ["next.config.ts", 'key: "X-Content-Type-Options"'],
  ["next.config.ts", "frame-ancestors 'none'"],
  ["tests/production-protection.test.mjs", "node:test"],
  ["lib/supabase/proxy.ts", 'pathname.startsWith("/api/admin/")'],
  ["lib/supabase/proxy.ts", "isProtectedAdminPage"],
  ["lib/auth/admin.ts", "requireVentureAdmin"]
];

let failed = false;

for (const [relative, needle] of checks) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    console.error(`Missing ${relative}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    console.error(`Expected marker not found in ${relative}: ${needle}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("Venture Production Protection V1.0 source checks passed.");
