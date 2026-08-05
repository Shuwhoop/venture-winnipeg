import "server-only";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

export const LISTING_PHOTO_MAX_BYTES =
  3 * 1024 * 1024;

const allowedPhotoTypes =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
  ]);

type EntityType =
  | "place"
  | "event";

type RightsBasis =
  | "venture_owned"
  | "business_permission"
  | "organizer_permission"
  | "submitter_owned"
  | "licensed"
  | "public_domain";

function extensionForMime(
  mimeType: string
): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function safeSegment(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "listing";
}

function assertPhotoFile(
  file: File
): void {
  if (!allowedPhotoTypes.has(file.type)) {
    throw new Error(
      "Use a JPEG, PNG, or WebP image."
    );
  }

  if (
    file.size <= 0 ||
    file.size >
      LISTING_PHOTO_MAX_BYTES
  ) {
    throw new Error(
      "The photo must be smaller than 3 MB."
    );
  }
}

async function readPhotoBytes(
  file: File
): Promise<Uint8Array> {
  assertPhotoFile(file);

  const bytes = new Uint8Array(
    await file.arrayBuffer()
  );

  const validJpeg =
    file.type === "image/jpeg" &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  const validPng =
    file.type === "image/png" &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;

  const validWebp =
    file.type === "image/webp" &&
    String.fromCharCode(
      ...bytes.slice(0, 4)
    ) === "RIFF" &&
    String.fromCharCode(
      ...bytes.slice(8, 12)
    ) === "WEBP";

  if (
    !validJpeg &&
    !validPng &&
    !validWebp
  ) {
    throw new Error(
      "The selected file does not appear to be a valid image."
    );
  }

  return bytes;
}

export async function uploadSubmissionPhoto({
  submissionId,
  file
}: {
  submissionId: string;
  file: File;
}): Promise<{
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}> {
  const bytes =
    await readPhotoBytes(file);

  const extension =
    extensionForMime(file.type);

  const storagePath =
    `submissions/${submissionId}/${Date.now()}.${extension}`;

  const supabase =
    getSupabaseAdminClient();

  const { error } =
    await supabase.storage
      .from("submission-media")
      .upload(
        storagePath,
        bytes,
        {
          contentType:
            file.type,
          cacheControl:
            "3600",
          upsert:
            false
        }
      );

  if (error) {
    throw new Error(
      `Venture could not store the photo: ${error.message}`
    );
  }

  return {
    storagePath,
    originalName:
      file.name.slice(0, 250),
    mimeType:
      file.type,
    sizeBytes:
      file.size
  };
}

export async function createSubmissionPhotoPreview(
  storagePath: string
): Promise<string | null> {
  const supabase =
    getSupabaseAdminClient();

  const { data, error } =
    await supabase.storage
      .from("submission-media")
      .createSignedUrl(
        storagePath,
        60 * 20
      );

  if (error) {
    console.error(
      "Could not sign submission photo",
      error
    );
    return null;
  }

  return data.signedUrl;
}

async function listingIdentity(
  entityType: EntityType,
  entityId: string
): Promise<{
  slug: string;
  name: string;
}> {
  const supabase =
    getSupabaseAdminClient();

  if (entityType === "place") {
    const { data, error } =
      await supabase
        .from("places")
        .select("slug,name")
        .eq("id", entityId)
        .maybeSingle();

    if (error || !data) {
      throw new Error(
        "The restaurant could not be found."
      );
    }

    return data;
  }

  const { data, error } =
    await supabase
      .from("events")
      .select("slug,title")
      .eq("id", entityId)
      .maybeSingle();

  if (error || !data) {
    throw new Error(
      "The event could not be found."
    );
  }

  return {
    slug: data.slug,
    name: data.title
  };
}

function storedRightsSummary(
  rightsBasis: RightsBasis,
  rightsNotes: string | null
): string {
  return rightsNotes
    ? `${rightsBasis} · ${rightsNotes}`
    : rightsBasis;
}

