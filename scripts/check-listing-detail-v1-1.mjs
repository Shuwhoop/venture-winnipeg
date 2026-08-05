import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const requiredFiles = [
  "components/listing-photo-frame.tsx",
  "components/listing-photo-frame.module.css",
  "components/admin/listing-photo-editor.tsx",
  "lib/data/listing-detail.ts",
  "lib/media/photo-rights.ts",
  "app/listings/[slug]/page.tsx",
  "VENTURE_LISTING_DETAIL_V1_1.md"
];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Missing ${relativePath}`);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const publicFrame = read("components/listing-photo-frame.tsx");
const publicPage = read("app/listings/[slug]/page.tsx");
const detailData = read("lib/data/listing-detail.ts");
const adminEditor = read("components/admin/listing-photo-editor.tsx");

const checks = [
  [publicFrame.includes("ListingPhotoFrame"), "Listing photo frame is missing"],
  [!publicFrame.toLowerCase().includes("rights"), "Public photo frame still exposes rights language"],
  [!publicFrame.includes("figcaption"), "Public photo frame still renders the internal status caption"],
  [!publicPage.includes("Photo rights protected"), "Public listing page still exposes photo-rights status"],
  [!publicPage.includes("rightsLabel"), "Public listing page still reads a photo rights label"],
  [detailData.includes("getApprovedPrimaryPhoto"), "Approved photo query is missing"],
  [detailData.includes("isPublishableRightsBasis"), "Server-side rights gate is missing"],
  [detailData.includes('.eq("is_primary", true)'), "Primary photo filter is missing"],
  [!detailData.includes("rightsLabel:"), "Public detail object still exposes rightsLabel"],
  [!detailData.includes("rightsBasis:"), "Public detail object still exposes rightsBasis"],
  [adminEditor.includes("Photo permission"), "Admin photo permission control is missing"],
  [adminEditor.includes("rightsBasis"), "Admin rights basis remains unavailable"],
  [adminEditor.includes("rightsNotes"), "Admin permission evidence notes remain unavailable"]
];

for (const [passed, message] of checks) {
  if (!passed) failures.push(message);
}

if (failures.length) {
  console.error("Listing Detail V1.1 check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Listing Detail V1.1 structural checks passed.");
