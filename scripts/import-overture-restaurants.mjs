import {
  readFile
} from "node:fs/promises";

import {
  createClient
} from "@supabase/supabase-js";


const DATA_FILE =
  "data/overture-winnipeg-food-candidates.json";

const DEFAULT_LIMIT = 25;

const dryRun =
  process.argv.includes(
    "--dry-run"
  );

const writeChanges =
  process.argv.includes(
    "--write"
  );

const limitArgument =
  process.argv.find(
    (argument) =>
      argument.startsWith(
        "--limit="
      )
  );

const parsedLimit =
  limitArgument
    ? Number(
        limitArgument.split("=")[1]
      )
    : DEFAULT_LIMIT;

const limit =
  Number.isInteger(parsedLimit) &&
  parsedLimit > 0
    ? parsedLimit
    : DEFAULT_LIMIT;


function normalizeText(
  value
) {
  return String(
    value ?? ""
  )
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /&/g,
      " and "
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}


function slugify(
  value
) {
  const slug =
    normalizeText(value)
      .replace(
        /\s+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(
        0,
        80
      );

  return slug || "winnipeg-place";
}


function humanizeCategory(
  value
) {
  if (
    typeof value !== "string" ||
    !value
  ) {
    return "Food and drink";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase()
        + word.slice(1)
    )
    .join(" ");
}


function mapPlaceType(
  primaryCategory
) {
  const category =
    String(
      primaryCategory ?? ""
    );

  if (
    [
      "cafe",
      "coffee_shop",
      "tea_room",
      "bubble_tea_shop",
      "juice_bar",
      "smoothie_shop"
    ].includes(category)
  ) {
    return "cafe";
  }

  if (
    [
      "bakery",
      "dessert_shop",
      "donut_shop",
      "ice_cream_shop"
    ].includes(category)
  ) {
    return "bakery_dessert";
  }

  if (
    [
      "bar",
      "pub",
      "gastropub",
      "beer_garden",
      "cocktail_bar",
      "sports_bar",
      "wine_bar",
      "beer_bar",
      "dive_bar",
      "hookah_bar"
    ].includes(category)
  ) {
    return "bar_pub";
  }

  if (
    [
      "brewery",
      "winery",
      "distillery"
    ].includes(category)
  ) {
    return "brewery";
  }

  if (
    [
      "food_truck",
      "food_stand"
    ].includes(category)
  ) {
    return "food_truck";
  }

  if (
    [
      "fast_food_restaurant",
      "pizza_restaurant",
      "burger_restaurant",
      "sandwich_shop",
      "food_court"
    ].includes(category)
  ) {
    return "fast_casual";
  }

  return "restaurant";
}


function getCuisinePrimary(
  primaryCategory
) {
  if (
    typeof primaryCategory !==
      "string"
  ) {
    return null;
  }

  if (
    primaryCategory.endsWith(
      "_restaurant"
    ) &&
    ![
      "restaurant",
      "fast_food_restaurant",
      "breakfast_and_brunch_restaurant",
      "bar_and_grill_restaurant"
    ].includes(primaryCategory)
  ) {
    return humanizeCategory(
      primaryCategory.replace(
        /_restaurant$/,
        ""
      )
    );
  }

  return null;
}


function getProvince(
  region
) {
  const normalized =
    normalizeText(region);

  if (
    normalized === "mb" ||
    normalized === "manitoba"
  ) {
    return "Manitoba";
  }

  return (
    typeof region === "string" &&
    region.trim()
      ? region.trim()
      : "Manitoba"
  );
}


function addDays(
  isoDate,
  days
) {
  const date =
    new Date(isoDate);

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return date.toISOString();
}


function distanceMetres(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const radius =
    6_371_000;

  const toRadians =
    (value) =>
      value * Math.PI / 180;

  const deltaLatitude =
    toRadians(
      latitude2 - latitude1
    );

  const deltaLongitude =
    toRadians(
      longitude2 - longitude1
    );

  const firstLatitude =
    toRadians(latitude1);

  const secondLatitude =
    toRadians(latitude2);

  const a =
    Math.sin(
      deltaLatitude / 2
    ) ** 2
    +
    Math.cos(firstLatitude)
    * Math.cos(secondLatitude)
    * Math.sin(
      deltaLongitude / 2
    ) ** 2;

  return radius
    * 2
    * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );
}


