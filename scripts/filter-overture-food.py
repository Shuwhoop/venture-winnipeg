import json
import re
from collections import Counter
from pathlib import Path
from typing import Any


INPUT_FILE = Path(
    "data/overture-winnipeg-places.geojson"
)

OUTPUT_FILE = Path(
    "data/overture-winnipeg-food-candidates.json"
)


EXACT_FOOD_CATEGORIES = {
    "restaurant",
    "cafe",
    "coffee_shop",
    "bakery",
    "sandwich_shop",
    "food_truck",
    "food_court",
    "food_stand",
    "ice_cream_shop",
    "dessert_shop",
    "donut_shop",
    "tea_room",
    "bubble_tea_shop",
    "juice_bar",
    "smoothie_shop",
    "diner",
    "steakhouse",
    "cafeteria",
    "buffet",
    "brewery",
    "winery",
    "distillery",
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
}


def normalize_text(
    value: str
) -> str:
    return re.sub(
        r"\s+",
        " ",
        value.strip().lower()
    )


def get_primary_name(
    properties: dict[str, Any]
) -> str | None:
    names = properties.get("names")

    if isinstance(names, dict):
        primary = names.get("primary")

        if (
            isinstance(primary, str)
            and primary.strip()
        ):
            return primary.strip()

    name = properties.get("name")

    if (
        isinstance(name, str)
        and name.strip()
    ):
        return name.strip()

    return None


def get_categories(
    properties: dict[str, Any]
) -> tuple[str | None, list[str]]:
    categories = properties.get(
        "categories"
    )

    if not isinstance(
        categories,
        dict
    ):
        return None, []

    primary = categories.get(
        "primary"
    )

    alternate = categories.get(
        "alternate",
        []
    )

    if not isinstance(
        primary,
        str
    ):
        primary = None

    if not isinstance(
        alternate,
        list
    ):
        alternate = []

    clean_alternate = [
        value
        for value in alternate
        if isinstance(value, str)
    ]

    return primary, clean_alternate


def is_food_category(
    category: str
) -> bool:
    normalized = normalize_text(
        category
    ).replace(
        " ",
        "_"
    )

    return (
        normalized in
        EXACT_FOOD_CATEGORIES
        or normalized.endswith(
            "_restaurant"
        )
    )


def get_coordinates(
    feature: dict[str, Any]
) -> tuple[float, float] | None:
    geometry = feature.get(
        "geometry"
    )

    if not isinstance(
        geometry,
        dict
    ):
        return None

    if (
        geometry.get("type")
        != "Point"
    ):
        return None

    coordinates = geometry.get(
        "coordinates"
    )

    if (
        not isinstance(
            coordinates,
            list
        )
        or len(coordinates) < 2
    ):
        return None

    longitude = coordinates[0]
    latitude = coordinates[1]

    if (
        not isinstance(
            longitude,
            (int, float)
        )
        or not isinstance(
            latitude,
            (int, float)
        )
    ):
        return None

    return (
        float(longitude),
        float(latitude)
    )


def get_first_address(
    properties: dict[str, Any]
) -> dict[str, Any]:
    addresses = properties.get(
        "addresses"
    )

    if not isinstance(
        addresses,
        list
    ):
        return {}

    for address in addresses:
        if isinstance(
            address,
            dict
        ):
            return address

    return {}


def get_first_text_value(
    value: Any
) -> str | None:
    if isinstance(value, str):
        cleaned = value.strip()

        return (
            cleaned
            if cleaned
            else None
        )

    if isinstance(value, list):
        for item in value:
            result = get_first_text_value(
                item
            )

            if result:
                return result

    if isinstance(value, dict):
        for key in (
            "value",
            "url",
            "phone",
            "website"
        ):
            result = get_first_text_value(
                value.get(key)
            )

            if result:
                return result

    return None


def build_duplicate_key(
    candidate: dict[str, Any]
) -> str:
    name = normalize_text(
        candidate["name"]
    )

    address = normalize_text(
        candidate.get(
            "addressLine1"
        ) or ""
    )

    latitude = round(
        candidate["latitude"],
        4
    )

    longitude = round(
        candidate["longitude"],
        4
    )

    return (
        f"{name}|{address}|"
        f"{latitude}|{longitude}"
    )


