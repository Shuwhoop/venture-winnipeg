import {
  readFile
} from "node:fs/promises";

import {
  fileURLToPath
} from "node:url";

import {
  dirname,
  join
} from "node:path";

import {
  createClient
} from "@supabase/supabase-js";

const currentFile =
  fileURLToPath(
    import.meta.url
  );

const currentDirectory =
  dirname(currentFile);

const projectDirectory =
  join(
    currentDirectory,
    ".."
  );

const dataFile =
  join(
    projectDirectory,
    "data",
    "winnipeg-restaurants.json"
  );

const dryRun =
  process.argv.includes(
    "--dry-run"
  );

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
    "market",
    "event_venue",
    "activity",
    "attraction"
  ]);

const allowedSourceTypes =
  new Set([
    "official_website",
    "official_social",
    "organizer_submission",
    "business_submission",
    "licensed_api",
    "open_data",
    "community_submission",
    "manual_research"
  ]);

const allowedRightsBases =
  new Set([
    "direct_permission",
    "contract",
    "api_terms",
    "open_licence",
    "public_domain",
    "link_only",
    "unknown"
  ]);

function requireString(
  value,
  label
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${label} must be a non-empty string.`
    );
  }

  return value.trim();
}

function optionalString(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return requireString(
    value,
    "Optional string"
  );
}

function requireStringArray(
  value,
  label
) {
  if (
    !Array.isArray(value) ||
    !value.every(
      (item) =>
        typeof item === "string"
    )
  ) {
    throw new Error(
      `${label} must be an array of strings.`
    );
  }

  return value.map(
    (item) =>
      item.trim()
  ).filter(Boolean);
}

function requireBooleanOrNull(
  value,
  label
) {
  if (
    value !== true &&
    value !== false &&
    value !== null
  ) {
    throw new Error(
      `${label} must be true, false, or null.`
    );
  }

  return value;
}

function requireCoordinate(
  value,
  label,
  minimum,
  maximum
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(
      `${label} is not a valid coordinate.`
    );
  }

  return value;
}

function requireObject(
  value,
  label
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${label} must be an object.`
    );
  }

  return value;
}

function validateSource(
  source,
  restaurantName
) {
  requireObject(
    source,
    `${restaurantName} source`
  );

  const sourceType =
    requireString(
      source.sourceType,
      `${restaurantName} source type`
    );

  const rightsBasis =
    requireString(
      source.rightsBasis,
      `${restaurantName} rights basis`
    );

  if (
    !allowedSourceTypes.has(
      sourceType
    )
  ) {
    throw new Error(
      `${restaurantName} has unsupported source type: ${sourceType}`
    );
  }

  if (
    !allowedRightsBases.has(
      rightsBasis
    )
  ) {
    throw new Error(
      `${restaurantName} has unsupported rights basis: ${rightsBasis}`
    );
  }

  requireString(
    source.name,
    `${restaurantName} source name`
  );

  requireString(
    source.baseUrl,
    `${restaurantName} source base URL`
  );

  requireString(
    source.sourceUrl,
    `${restaurantName} source URL`
  );

  requireObject(
    source.fieldCoverage,
    `${restaurantName} source field coverage`
  );

  if (
    typeof source.isPrimary !==
    "boolean"
  ) {
    throw new Error(
      `${restaurantName} source isPrimary must be a boolean.`
    );
  }
}