function getMeaningfulNameTokens(
  value
) {
  const ignoredTokens =
    new Set([
      "the",
      "and",
      "restaurant",
      "restaurants",
      "cafe",
      "coffee",
      "bakery",
      "french",
      "bar",
      "grill",
      "pub",
      "lounge",
      "winnipeg",
      "location"
    ]);

  return new Set(
    normalizeText(value)
      .split(" ")
      .filter(
        (token) =>
          token &&
          !ignoredTokens.has(token)
      )
  );
}


function namesLookSimilar(
  firstName,
  secondName
) {
  const first =
    normalizeText(firstName);

  const second =
    normalizeText(secondName);

  if (!first || !second) {
    return false;
  }

  if (
    first === second ||
    first.includes(second) ||
    second.includes(first)
  ) {
    return true;
  }

  const firstTokens =
    getMeaningfulNameTokens(
      firstName
    );

  const secondTokens =
    getMeaningfulNameTokens(
      secondName
    );

  if (
    firstTokens.size === 0 ||
    secondTokens.size === 0
  ) {
    return false;
  }

  let sharedTokenCount =
    0;

  for (
    const token
    of firstTokens
  ) {
    if (
      secondTokens.has(token)
    ) {
      sharedTokenCount += 1;
    }
  }

  const smallerTokenCount =
    Math.min(
      firstTokens.size,
      secondTokens.size
    );

  return (
    sharedTokenCount /
      smallerTokenCount
    >= 0.75
  );
}


function findBatchDuplicate(
  candidate,
  earlierCandidates
) {
  const candidateAddress =
    normalizeText(
      candidate.addressLine1
    );

  for (
    const earlierCandidate
    of earlierCandidates
  ) {
    const earlierAddress =
      normalizeText(
        earlierCandidate
          .addressLine1
      );

    const sameAddress =
      Boolean(
        candidateAddress &&
        earlierAddress &&
        candidateAddress ===
          earlierAddress
      );

    const nearby =
      distanceMetres(
        candidate.latitude,
        candidate.longitude,
        earlierCandidate.latitude,
        earlierCandidate.longitude
      ) <= 35;

    if (
      (sameAddress || nearby) &&
      namesLookSimilar(
        candidate.name,
        earlierCandidate.name
      )
    ) {
      return {
        candidate:
          earlierCandidate,

        reason:
          sameAddress
            ? "same address and very similar name"
            : "within 35 m and very similar name"
      };
    }
  }

  return null;
}


function isRecord(
  value
) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}