def main() -> None:
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Could not find {INPUT_FILE}"
        )

    with INPUT_FILE.open(
        "r",
        encoding="utf-8"
    ) as file:
        dataset = json.load(file)

    features = dataset.get(
        "features",
        []
    )

    if not isinstance(
        features,
        list
    ):
        raise ValueError(
            "The GeoJSON features field is invalid."
        )

    candidates: list[
        dict[str, Any]
    ] = []

    matched_category_counts = (
        Counter()
    )

    missing_address_count = 0
    missing_coordinate_count = 0
    missing_name_count = 0
    outside_winnipeg_count = 0

    for feature in features:
        if not isinstance(
            feature,
            dict
        ):
            continue

        properties = feature.get(
            "properties",
            {}
        )

        if not isinstance(
            properties,
            dict
        ):
            continue

        name = get_primary_name(
            properties
        )

        if not name:
            missing_name_count += 1
            continue

        primary, alternate = (
            get_categories(
                properties
            )
        )

        if (
            not isinstance(
                primary,
                str
            )
            or not is_food_category(
                primary
            )
        ):
            continue

        matched_categories = list(
            dict.fromkeys(
                [
                    primary,
                    *[
                        category
                        for category
                        in alternate
                        if is_food_category(
                            category
                        )
                    ]
                ]
            )
        )

        coordinates = get_coordinates(
            feature
        )

        if not coordinates:
            missing_coordinate_count += 1
            continue

        longitude, latitude = (
            coordinates
        )

        address = get_first_address(
            properties
        )

        address_line1 = (
            get_first_text_value(
                address.get(
                    "freeform"
                )
            )
            or get_first_text_value(
                address.get(
                    "address"
                )
            )
        )

        locality = get_first_text_value(
            address.get(
                "locality"
            )
        )

        if (
            locality
            and normalize_text(
                locality
            ) not in {
                "winnipeg",
                "city of winnipeg"
            }
        ):
            outside_winnipeg_count += 1
            continue

        if not address_line1:
            missing_address_count += 1
            continue

        for category in (
            matched_categories
        ):
            matched_category_counts[
                category
            ] += 1

        confidence = properties.get(
            "confidence"
        )

        candidate = {
            "overtureId":
                feature.get("id"),

            "name":
                name,

            "primaryCategory":
                primary,

            "alternateCategories":
                alternate,

            "matchedCategories":
                matched_categories,

            "addressLine1":
                address_line1,

            "locality":
                locality,

            "region":
                get_first_text_value(
                    address.get(
                        "region"
                    )
                ),

            "postalCode":
                get_first_text_value(
                    address.get(
                        "postcode"
                    )
                ),

            "country":
                get_first_text_value(
                    address.get(
                        "country"
                    )
                ),

            "latitude":
                latitude,

            "longitude":
                longitude,

            "confidence":
                confidence
                if isinstance(
                    confidence,
                    (int, float)
                )
                else None,

            "website":
                get_first_text_value(
                    properties.get(
                        "websites"
                    )
                ),

            "phone":
                get_first_text_value(
                    properties.get(
                        "phones"
                    )
                ),

            "basicCategory":
                properties.get(
                    "basic_category"
                )
        }

        candidates.append(
            candidate
        )

    candidates.sort(
        key=lambda item:
            item["name"].lower()
    )

    duplicate_counts = Counter(
        build_duplicate_key(
            candidate
        )
        for candidate
        in candidates
    )

    possible_duplicate_groups = sum(
        1
        for count
        in duplicate_counts.values()
        if count > 1
    )

    output = {
        "source":
            "Overture Maps places",

        "inputPlaceCount":
            len(features),

        "candidateCount":
            len(candidates),

        "possibleDuplicateGroups":
            possible_duplicate_groups,

        "candidates":
            candidates
    }

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with OUTPUT_FILE.open(
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            output,
            file,
            ensure_ascii=False,
            indent=2
        )

    print(
        f"Total Winnipeg places: "
        f"{len(features):,}"
    )

    print(
        f"Food and drink candidates: "
        f"{len(candidates):,}"
    )

    print(
        f"Candidates without addresses: "
        f"{missing_address_count:,}"
    )

    print(
        f"Food records skipped without "
        f"coordinates: "
        f"{missing_coordinate_count:,}"
    )

    print(
        f"Records outside Winnipeg skipped: "
        f"{outside_winnipeg_count:,}"
    )

    print(
        f"Possible duplicate groups: "
        f"{possible_duplicate_groups:,}"
    )

    print(
        "\nTop matched categories:"
    )

    for category, count in (
        matched_category_counts
        .most_common(30)
    ):
        print(
            f"{count:>6}  {category}"
        )

    print(
        "\nFirst 20 candidates:"
    )

    for candidate in (
        candidates[:20]
    ):
        address_text = (
            candidate[
                "addressLine1"
            ]
            or "Address missing"
        )

        print(
            f"- {candidate['name']} | "
            f"{candidate['primaryCategory']} | "
            f"{address_text}"
        )

    print(
        f"\nSaved candidate file to: "
        f"{OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()