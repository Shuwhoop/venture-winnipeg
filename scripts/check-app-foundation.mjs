import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const manifest = read("app/manifest.ts");
const worker = read("public/sw.js");
const registration = read("components/service-worker-registration.tsx");
const chrome = read("components/app-route-chrome.tsx");
const profile = read("app/profile/page.tsx");
const admin = read("app/admin/page.tsx");

const checks = [
  [manifest.includes('short_name: "Venture"'), "Manifest uses a compact app name"],
  [manifest.includes('display: "standalone"'), "Manifest enables standalone display"],
  [manifest.includes('purpose: "maskable"'), "Manifest includes a maskable icon"],
  [exists("public/icons/icon-192.png"), "192px icon exists"],
  [exists("public/icons/icon-512.png"), "512px icon exists"],
  [exists("public/icons/maskable-512.png"), "Maskable icon exists"],
  [exists("app/offline/page.tsx"), "Offline page exists"],
  [worker.includes('url.pathname.startsWith("/admin")'), "Service worker excludes admin routes"],
  [worker.includes('url.pathname.startsWith("/api")'), "Service worker excludes API routes"],
  [worker.includes("SKIP_WAITING"), "Service worker supports user-approved updates"],
  [registration.includes("venture:sw-waiting"), "Registration announces waiting updates"],
  [chrome.includes("AppFoundationRuntime"), "Public app chrome mounts PWA runtime"],
  [profile.includes("AppStatusCard"), "Profile displays app status"],
  [exists("app/admin/pwa-readiness/page.tsx"), "Admin PWA readiness route exists"],
  [admin.includes("/admin/pwa-readiness"), "Admin hub links to PWA readiness"]
];

let failed = false;
for (const [passed, label] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  failed ||= !passed;
}

if (failed) {
  process.exit(1);
}

console.log("Venture App Foundation checks passed.");
