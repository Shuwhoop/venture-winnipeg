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
  publishListingPhoto
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
    !ENTITY_TYPES.has(
      entityType
    ) ||
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
          "Choose a listing and photo, describe the image, and record the permission basis."
      },
      {
        status: 400
      }
    );
  }

  try {
    const result =
      await publishListingPhoto({
        entityType:
          entityType as
            | "place"
            | "event",
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

    revalidatePath("/", "layout");
    revalidatePath("/explore");
    revalidatePath(
      `/listings/${result.slug}`
    );
    revalidatePath(
      "/admin/submissions/photos"
    );

    return NextResponse.json({
      ok: true,
      mediaId:
        result.mediaId,
      publicUrl:
        result.publicUrl,
      message:
        makePrimary
          ? "Photo published as the listing's main image."
          : "Photo added to Venture's listing media library."
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

    revalidatePath("/", "layout");
    revalidatePath("/explore");
    revalidatePath(
      "/admin/submissions/photos"
    );

    return NextResponse.json({
      ok: true,
      message:
        "Photo removed from the active listing gallery."
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
