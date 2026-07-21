import fs from "node:fs";

const path = "app/build-outing/page.tsx";
const source = fs.readFileSync(path, "utf8");

const required = [
  'import SubmitListingEntry from "@/components/submit-listing-entry/submit-listing-entry";',
  'currentStep === 0',
  '<SubmitListingEntry placement="home" />'
];

for (const text of required) {
  if (!source.includes(text)) {
    throw new Error(`Missing expected build-outing text: ${text}`);
  }
}

const submitCount = (source.match(/<SubmitListingEntry/g) ?? []).length;
if (submitCount !== 1) {
  throw new Error(`Expected one SubmitListingEntry in build-outing, found ${submitCount}.`);
}

console.log("Build Outing submit-entry first-step check passed.");
