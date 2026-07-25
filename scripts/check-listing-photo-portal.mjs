import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "app/admin/submissions/photos/page.tsx",
  "app/admin/submissions/photos/photo-portal.tsx",
  "app/admin/submissions/photos/page.module.css",
  "app/api/admin/listing-photos/route.ts",
  "components/listing-photo-upload/listing-photo-upload.tsx",
  "lib/media/client-photo.ts",
  "lib/media/listing-photo-server.ts",
  "supabase/migrations/20260724023000_create_listing_photo_portal.sql"
];

for (const relative of requiredFiles) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Missing photo portal file: ${relative}`);
  }
}

function includes(relative, tokens) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  for (const token of tokens) {
    if (!source.includes(token)) {
      throw new Error(`${relative} is missing required token: ${token}`);
    }
  }
}

includes("app/admin/submissions/layout.tsx", [
  "/admin/submissions/photos",
  "Photo portal"
]);

includes("app/admin/submissions/photos/photo-portal.tsx", [
  "Publish photo to listing",
  "Photo permission",
  "Use as the main listing image"
]);

includes("app/submit/page.tsx", [
  "OPTIONAL PHOTO",
  "photoRightsConfirmed",
  "ListingPhotoUpload"
]);

includes("app/api/submissions/route.ts", [
  "multipart/form-data",
  "uploadSubmissionPhoto",
  "photo_storage_path"
]);

includes("app/admin/submissions/page.tsx", [
  "photo_preview_url",
  "SUBMITTED PHOTO",
  "createSubmissionPhotoPreview"
]);

includes("app/admin/submissions/actions.ts", [
  "promoteSubmissionPhoto",
  "attachApprovedSubmissionPhoto"
]);

includes("lib/media/listing-photo-server.ts", [
  "publishListingPhoto",
  "promoteSubmissionPhoto",
  "archiveListingPhoto",
  "submission-media",
  "listing-media"
]);

includes("lib/data/places.ts", [
  "image_url",
  "imageUrl"
]);

includes("lib/data/events.ts", [
  "image_url",
  "imageUrl"
]);

includes("lib/types.ts", [
  "imageUrl?: string | null"
]);

includes("supabase/migrations/20260724023000_create_listing_photo_portal.sql", [
  "create table if not exists public.listing_media",
  "'listing-media'",
  "'submission-media'",
  "photo_storage_path",
  "image_rights_notes"
]);

const submissionsApi = fs.readFileSync(
  path.join(root, "app/api/submissions/route.ts"),
  "utf8"
);

if (submissionsApi.includes("const title =\n  const title =")) {
  throw new Error("The public submission API contains a duplicate title declaration.");
}

console.log("VENTURE LISTING PHOTO PORTAL VERIFIED");
