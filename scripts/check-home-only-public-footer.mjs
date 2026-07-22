import fs from "node:fs";

const file = "components/app-route-chrome.tsx";
const source = fs.readFileSync(file, "utf8");

const checks = [
  [source.includes('pathname === "/"'), "Footer is restricted to the home route"],
  [source.includes("<PublicFooter />"), "Public footer remains available on home"],
  [source.includes("<BottomNav />"), "Bottom navigation remains on public routes"],
  [source.includes("pathname === \"/\" ? (\n        <PublicFooter />"), "Footer conditional wraps the footer itself"]
];

let failed = false;
for (const [condition, message] of checks) {
  if (condition) {
    console.log(`PASS ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("Home-only public footer checks passed.");