function validateCandidate(
  candidate
) {
  if (!isRecord(candidate)) {
    return false;
  }

  return (
    typeof candidate.overtureId ===
      "string" &&
    candidate.overtureId.length > 0 &&
    typeof candidate.name ===
      "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.primaryCategory ===
      "string" &&
    typeof candidate.addressLine1 ===
      "string" &&
    candidate.addressLine1.trim().length > 0 &&
    typeof candidate.latitude ===
      "number" &&
    Number.isFinite(
      candidate.latitude
    ) &&
    typeof candidate.longitude ===
      "number" &&
    Number.isFinite(
      candidate.longitude
    )
  );
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
      "SUPABASE_SECRET_KEY is not a valid Supabase secret key."
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


async function readCandidates() {
  const rawText =
    await readFile(
      DATA_FILE,
      "utf8"
    );

  const dataset =
    JSON.parse(rawText);

  if (
    !isRecord(dataset) ||
    !Array.isArray(
      dataset.candidates
    )
  ) {
    throw new Error(
      "The Overture candidate file is invalid."
    );
  }

  const validCandidates =
    dataset.candidates.filter(
      validateCandidate
    );

  if (
    validCandidates.length === 0
  ) {
    throw new Error(
      "The Overture candidate file contains no valid records."
    );
  }

  return validCandidates;
}


async function readAllExistingPlaces(
  supabase
) {
  const pageSize =
    1_000;

  const places = [];

  for (
    let offset = 0;
    ;
    offset += pageSize
  ) {
    const {
      data,
      error
    } =
      await supabase
        .from("places")
        .select(
          `
            id,
            slug,
            name,
            address_line1,
            latitude,
            longitude,
            overture_place_id,
            status,
            review_status,
            verification_status
          `
        )
        .range(
          offset,
          offset + pageSize - 1
        );

    if (error) {
      throw new Error(
        `Could not read existing places: ${error.message}`
      );
    }

    const page =
      data ?? [];

    places.push(
      ...page
    );

    if (
      page.length < pageSize
    ) {
      break;
    }
  }

  return places;
}


function createIndexes(
  existingPlaces
) {
  const byOvertureId =
    new Map();

  const byNameAndAddress =
    new Map();

  const byNormalizedName =
    new Map();

  const usedSlugs =
    new Set();

  for (
    const place
    of existingPlaces
  ) {
    if (
      typeof place.overture_place_id ===
        "string" &&
      place.overture_place_id
    ) {
      byOvertureId.set(
        place.overture_place_id,
        place
      );
    }

    const normalizedName =
      normalizeText(
        place.name
      );

    const normalizedAddress =
      normalizeText(
        place.address_line1
      );

    if (
      normalizedName &&
      normalizedAddress
    ) {
      byNameAndAddress.set(
        `${normalizedName}|${normalizedAddress}`,
        place
      );
    }

    if (normalizedName) {
      const current =
        byNormalizedName.get(
          normalizedName
        ) ?? [];

      current.push(place);

      byNormalizedName.set(
        normalizedName,
        current
      );
    }

    if (
      typeof place.slug ===
        "string" &&
      place.slug
    ) {
      usedSlugs.add(
        place.slug
      );
    }
  }

  return {
    byOvertureId,
    byNameAndAddress,
    byNormalizedName,
    usedSlugs
  };
}


function findCandidateMatch(
  candidate,
  indexes
) {
  const directMatch =
    indexes.byOvertureId.get(
      candidate.overtureId
    );

  if (directMatch) {
    return {
      kind:
        "update",

      place:
        directMatch,

      reason:
        "same Overture ID"
    };
  }

  const normalizedName =
    normalizeText(
      candidate.name
    );

  const normalizedAddress =
    normalizeText(
      candidate.addressLine1
    );

  const exactMatch =
    indexes.byNameAndAddress.get(
      `${normalizedName}|${normalizedAddress}`
    );

  if (exactMatch) {
    return {
      kind:
        "possible_match",

      place:
        exactMatch,

      reason:
        "same normalized name and address"
    };
  }

  const sameNamePlaces =
    indexes.byNormalizedName.get(
      normalizedName
    ) ?? [];

  for (
    const place
    of sameNamePlaces
  ) {
    if (
      typeof place.latitude !==
        "number" ||
      typeof place.longitude !==
        "number"
    ) {
      continue;
    }

    const metres =
      distanceMetres(
        candidate.latitude,
        candidate.longitude,
        place.latitude,
        place.longitude
      );

    if (metres <= 150) {
      return {
        kind:
          "possible_match",

        place,

        reason:
          `same name within ${Math.round(metres)} m`
      };
    }
  }

  return {
    kind:
      "new",

    place:
      null,

    reason:
      "no existing match"
  };
}


function createUniqueSlug(
  candidate,
  usedSlugs
) {
  const baseSlug =
    slugify(
      candidate.name
    );

  if (
    !usedSlugs.has(
      baseSlug
    )
  ) {
    usedSlugs.add(
      baseSlug
    );

    return baseSlug;
  }

  const idSuffix =
    normalizeText(
      candidate.overtureId
    )
      .replace(
        /\s+/g,
        ""
      )
      .slice(
        -8
      )
      || "overture";

  let candidateSlug =
    `${baseSlug}-${idSuffix}`;

  let number =
    2;

  while (
    usedSlugs.has(
      candidateSlug
    )
  ) {
    candidateSlug =
      `${baseSlug}-${idSuffix}-${number}`;

    number += 1;
  }

  usedSlugs.add(
    candidateSlug
  );

  return candidateSlug;
}


function createPlaceValues(
  candidate,
  slug,
  importedAt
) {
  const primaryCategory =
    humanizeCategory(
      candidate.primaryCategory
    );

  const alternateCategories =
    Array.isArray(
      candidate.alternateCategories
    )
      ? candidate.alternateCategories
          .filter(
            (value) =>
              typeof value === "string"
          )
          .slice(
            0,
            20
          )
          .map(
            humanizeCategory
          )
      : [];

  const tags =
    Array.isArray(
      candidate.matchedCategories
    )
      ? candidate.matchedCategories
          .filter(
            (value) =>
              typeof value === "string"
          )
          .slice(
            0,
            20
          )
      : [];

  return {
    overture_place_id:
      candidate.overtureId,

    import_source:
      "overture_maps",

    imported_at:
      importedAt,

    source_refreshed_at:
      importedAt,

    review_status:
      "needs_review",

    slug,

    place_type:
      mapPlaceType(
        candidate.primaryCategory
      ),

    name:
      candidate.name.trim(),

    short_description:
      `${candidate.name.trim()} is a Winnipeg ${primaryCategory.toLowerCase()} imported from Overture Maps and awaiting Venture review.`,

    full_description:
      null,

    primary_category:
      primaryCategory,

    secondary_categories:
      alternateCategories,

    tags,

    address_line1:
      candidate.addressLine1.trim(),

    address_line2:
      null,

    city:
      candidate.locality?.trim()
      || "Winnipeg",

    province:
      getProvince(
        candidate.region
      ),

    postal_code:
      candidate.postalCode?.trim()
      || null,

    neighbourhood:
      null,

    location:
      `SRID=4326;POINT(${candidate.longitude} ${candidate.latitude})`,

    official_phone:
      candidate.phone?.trim()
      || null,

    official_email:
      null,

    official_website:
      candidate.website?.trim()
      || null,

    price_level:
      null,

    cuisine_primary:
      getCuisinePrimary(
        candidate.primaryCategory
      ),

    cuisine_secondary:
      [],

    weekly_hours:
      {},

    special_hours:
      [],

    open_status:
      "unknown",

    menu_url:
      null,

    reservation_url:
      null,

    takeout_available:
      null,

    delivery_available:
      null,

    dietary_options:
      [],

    atmosphere_tags:
      [],

    good_for:
      [],

    accessibility_notes:
      null,

    parking_notes:
      null,

    transit_notes:
      null,

    status:
      "draft",

    verification_status:
      "unverified",

    warning_message:
      "Imported from Overture Maps. Hours, menu, price, accessibility, and current operating status have not yet been verified by Venture.",

    source_checked_at:
      importedAt,

    last_verified_at:
      null,

    freshness_expires_at:
      addDays(
        importedAt,
        90
      ),

    published_at:
      null
  };
}


async function ensureOvertureSource(
  supabase,
  importedAt
) {
  const sourceName =
    "Overture Maps Foundation";

  const baseUrl =
    "https://overturemaps.org";

  const {
    data: existingSources,
    error: findError
  } =
    await supabase
      .from("sources")
      .select("id")
      .eq(
        "name",
        sourceName
      )
      .eq(
        "base_url",
        baseUrl
      )
      .limit(1);

  if (findError) {
    throw new Error(
      `Could not inspect the Overture source: ${findError.message}`
    );
  }

  const values = {
    name:
      sourceName,

    source_type:
      "open_data",

    base_url:
      baseUrl,

    rights_basis:
      "open_licence",

    terms_url:
      "https://docs.overturemaps.org/attribution/",

    attribution_text:
      "Overture Maps Foundation and data contributors",

    caching_limit:
      "Store factual place fields and preserve source attribution.",

    retention_notes:
      "Refresh imported records from newer Overture releases.",

    deletion_obligations:
      "Review current Overture attribution and removal requirements before public display.",

    active:
      true,

    reviewed_at:
      importedAt
  };

  const existingId =
    existingSources?.[0]?.id;

  if (existingId) {
    const {
      error
    } =
      await supabase
        .from("sources")
        .update(values)
        .eq(
          "id",
          existingId
        );

    if (error) {
      throw new Error(
        `Could not update the Overture source: ${error.message}`
      );
    }

    return existingId;
  }

  const {
    data,
    error
  } =
    await supabase
      .from("sources")
      .insert(values)
      .select("id")
      .single();

  if (error) {
    throw new Error(
      `Could not create the Overture source: ${error.message}`
    );
  }

  return data.id;
}


async function attachOvertureSource(
  supabase,
  placeId,
  sourceId,
  importedAt
) {
  const sourceUrl =
    "https://overturemaps.org";

  const {
    error: deleteError
  } =
    await supabase
      .from("listing_sources")
      .delete()
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
      );

  if (deleteError) {
    throw new Error(
      `Could not refresh Overture attribution: ${deleteError.message}`
    );
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
          sourceUrl,

        is_primary:
          true,

        field_coverage: {
          identity:
            true,

          address:
            true,

          coordinates:
            true,

          categories:
            true,

          website:
            true,

          phone:
            true
        },

        extracted_at:
          importedAt,

        last_checked_at:
          importedAt,

        legal_notes:
          "Automatically imported from Overture Maps. Review current attribution requirements before publishing."
      });

  if (insertError) {
    throw new Error(
      `Could not attach Overture attribution: ${insertError.message}`
    );
  }
}


