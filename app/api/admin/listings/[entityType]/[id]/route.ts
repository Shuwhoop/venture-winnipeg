import {
  NextResponse
} from "next/server";

import {
  getVentureAdmin
} from "@/lib/auth/admin";
import {
  updateAdminListing
} from "@/lib/admin/listing-editor";
import type {
  AdminListingEntityType
} from "@/lib/admin/listing-editor-types";

export const dynamic =
  "force-dynamic";

const MAX_BODY_LENGTH =
  120_000;

type RouteContext = {
  params: Promise<{
    entityType: string;
    id: string;
  }>;
};

function isEntityType(
  value: string
): value is AdminListingEntityType {
  return (
    value === "place" ||
    value === "event"
  );
}

function isSameOrigin(
  request: Request
): boolean {
  const origin =
    request.headers.get("origin");

  if (!origin) {
    return true;
  }

  return origin ===
    new URL(request.url).origin;
}

export async function PATCH(
  request: Request,
  context: RouteContext
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

  if (!isSameOrigin(request)) {
    return NextResponse.json(
      {
        error:
          "The listing update came from an unexpected origin."
      },
      {
        status: 403
      }
    );
  }

  const {
    entityType,
    id
  } = await context.params;

  if (
    !isEntityType(entityType) ||
    !id
  ) {
    return NextResponse.json(
      {
        error:
          "The listing address is invalid."
      },
      {
        status: 400
      }
    );
  }

  const raw =
    await request.text();

  if (
    raw.length >
    MAX_BODY_LENGTH
  ) {
    return NextResponse.json(
      {
        error:
          "The listing update is too large."
      },
      {
        status: 413
      }
    );
  }

  let body: unknown;

  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      {
        error:
          "The listing update could not be read."
      },
      {
        status: 400
      }
    );
  }

  try {
    const result =
      await updateAdminListing({
        entityType,
        id,
        body,
        admin
      });

    return NextResponse.json(
      result,
      {
        headers: {
          "Cache-Control":
            "private, no-store"
        }
      }
    );
  } catch (error) {
    console.error(
      "Admin listing update failed",
      {
        entityType,
        id,
        message:
          error instanceof Error
            ? error.message
            : String(error)
      }
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Venture could not save the listing."
      },
      {
        status: 400
      }
    );
  }
}