function validateRestaurant(
  restaurant
) {
  requireObject(
    restaurant,
    "Restaurant"
  );

  const name =
    requireString(
      restaurant.name,
      "Restaurant name"
    );

  const slug =
    requireString(
      restaurant.slug,
      `${name} slug`
    );

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug
    )
  ) {
    throw new Error(
      `${name} has an invalid slug: ${slug}`
    );
  }

  const placeType =
    requireString(
      restaurant.placeType,
      `${name} place type`
    );

  if (
    !allowedPlaceTypes.has(
      placeType
    )
  ) {
    throw new Error(
      `${name} has an unsupported place type: ${placeType}`
    );
  }

  requireString(
    restaurant.shortDescription,
    `${name} short description`
  );

  requireString(
    restaurant.primaryCategory,
    `${name} primary category`
  );

  requireString(
    restaurant.addressLine1,
    `${name} address`
  );

  requireString(
    restaurant.city,
    `${name} city`
  );

  requireString(
    restaurant.province,
    `${name} province`
  );

  requireString(
    restaurant.neighbourhood,
    `${name} neighbourhood`
  );

  requireCoordinate(
    restaurant.latitude,
    `${name} latitude`,
    -90,
    90
  );

  requireCoordinate(
    restaurant.longitude,
    `${name} longitude`,
    -180,
    180
  );

  if (
    restaurant.priceLevel !== null &&
    (
      !Number.isInteger(
        restaurant.priceLevel
      ) ||
      restaurant.priceLevel < 1 ||
      restaurant.priceLevel > 4
    )
  ) {
    throw new Error(
      `${name} price level must be between 1 and 4.`
    );
  }

  requireStringArray(
    restaurant.secondaryCategories,
    `${name} secondary categories`
  );

  requireStringArray(
    restaurant.tags,
    `${name} tags`
  );

  requireStringArray(
    restaurant.cuisineSecondary,
    `${name} secondary cuisines`
  );

  requireStringArray(
    restaurant.dietaryOptions,
    `${name} dietary options`
  );

  requireStringArray(
    restaurant.atmosphereTags,
    `${name} atmosphere tags`
  );

  requireStringArray(
    restaurant.goodFor,
    `${name} good-for values`
  );

  requireObject(
    restaurant.weeklyHours,
    `${name} weekly hours`
  );

  requireBooleanOrNull(
    restaurant.takeoutAvailable,
    `${name} takeout availability`
  );

  requireBooleanOrNull(
    restaurant.deliveryAvailable,
    `${name} delivery availability`
  );

  if (
    !Array.isArray(
      restaurant.sources
    ) ||
    restaurant.sources.length === 0
  ) {
    throw new Error(
      `${name} must have at least one source.`
    );
  }

  restaurant.sources.forEach(
    (source) =>
      validateSource(
        source,
        name
      )
  );

  if (
    !restaurant.sources.some(
      (source) =>
        source.isPrimary === true
    )
  ) {
    throw new Error(
      `${name} must have one primary source.`
    );
  }
}

function addDays(
  dateValue,
  days
) {
  const date =
    new Date(dateValue);

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return date.toISOString();
}

async function readDataset() {
  const text =
    await readFile(
      dataFile,
      "utf8"
    );

  const dataset =
    JSON.parse(text);

  requireObject(
    dataset,
    "Restaurant dataset"
  );

  const checkedAt =
    requireString(
      dataset.checkedAt,
      "Dataset checkedAt"
    );

  if (
    Number.isNaN(
      Date.parse(checkedAt)
    )
  ) {
    throw new Error(
      "Dataset checkedAt is not a valid ISO date."
    );
  }

  if (
    !Array.isArray(
      dataset.restaurants
    ) ||
    dataset.restaurants.length ===
      0
  ) {
    throw new Error(
      "Restaurant dataset contains no restaurants."
    );
  }

  dataset.restaurants.forEach(
    validateRestaurant
  );

  const slugs =
    dataset.restaurants.map(
      (restaurant) =>
        restaurant.slug
    );

  if (
    new Set(slugs).size !==
    slugs.length
  ) {
    throw new Error(
      "Restaurant dataset contains duplicate slugs."
    );
  }

  return dataset;
}

function createAdminClient() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL
      ?.trim();

  const secretKey =
    process.env
      .SUPABASE_SECRET_KEY
      ?.trim();

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing."
    );
  }

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is missing."
    );
  }

  if (
    !secretKey.startsWith(
      "sb_secret_"
    )
  ) {
    throw new Error(
      "SUPABASE_SECRET_KEY does not contain a valid Supabase secret key."
    );
  }

  return createClient(
    supabaseUrl,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
}

