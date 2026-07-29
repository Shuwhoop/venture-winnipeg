import {
  revalidatePath
} from "next/cache";
import {
  NextResponse
} from "next/server";

import {
  getVentureAdmin
} from "@/lib/auth/admin";
import {
  archiveListingPhoto,
  getListingPhotoEditorState,
  publishListingPhoto,
  setPrimaryListingPhoto
} from "@/lib/media/listing-photo-server";

export const dynamic =
  "force-dynamic";

const ENTITY_TYPES =
  new Set([
    "place",
    "event"
  ]);

const RIGHTS_BASES =
  new Set([
    "venture_owned",
    "business_permission",
    "organizer_permission",
    "submitter_owned",
    "licensed",
    "public_domain"
  ]);

type EntityType =
  | "place"
  | "event";

function sameOrigin(
  request: Request
): boolean {
  const origin =
    request.headers.get("origin");

  return !origin ||
    origin ===
      new URL(request.url).origin;
}

function textField(
  formData: FormData,
  key: string,
  maximumLength: number
): string {
  const value =
    formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function validEntityType(
  value: string
): value is EntityType {
  return ENTITY_TYPES.has(value);
}

function revalidatePhotoPaths({
  slug,
  entityType,
  entityId
}: {
  slug?: string;
  entityType?: EntityType;
  entityId?: string;
}) {
  revalidatePath("/", "layout");
  revalidatePath("/explore");

  if (slug) {
    revalidatePath(
      `/listings/${slug}`
    );
  }

  if (
    entityType &&
    entityId
  ) {
    revalidatePath(
      `/admin/listings/${entityType}/${entityId}`
    );
  }
}

export async function GET(
  request: Request
) {
  const admin =
    await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator access is required."
      },
      {
        status: 401
      }
    );
  }

  const url =
    new URL(request.url);
  const entityType =
    url.searchParams
      .get("entityType")
      ?.trim() || "";
  const entityId =
    url.searchParams
      .get("entityId")
      ?.trim() || "";

  if (
    !validEntityType(entityType) ||
    !entityId
  ) {
    return NextResponse.json(
      {
        error:
          "The listing photo address is invalid."
      },
      {
        status: 400
      }
    );
  }

  try {
    const state =
      await getListingPhotoEditorState({
        entityType,
        entityId
      });

    return NextResponse.json(
      {
        ok: true,
        ...state
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Venture could not load the listing photos."
      },
      {
        status: 400
      }
    );
  }
}

export async function POST(
  request: Request
) {
  const admin =
    await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator access is required."
      },
      {
        status: 401
      }
    );
  }

  if (!sameOrigin(request)) {
    return NextResponse.json(
      {
        error:
          "The photo upload came from an unexpected origin."
      },
      {
        status: 403
      }
    );
  }

  let formData: FormData;

  try {
    formData =
      await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "The photo upload could not be read."
      },
      {
        status: 400
      }
    );
  }

  const entityType =
    textField(
      formData,
      "entityType",
      20
    );
  const entityId =
    textField(
      formData,
      "entityId",
      80
    );
  const altText =
    textField(
      formData,
      "altText",
      300
    );
  const caption =
    textField(
      formData,
      "caption",
      500
    );
  const rightsBasis =
    textField(
      formData,
      "rightsBasis",
      80
    );
  const rightsNotes =
    textField(
      formData,
      "rightsNotes",
      1000
    );
  const makePrimary =
    formData.get("makePrimary") !==
    "false";
  const photo =
    formData.get("photo");

  if (
    !validEntityType(entityType) ||
    !entityId ||
    !altText ||
    !RIGHTS_BASES.has(
      rightsBasis
    ) ||
    !(photo instanceof File) ||
    photo.size <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "Choose a photo, describe it, and record the permission basis."
      },
      {
        status: 400
      }
    );
  }

  try {
    const result =
      await publishListingPhoto({
        entityType,
        entityId,
        file: photo,
        altText,
        caption:
          caption || null,
        rightsBasis:
          rightsBasis as
            | "venture_owned"
            | "business_permission"
            | "organizer_permission"
            | "submitter_owned"
            | "licensed"
            | "public_domain",
        rightsNotes:
          rightsNotes || null,
        actorId:
          admin.id,
        makePrimary
      });

    revalidatePhotoPaths({
      slug: result.slug,
      entityType,
      entityId
    });

    return NextResponse.json({
      ok: true,
      mediaId:
        result.mediaId,
      publicUrl:
        result.publicUrl,
      message:
        makePrimary
          ? "Photo uploaded and set as the main listing image."
          : "Photo added to the listing gallery."
    });
  } catch (error) {
    console.error(
      "Listing photo upload failed",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Venture could not publish this photo."
      },
      {
        status: 400
      }
    );
  }
}

export async function PATCH(
  request: Request
) {
  const admin =
    await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator access is required."
      },
      {
        status: 401
      }
    );
  }

  if (!sameOrigin(request)) {
    return NextResponse.json(
      {
        error:
          "The photo update came from an unexpected origin."
      },
      {
        status: 403
      }
    );
  }

  let body: {
    mediaId?: unknown;
  };

  try {
    body =
      await request.json() as {
        mediaId?: unknown;
      };
  } catch {
    return NextResponse.json(
      {
        error:
          "The photo update could not be read."
      },
      {
        status: 400
      }
    );
  }

  const mediaId =
    typeof body.mediaId ===
      "string"
      ? body.mediaId.trim()
      : "";

  if (!mediaId) {
    return NextResponse.json(
      {
        error:
          "Choose a photo to make primary."
      },
      {
        status: 400
      }
    );
  }

  try {
    const result =
      await setPrimaryListingPhoto({
        mediaId,
        actorId:
          admin.id
      });

    revalidatePhotoPaths(result);

    return NextResponse.json({
      ok: true,
      message:
        "Main listing photo updated."
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Venture could not update the main photo."
      },
      {
        status: 400
      }
    );
  }
}

export async function DELETE(
  request: Request
) {
  const admin =
    await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator access is required."
      },
      {
        status: 401
      }
    );
  }

  if (!sameOrigin(request)) {
    return NextResponse.json(
      {
        error:
          "The photo update came from an unexpected origin."
      },
      {
        status: 403
      }
    );
  }

  let body: {
    mediaId?: unknown;
    entityType?: unknown;
    entityId?: unknown;
  };

  try {
    body =
      await request.json() as {
        mediaId?: unknown;
        entityType?: unknown;
        entityId?: unknown;
      };
  } catch {
    return NextResponse.json(
      {
        error:
          "The photo update could not be read."
      },
      {
        status: 400
      }
    );
  }

  const mediaId =
    typeof body.mediaId ===
      "string"
      ? body.mediaId.trim()
      : "";
  const entityType =
    typeof body.entityType ===
      "string" &&
    validEntityType(
      body.entityType
    )
      ? body.entityType
      : undefined;
  const entityId =
    typeof body.entityId ===
      "string"
      ? body.entityId.trim()
      : undefined;

  if (!mediaId) {
    return NextResponse.json(
      {
        error:
          "Choose a photo to remove."
      },
      {
        status: 400
      }
    );
  }

  try {
    await archiveListingPhoto({
      mediaId,
      actorId:
        admin.id
    });

    revalidatePhotoPaths({
      entityType,
      entityId
    });

    return NextResponse.json({
      ok: true,
      message:
        "Photo archived. Another active photo will become primary when available."
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Venture could not remove this photo."
      },
      {
        status: 400
      }
    );
  }
}