async function insertPlace(
  supabase,
  values
) {
  const {
    data,
    error
  } =
    await supabase
      .from("places")
      .insert(values)
      .select(
        "id, slug, name"
      )
      .single();

  if (error) {
    throw new Error(
      `Could not insert ${values.name}: ${error.message}`
    );
  }

  return data;
}


async function updatePlace(
  supabase,
  placeId,
  values
) {
  const {
    data,
    error
  } =
    await supabase
      .from("places")
      .update(values)
      .eq(
        "id",
        placeId
      )
      .select(
        "id, slug, name"
      )
      .single();

  if (error) {
    throw new Error(
      `Could not update ${values.name}: ${error.message}`
    );
  }

  return data;
}


async function main() {
  if (
    dryRun &&
    writeChanges
  ) {
    throw new Error(
      "Use either --dry-run or --write, not both."
    );
  }

  if (
    !dryRun &&
    !writeChanges
  ) {
    throw new Error(
      "Choose --dry-run for inspection or --write to change Supabase."
    );
  }

  const candidates =
    await readCandidates();

  const selected =
    candidates.slice(
      0,
      limit
    );

  const supabase =
    createAdminClient();

  const existingPlaces =
    await readAllExistingPlaces(
      supabase
    );

  const indexes =
    createIndexes(
      existingPlaces
    );

  const importedAt =
    new Date().toISOString();

  const decisions =
    [];

  const earlierCandidates =
    [];

  for (
    const candidate
    of selected
  ) {
    const batchDuplicate =
      findBatchDuplicate(
        candidate,
        earlierCandidates
      );

    if (batchDuplicate) {
      decisions.push({
        candidate,

        match: {
          kind:
            "batch_duplicate",

          place:
            null,

          duplicateCandidate:
            batchDuplicate.candidate,

          reason:
            batchDuplicate.reason
        },

        slug:
          null
      });

      continue;
    }

    const match =
      findCandidateMatch(
        candidate,
        indexes
      );

    const slug =
      match.kind === "update"
        ? match.place.slug
        : createUniqueSlug(
            candidate,
            indexes.usedSlugs
          );

    decisions.push({
      candidate,
      match,
      slug
    });

    earlierCandidates.push(
      candidate
    );
  }

  const summary = {
    new:
      0,

    update:
      0,

    possible_match:
      0,

    batch_duplicate:
      0,

    inserted:
      0,

    updated:
      0,

    skipped:
      0
  };

  console.log(
    `Loaded ${candidates.length.toLocaleString()} valid Overture candidates.`
  );

  console.log(
    `Inspecting the first ${selected.length.toLocaleString()} records.`
  );

  console.log(
    `Existing Venture places: ${existingPlaces.length.toLocaleString()}\n`
  );

  for (
    const decision
    of decisions
  ) {
    const {
      candidate,
      match,
      slug
    } = decision;

    summary[
      match.kind
    ] += 1;

    const label =
      match.kind === "new"
        ? "NEW"
        : match.kind === "update"
          ? "UPDATE"
          : match.kind ===
              "batch_duplicate"
            ? "BATCH DUPLICATE"
            : "POSSIBLE MATCH";

    console.log(
      `${label.padEnd(16)} ${candidate.name} | ${candidate.addressLine1}`
    );

    console.log(
      `                 ${match.reason} | slug: ${slug ?? "not created"}`
    );

    if (
      match.kind ===
        "possible_match"
    ) {
      console.log(
        `                 Existing: ${match.place.name} | ${match.place.address_line1}`
      );

      summary.skipped += 1;

      continue;
    }

    if (
      match.kind ===
        "batch_duplicate"
    ) {
      console.log(
        `                 Earlier candidate: ${match.duplicateCandidate.name} | ${match.duplicateCandidate.addressLine1}`
      );

      summary.skipped += 1;

      continue;
    }

    if (dryRun) {
      continue;
    }

    const values =
      createPlaceValues(
        candidate,
        slug,
        importedAt
      );

    const place =
      match.kind === "update"
        ? await updatePlace(
            supabase,
            match.place.id,
            values
          )
        : await insertPlace(
            supabase,
            values
          );

    if (
      match.kind === "update"
    ) {
      summary.updated += 1;
    } else {
      summary.inserted += 1;
    }

    decision.savedPlace =
      place;
  }

  if (writeChanges) {
    const savedDecisions =
      decisions.filter(
        (decision) =>
          decision.savedPlace
      );

    if (
      savedDecisions.length > 0
    ) {
      const sourceId =
        await ensureOvertureSource(
          supabase,
          importedAt
        );

      for (
        const decision
        of savedDecisions
      ) {
        await attachOvertureSource(
          supabase,
          decision.savedPlace.id,
          sourceId,
          importedAt
        );
      }
    }
  }

  console.log(
    "\nOverture import summary"
  );

  console.log(
    `New candidates:       ${summary.new}`
  );

  console.log(
    `Existing Overture IDs:${String(summary.update).padStart(4)}`
  );

  console.log(
    `Possible matches:     ${summary.possible_match}`
  );

  console.log(
    `Batch duplicates:     ${summary.batch_duplicate}`
  );

  console.log(
    `Inserted:             ${summary.inserted}`
  );

  console.log(
    `Updated:              ${summary.updated}`
  );

  console.log(
    `Skipped for review:   ${summary.skipped}`
  );

  if (dryRun) {
    console.log(
      "\nDry run complete. Supabase was not changed."
    );
  } else {
    console.log(
      "\nWrite complete. Imported records remain draft and need review."
    );
  }
}


main().catch(
  (error) => {
    console.error(
      "\nOverture import failed:"
    );

    console.error(
      error instanceof Error
        ? error.message
        : error
    );

    process.exitCode =
      1;
  }
);
