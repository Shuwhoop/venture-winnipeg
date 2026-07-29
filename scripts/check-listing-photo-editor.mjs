import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "components/admin/listing-photo-editor.tsx",
  "components/admin/listing-photo-editor.module.css",
  "app/api/admin/listing-photos/route.ts",
  "lib/media/client-photo.ts",
  "lib/media/listing-photo-server.ts",
  "supabase/migrations/20260728023000_ensure_listing_photo_editor.sql",
  "app/admin/listings/[entityType]/[id]/listing-editor-form.tsx"
];

for (const relative of requiredFiles) {
  const absolute = path.join(root, relative);

  if (!fs.existsSync(absolute)) {
    throw new Error(`Missing listing photo editor file: ${relative}`);
  }
}

function requireTokens(relative, tokens) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");

  for (const token of tokens) {
    if (!source.includes(token)) {
      throw new Error(`${relative} is missing required token: ${token}`);
    }
  }
}

requireTokens(
  "app/admin/listings/[entityType]/[id]/listing-editor-form.tsx",
  [
    "ListingPhotoEditor",
    "entityType={record.entityType}",
    "entityId={record.id}",
    "listingName={"
  ]
);

requireTokens(
  "components/admin/listing-photo-editor.tsx",
  [
    "Photo studio",
    "Upload as main photo",
    "Photo permission",
    "Make main",
    "preparePhotoForUpload"
  ]
);

requireTokens(
  "app/api/admin/listing-photos/route.ts",
  [
    "export async function GET",
    "export async function POST",
    "export async function PATCH",
    "export async function DELETE",
    "getVentureAdmin",
    "sameOrigin"
  ]
);

requireTokens(
  "lib/media/listing-photo-server.ts",
  [
    "publishListingPhoto",
    "archiveListingPhoto",
    "getListingPhotoEditorState",
    "setPrimaryListingPhoto",
    ".from(\"listing-media\")",
    ".from(\"listing_media\")"
  ]
);

requireTokens(
  "supabase/migrations/20260728023000_ensure_listing_photo_editor.sql",
  [
    "create table if not exists public.listing_media",
    "'listing-media'",
    "image_alt_text",
    "image_rights_notes"
  ]
);

console.log("VENTURE LISTING PHOTO EDITOR VERIFIED");