async function ensureSource(
  supabase,
  source,
  checkedAt
) {
  const {
    data: existingSources,
    error: findError
  } =
    await supabase
      .from("sources")
      .select("id")
      .eq(
        "name",
        source.name
      )
      .eq(
        "base_url",
        source.baseUrl
      )
      .limit(1);

  if (findError) {
    throw new Error(
      `Could not find source "${source.name}": ${findError.message}`
    );
  }

  const sourceValues = {
    name:
      source.name,

    source_type:
      source.sourceType,

    base_url:
      source.baseUrl,

    rights_basis:
      source.rightsBasis,

    terms_url:
      optionalString(
        source.termsUrl
      ),

    attribution_text:
      optionalString(
        source.attributionText
      ),

    caching_limit:
      "Store factual listing fields only.",

    retention_notes:
      "Recheck time-sensitive restaurant information regularly.",

    deletion_obligations:
      "Remove or update information when the source changes or requests correction.",

    active:
      true,

    reviewed_at:
      checkedAt
  };

  const existingId =
    existingSources?.[0]?.id;

  if (existingId) {
    const {
      data,
      error
    } =
      await supabase
        .from("sources")
        .update(
          sourceValues
        )
        .eq(
          "id",
          existingId
        )
        .select("id")
        .single();

    if (error) {
      throw new Error(
        `Could not update source "${source.name}": ${error.message}`
      );
    }

    return data.id;
  }

  const {
    data,
    error
  } =
    await supabase
      .from("sources")
      .insert(
        sourceValues
      )
      .select("id")
      .single();

  if (error) {
    throw new Error(
      `Could not create source "${source.name}": ${error.message}`
    );
  }

  return data.id;
}

async function replaceListingSource(
  supabase,
  {
    placeId,
    sourceId,
    source,
    checkedAt
  }
) {
  const {
    data: existingMappings,
    error: findError
  } =
    await supabase
      .from("listing_sources")
      .select("id")
      .eq(
        "entity_type",
        "place"
      )
      .eq(
        "entity_id",
        placeId
      )
      .eq(
        "source_id",
        sourceId
      )
      .eq(
        "source_url",
        source.sourceUrl
      );

  if (findError) {
    throw new Error(
      `Could not inspect listing source "${source.name}": ${findError.message}`
    );
  }

  const existingIds =
    (
      existingMappings ??
      []
    ).map(
      (mapping) =>
        mapping.id
    );

  if (
    existingIds.length > 0
  ) {
    const {
      error: deleteError
    } =
      await supabase
        .from("listing_sources")
        .delete()
        .in(
          "id",
          existingIds
        );

    if (deleteError) {
      throw new Error(
        `Could not refresh listing source "${source.name}": ${deleteError.message}`
      );
    }
  }

  const {
    error: insertError
  } =
    await supabase
      .from("listing_sources")
      .insert({
        entity_type:
          "place",

        entity_id:
          placeId,

        source_id:
          sourceId,

        source_url:
          source.sourceUrl,

        is_primary:
          source.isPrimary,

        field_coverage:
          source.fieldCoverage,

        extracted_at:
          checkedAt,

        last_checked_at:
          checkedAt,

        legal_notes:
          optionalString(
            source.legalNotes
          )
      });

  if (insertError) {
    throw new Error(
      `Could not attach listing source "${source.name}": ${insertError.message}`
    );
  }
}