export async function publishListingPhoto({
  entityType,
  entityId,
  file,
  altText,
  caption,
  rightsBasis,
  rightsNotes,
  actorId,
  sourceSubmissionId = null,
  makePrimary = true
}: {
  entityType: EntityType;
  entityId: string;
  file: File;
  altText: string;
  caption?: string | null;
  rightsBasis: RightsBasis;
  rightsNotes?: string | null;
  actorId: string;
  sourceSubmissionId?: string | null;
  makePrimary?: boolean;
}): Promise<{
  mediaId: string;
  publicUrl: string;
  slug: string;
}> {
  const identity =
    await listingIdentity(
      entityType,
      entityId
    );

  const cleanedAltText =
    altText.trim().slice(0, 300);

  if (!cleanedAltText) {
    throw new Error(
      "Describe what appears in the photo."
    );
  }

  const cleanedRightsNotes =
    rightsNotes?.trim().slice(0, 1000) ||
    null;

  if (
    rightsBasis !== "venture_owned" &&
    !cleanedRightsNotes
  ) {
    throw new Error(
      "Add a short permission or licence note for this photo."
    );
  }

  const bytes =
    await readPhotoBytes(file);

  const extension =
    extensionForMime(file.type);

  const storagePath =
    `${entityType}/${safeSegment(identity.slug)}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const supabase =
    getSupabaseAdminClient();

  const uploadResult =
    await supabase.storage
      .from("listing-media")
      .upload(
        storagePath,
        bytes,
        {
          contentType:
            file.type,
          cacheControl:
            "31536000",
          upsert:
            false
        }
      );

  if (uploadResult.error) {
    throw new Error(
      `Venture could not upload the photo: ${uploadResult.error.message}`
    );
  }

  const { data: urlData } =
    supabase.storage
      .from("listing-media")
      .getPublicUrl(
        storagePath
      );

  const publicUrl =
    urlData.publicUrl;

  let mediaId:
    string | null = null;

  let previousPrimary: {
    id: string;
    public_url: string;
    alt_text: string;
    rights_basis: RightsBasis;
    rights_notes: string | null;
  } | null = null;

  try {
    if (makePrimary) {
      const previousResult =
        await supabase
          .from("listing_media")
          .select(
            "id,public_url,alt_text,rights_basis,rights_notes"
          )
          .eq(
            "entity_type",
            entityType
          )
          .eq(
            "entity_id",
            entityId
          )
          .eq("status", "active")
          .eq("is_primary", true)
          .limit(1)
          .maybeSingle();

      if (previousResult.error) {
        throw new Error(
          previousResult.error.message
        );
      }

      previousPrimary =
        previousResult.data;
    }

    const mediaResult =
      await supabase
        .from("listing_media")
        .insert({
          entity_type:
            entityType,
          entity_id:
            entityId,
          storage_path:
            storagePath,
          public_url:
            publicUrl,
          alt_text:
            cleanedAltText,
          caption:
            caption?.trim().slice(0, 500) || null,
          rights_basis:
            rightsBasis,
          rights_notes:
            cleanedRightsNotes,
          source_submission_id:
            sourceSubmissionId,
          uploaded_by:
            actorId,
          is_primary:
            false,
          status:
            "active"
        })
        .select("id")
        .single();

    if (mediaResult.error) {
      throw new Error(
        mediaResult.error.message
      );
    }

    mediaId =
      mediaResult.data.id;

    if (!mediaId) {
      throw new Error(
        "Venture could not create the photo record."
      );
    }

    if (makePrimary) {
      const clearResult =
        await supabase
          .from("listing_media")
          .update({
            is_primary:
              false
          })
          .eq(
            "entity_type",
            entityType
          )
          .eq(
            "entity_id",
            entityId
          )
          .eq(
            "status",
            "active"
          );

      if (clearResult.error) {
        throw new Error(
          clearResult.error.message
        );
      }

      const primaryResult =
        await supabase
          .from("listing_media")
          .update({
            is_primary:
              true
          })
          .eq("id", mediaId);

      if (primaryResult.error) {
        throw new Error(
          primaryResult.error.message
        );
      }

      const table =
        entityType === "place"
          ? "places"
          : "events";

      const updateResult =
        await supabase
          .from(table)
          .update({
            image_url:
              publicUrl,
            image_alt_text:
              cleanedAltText,
            image_rights_notes:
              storedRightsSummary(
                rightsBasis,
                cleanedRightsNotes
              ),
            image_updated_at:
              new Date().toISOString()
          })
          .eq("id", entityId);

      if (updateResult.error) {
        throw new Error(
          updateResult.error.message
        );
      }
    }

    return {
      mediaId,
      publicUrl,
      slug: identity.slug
    };
  } catch (error) {
    if (mediaId) {
      await supabase
        .from("listing_media")
        .delete()
        .eq("id", mediaId);
    }

    if (
      makePrimary &&
      previousPrimary
    ) {
      await supabase
        .from("listing_media")
        .update({
          is_primary:
            true
        })
        .eq(
          "id",
          previousPrimary.id
        );

      const table =
        entityType === "place"
          ? "places"
          : "events";

      await supabase
        .from(table)
        .update({
          image_url:
            previousPrimary.public_url,
          image_alt_text:
            previousPrimary.alt_text,
          image_rights_notes:
            storedRightsSummary(
              previousPrimary.rights_basis,
              previousPrimary.rights_notes
            ),
          image_updated_at:
            new Date().toISOString()
        })
        .eq("id", entityId);
    }

    await supabase.storage
      .from("listing-media")
      .remove([
        storagePath
      ]);

    throw new Error(
      error instanceof Error
        ? `Venture could not connect the photo to the listing: ${error.message}`
        : "Venture could not connect the photo to the listing."
    );
  }
}

export async function promoteSubmissionPhoto({
  submissionId,
  entityType,
  entityId,
  actorId
}: {
  submissionId: string;
  entityType: EntityType;
  entityId: string;
  actorId: string;
}): Promise<boolean> {
  const supabase =
    getSupabaseAdminClient();

  const { data, error } =
    await supabase
      .from("listing_submissions")
      .select(
        "photo_storage_path,photo_original_name,photo_mime_type,photo_alt_text,photo_rights_confirmed,photo_rights_note"
      )
      .eq("id", submissionId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load the submitted photo: ${error.message}`
    );
  }

  if (
    !data?.photo_storage_path ||
    !data.photo_rights_confirmed
  ) {
    return false;
  }

  const existingResult =
    await supabase
      .from("listing_media")
      .select("id")
      .eq(
        "source_submission_id",
        submissionId
      )
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

  if (existingResult.error) {
    throw new Error(
      `Could not check the submitted photo: ${existingResult.error.message}`
    );
  }

  if (existingResult.data) {
    return true;
  }

  const downloadResult =
    await supabase.storage
      .from("submission-media")
      .download(
        data.photo_storage_path
      );

  if (downloadResult.error) {
    throw new Error(
      `Could not retrieve the submitted photo: ${downloadResult.error.message}`
    );
  }

  const file = new File(
    [downloadResult.data],
    data.photo_original_name ||
      "submitted-photo.jpg",
    {
      type:
        data.photo_mime_type ||
        downloadResult.data.type ||
        "image/jpeg"
    }
  );

  await publishListingPhoto({
    entityType,
    entityId,
    file,
    altText:
      data.photo_alt_text ||
      "Submitted photo",
    rightsBasis:
      "submitter_owned",
    rightsNotes:
      data.photo_rights_note ||
      "The outside submitter confirmed that they own this photo or have permission to provide it to Venture.",
    actorId,
    sourceSubmissionId:
      submissionId,
    makePrimary:
      true
  });

  return true;
}

