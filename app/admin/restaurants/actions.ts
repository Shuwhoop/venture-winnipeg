"use server";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  revalidatePath
} from "next/cache";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";


const allowedPlaceTypes =
  new Set([
    "restaurant",
    "cafe",
    "bakery_dessert",
    "bar_pub",
    "brewery",
    "food_truck",
    "fast_casual",
    "fine_dining",
    "late_night_food",
    "market"
  ]);


function getRequiredText(
  formData: FormData,
  key: string,
  maximumLength: number
): string {
  const value =
    formData.get(key);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${key} is required.`
    );
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}


function getOptionalText(
  formData: FormData,
  key: string,
  maximumLength: number
): string | null {
  const value =
    formData.get(key);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}


function getPlaceId(
  formData: FormData
): string {
  return getRequiredText(
    formData,
    "id",
    80
  );
}


function getEditableValues(
  formData: FormData
) {
  const placeType =
    getRequiredText(
      formData,
      "place_type",
      60
    );

  if (
    !allowedPlaceTypes.has(
      placeType
    )
  ) {
    throw new Error(
      "The selected place type is invalid."
    );
  }

  const website =
    getOptionalText(
      formData,
      "official_website",
      500
    );

  if (website) {
    let parsedWebsite: URL;

    try {
      parsedWebsite =
        new URL(website);
    } catch {
      throw new Error(
        "The website must be a complete URL."
      );
    }

    if (
      ![
        "http:",
        "https:"
      ].includes(
        parsedWebsite.protocol
      )
    ) {
      throw new Error(
        "The website must use HTTP or HTTPS."
      );
    }
  }

  return {
    name:
      getRequiredText(
        formData,
        "name",
        200
      ),

    address_line1:
      getRequiredText(
        formData,
        "address_line1",
        250
      ),

    neighbourhood:
      getOptionalText(
        formData,
        "neighbourhood",
        120
      ),

    primary_category:
      getRequiredText(
        formData,
        "primary_category",
        120
      ),

    place_type:
      placeType,

    official_website:
      website,

    official_phone:
      getOptionalText(
        formData,
        "official_phone",
        80
      ),

    short_description:
      getRequiredText(
        formData,
        "short_description",
        500
      )
  };
}


async function updateImportedPlace(
  id: string,
  values: Record<
    string,
    unknown
  >
) {
  const supabase =
    getSupabaseAdminClient();

  const {
    data,
    error
  } =
    await supabase
      .from("places")
      .update(values)
      .eq(
        "id",
        id
      )
      .eq(
        "import_source",
        "overture_maps"
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not update the restaurant: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "The imported restaurant could not be found."
    );
  }
}


export async function saveRestaurantDraft(
  formData: FormData
) {
  await requireVentureAdmin();

  const id =
    getPlaceId(
      formData
    );

  await updateImportedPlace(
    id,
    {
      ...getEditableValues(
        formData
      ),

      review_status:
        "needs_review"
    }
  );

  revalidatePath(
    "/admin/restaurants"
  );
}


export async function publishRestaurant(
  formData: FormData
) {
  await requireVentureAdmin();

  const id =
    getPlaceId(
      formData
    );

  const now =
    new Date().toISOString();

  await updateImportedPlace(
    id,
    {
      ...getEditableValues(
        formData
      ),

      status:
        "published",

      review_status:
        "approved",

      /*
       * Publishing means the basic record
       * was reviewed. It does not claim
       * that hours, price, accessibility,
       * or dietary information are verified.
       */
      verification_status:
        "unverified",

      published_at:
        now,

      warning_message:
        "Basic identity and location reviewed by Venture. Hours, price, accessibility, dietary information, and current operating status may still require confirmation."
    }
  );

  revalidatePath(
    "/admin/restaurants"
  );

  revalidatePath(
    "/explore"
  );
}


export async function rejectRestaurant(
  formData: FormData
) {
  await requireVentureAdmin();

  const id =
    getPlaceId(
      formData
    );

  await updateImportedPlace(
    id,
    {
      status:
        "archived",

      review_status:
        "rejected",

      published_at:
        null
    }
  );

  revalidatePath(
    "/admin/restaurants"
  );

  revalidatePath(
    "/explore"
  );
}