function createPlaceValues(
  restaurant,
  checkedAt
) {
  return {
    slug:
      restaurant.slug,

    place_type:
      restaurant.placeType,

    name:
      restaurant.name,

    short_description:
      restaurant.shortDescription,

    full_description:
      optionalString(
        restaurant.fullDescription
      ),

    primary_category:
      restaurant.primaryCategory,

    secondary_categories:
      restaurant.secondaryCategories,

    tags:
      restaurant.tags,

    address_line1:
      restaurant.addressLine1,

    address_line2:
      optionalString(
        restaurant.addressLine2
      ),

    city:
      restaurant.city,

    province:
      restaurant.province,

    postal_code:
      optionalString(
        restaurant.postalCode
      ),

    neighbourhood:
      restaurant.neighbourhood,

    location:
      `SRID=4326;POINT(${restaurant.longitude} ${restaurant.latitude})`,

    official_phone:
      optionalString(
        restaurant.officialPhone
      ),

    official_email:
      optionalString(
        restaurant.officialEmail
      ),

    official_website:
      optionalString(
        restaurant.officialWebsite
      ),

    price_level:
      restaurant.priceLevel,

    cuisine_primary:
      optionalString(
        restaurant.cuisinePrimary
      ),

    cuisine_secondary:
      restaurant.cuisineSecondary,

    weekly_hours:
      restaurant.weeklyHours,

    special_hours:
      [],

    open_status:
      "open",

    menu_url:
      optionalString(
        restaurant.menuUrl
      ),

    reservation_url:
      optionalString(
        restaurant.reservationUrl
      ),

    takeout_available:
      restaurant.takeoutAvailable,

    delivery_available:
      restaurant.deliveryAvailable,

    dietary_options:
      restaurant.dietaryOptions,

    atmosphere_tags:
      restaurant.atmosphereTags,

    good_for:
      restaurant.goodFor,

    accessibility_notes:
      optionalString(
        restaurant.accessibilityNotes
      ),

    parking_notes:
      optionalString(
        restaurant.parkingNotes
      ),

    transit_notes:
      optionalString(
        restaurant.transitNotes
      ),

    status:
      "published",

    verification_status:
      "official_source",

    warning_message:
      optionalString(
        restaurant.warningMessage
      ),

    source_checked_at:
      checkedAt,

    last_verified_at:
      checkedAt,

    freshness_expires_at:
      addDays(
        checkedAt,
        30
      ),

    published_at:
      checkedAt
  };
}

async function importRestaurant(
  supabase,
  restaurant,
  checkedAt
) {
  console.log(
    `Importing ${restaurant.name}...`
  );

  const placeValues =
    createPlaceValues(
      restaurant,
      checkedAt
    );

  const {
    data: place,
    error: placeError
  } =
    await supabase
      .from("places")
      .upsert(
        placeValues,
        {
          onConflict:
            "slug"
        }
      )
      .select(
        "id, slug, name"
      )
      .single();

  if (placeError) {
    throw new Error(
      `Could not import ${restaurant.name}: ${placeError.message}`
    );
  }

  for (
    const source
    of restaurant.sources
  ) {
    const sourceId =
      await ensureSource(
        supabase,
        source,
        checkedAt
      );

    await replaceListingSource(
      supabase,
      {
        placeId:
          place.id,

        sourceId,

        source,

        checkedAt
      }
    );
  }

  console.log(
    `Imported ${place.name} (${place.slug})`
  );
}

async function main() {
  const dataset =
    await readDataset();

  console.log(
    `Validated ${dataset.restaurants.length} restaurant records.`
  );

  if (dryRun) {
    for (
      const restaurant
      of dataset.restaurants
    ) {
      console.log(
        `DRY RUN: ${restaurant.name} (${restaurant.slug})`
      );
    }

    console.log(
      "Dry run complete. No database changes were made."
    );

    return;
  }

  const supabase =
    createAdminClient();

  for (
    const restaurant
    of dataset.restaurants
  ) {
    await importRestaurant(
      supabase,
      restaurant,
      dataset.checkedAt
    );
  }

  console.log(
    `Finished importing ${dataset.restaurants.length} restaurants.`
  );
}

main().catch(
  (error) => {
    console.error(
      "\nRestaurant import failed:"
    );

    console.error(
      error instanceof Error
        ? error.message
        : error
    );

    process.exitCode = 1;
  }
);