export async function archiveListingPhoto({
  mediaId,
  actorId
}: {
  mediaId: string;
  actorId: string;
}): Promise<void> {
  const supabase =
    getSupabaseAdminClient();

  const { data, error } =
    await supabase
      .from("listing_media")
      .select(
        "id,entity_type,entity_id,storage_path,is_primary"
      )
      .eq("id", mediaId)
      .maybeSingle();

  if (error || !data) {
    throw new Error(
      "The photo could not be found."
    );
  }

  void actorId;

  const archiveResult =
    await supabase
      .from("listing_media")
      .update({
        status:
          "archived",
        is_primary:
          false
      })
      .eq("id", mediaId);

  if (archiveResult.error) {
    throw new Error(
      `The photo could not be archived: ${archiveResult.error.message}`
    );
  }

  if (data.is_primary) {
    const nextResult =
      await supabase
        .from("listing_media")
        .select(
          "id,public_url,alt_text,rights_basis,rights_notes"
        )
        .eq(
          "entity_type",
          data.entity_type
        )
        .eq(
          "entity_id",
          data.entity_id
        )
        .eq("status", "active")
        .order("created_at", {
          ascending:
            false
        })
        .limit(1)
        .maybeSingle();

    if (nextResult.data) {
      await supabase
        .from("listing_media")
        .update({
          is_primary:
            true
        })
        .eq(
          "id",
          nextResult.data.id
        );
    }

    const table =
      data.entity_type === "place"
        ? "places"
        : "events";

    await supabase
      .from(table)
      .update({
        image_url:
          nextResult.data?.public_url || null,
        image_alt_text:
          nextResult.data?.alt_text || null,
        image_rights_notes:
          nextResult.data
            ? storedRightsSummary(
                nextResult.data.rights_basis as RightsBasis,
                nextResult.data.rights_notes
              )
            : null,
        image_updated_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        data.entity_id
      );
  }
}

export type ListingPhotoEditorMedia = {
  id: string;
  publicUrl: string;
  altText: string;
  caption: string | null;
  rightsBasis: RightsBasis;
  rightsNotes: string | null;
  isPrimary: boolean;
  createdAt: string;
};

export type ListingPhotoEditorState = {
  listing: {
    id: string;
    entityType: EntityType;
    slug: string;
    name: string;
    currentImageUrl: string | null;
    currentAltText: string | null;
    currentRightsNotes: string | null;
    imageUpdatedAt: string | null;
  };
  media: ListingPhotoEditorMedia[];
};

export async function getListingPhotoEditorState({
  entityType,
  entityId
}: {
  entityType: EntityType;
  entityId: string;
}): Promise<ListingPhotoEditorState> {
  const supabase =
    getSupabaseAdminClient();

  const table =
    entityType === "place"
      ? "places"
      : "events";

  const identityColumns =
    entityType === "place"
      ? "id,slug,name,image_url,image_alt_text,image_rights_notes,image_updated_at"
      : "id,slug,title,image_url,image_alt_text,image_rights_notes,image_updated_at";

  const listingResult =
    await supabase
      .from(table)
      .select(identityColumns)
      .eq("id", entityId)
      .maybeSingle();

  if (
    listingResult.error ||
    !listingResult.data
  ) {
    throw new Error(
      listingResult.error?.message ||
      "The listing could not be found."
    );
  }

  const listingData =
    listingResult.data as Record<
      string,
      unknown
    >;

  const mediaResult =
    await supabase
      .from("listing_media")
      .select(
        "id,public_url,alt_text,caption,rights_basis,rights_notes,is_primary,created_at"
      )
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("status", "active")
      .order("is_primary", {
        ascending: false
      })
      .order("created_at", {
        ascending: false
      });

  if (mediaResult.error) {
    throw new Error(
      `Venture could not load the listing photos: ${mediaResult.error.message}`
    );
  }

  const name =
    entityType === "place"
      ? String(
          listingData.name ||
          "Untitled place"
        )
      : String(
          listingData.title ||
          "Untitled event"
        );

  return {
    listing: {
      id: String(listingData.id),
      entityType,
      slug: String(listingData.slug),
      name,
      currentImageUrl:
        typeof listingData.image_url ===
          "string"
          ? listingData.image_url
          : null,
      currentAltText:
        typeof listingData.image_alt_text ===
          "string"
          ? listingData.image_alt_text
          : null,
      currentRightsNotes:
        typeof listingData.image_rights_notes ===
          "string"
          ? listingData.image_rights_notes
          : null,
      imageUpdatedAt:
        typeof listingData.image_updated_at ===
          "string"
          ? listingData.image_updated_at
          : null
    },
    media: (mediaResult.data || []).map(
      (row) => ({
        id: row.id,
        publicUrl: row.public_url,
        altText: row.alt_text,
        caption: row.caption,
        rightsBasis:
          row.rights_basis as RightsBasis,
        rightsNotes: row.rights_notes,
        isPrimary: row.is_primary,
        createdAt: row.created_at
      })
    )
  };
}

export async function setPrimaryListingPhoto({
  mediaId,
  actorId
}: {
  mediaId: string;
  actorId: string;
}): Promise<{
  slug: string;
  entityType: EntityType;
  entityId: string;
}> {
  void actorId;

  const supabase =
    getSupabaseAdminClient();

  const mediaResult =
    await supabase
      .from("listing_media")
      .select(
        "id,entity_type,entity_id,public_url,alt_text,rights_basis,rights_notes,status"
      )
      .eq("id", mediaId)
      .maybeSingle();

  if (
    mediaResult.error ||
    !mediaResult.data ||
    mediaResult.data.status !==
      "active"
  ) {
    throw new Error(
      "The active photo could not be found."
    );
  }

  const entityType =
    mediaResult.data.entity_type as
      EntityType;
  const entityId =
    mediaResult.data.entity_id;

  const previousResult =
    await supabase
      .from("listing_media")
      .select("id")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("status", "active")
      .eq("is_primary", true)
      .limit(1)
      .maybeSingle();

  if (previousResult.error) {
    throw new Error(
      previousResult.error.message
    );
  }

  const clearResult =
    await supabase
      .from("listing_media")
      .update({
        is_primary: false
      })
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("status", "active");

  if (clearResult.error) {
    throw new Error(
      clearResult.error.message
    );
  }

  const primaryResult =
    await supabase
      .from("listing_media")
      .update({
        is_primary: true
      })
      .eq("id", mediaId);

  if (primaryResult.error) {
    if (previousResult.data?.id) {
      await supabase
        .from("listing_media")
        .update({
          is_primary: true
        })
        .eq(
          "id",
          previousResult.data.id
        );
    }

    throw new Error(
      primaryResult.error.message
    );
  }

  const table =
    entityType === "place"
      ? "places"
      : "events";

  const listingUpdate =
    await supabase
      .from(table)
      .update({
        image_url:
          mediaResult.data.public_url,
        image_alt_text:
          mediaResult.data.alt_text,
        image_rights_notes:
          storedRightsSummary(
            mediaResult.data.rights_basis as RightsBasis,
            mediaResult.data.rights_notes
          ),
        image_updated_at:
          new Date().toISOString()
      })
      .eq("id", entityId);

  if (listingUpdate.error) {
    await supabase
      .from("listing_media")
      .update({
        is_primary: false
      })
      .eq("id", mediaId);

    if (previousResult.data?.id) {
      await supabase
        .from("listing_media")
        .update({
          is_primary: true
        })
        .eq(
          "id",
          previousResult.data.id
        );
    }

    throw new Error(
      listingUpdate.error.message
    );
  }

  const identity =
    await listingIdentity(
      entityType,
      entityId
    );

  return {
    slug: identity.slug,
    entityType,
    entityId
  };
}
