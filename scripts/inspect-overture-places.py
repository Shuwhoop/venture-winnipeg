import json
from collections import Counter
from pathlib import Path


DATA_FILE = Path(
    "data/overture-winnipeg-places.geojson"
)


def get_primary_name(properties: dict) -> str:
    names = properties.get("names")

    if isinstance(names, dict):
        primary = names.get("primary")

        if isinstance(primary, str):
            return primary

    name = properties.get("name")

    if isinstance(name, str):
        return name

    return "Unnamed place"


def get_categories(properties: dict) -> tuple[str | None, list[str]]:
    categories = properties.get("categories")

    if not isinstance(categories, dict):
        return None, []

    primary = categories.get("primary")
    alternate = categories.get("alternate", [])

    if not isinstance(primary, str):
        primary = None

    if not isinstance(alternate, list):
        alternate = []

    alternate = [
        value
        for value in alternate
        if isinstance(value, str)
    ]

    return primary, alternate


def main() -> None:
    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Could not find {DATA_FILE}"
        )

    with DATA_FILE.open(
        "r",
        encoding="utf-8"
    ) as file:
        dataset = json.load(file)

    features = dataset.get(
        "features",
        []
    )

    print(
        f"Total Winnipeg places: {len(features):,}"
    )

    if not features:
        return

    first_properties = features[0].get(
        "properties",
        {}
    )

    print("\nFirst feature property fields:")

    for key in sorted(
        first_properties.keys()
    ):
        print(f"  - {key}")

    category_counts = Counter()
    food_examples = []

    food_words = (
        "restaurant",
        "cafe",
        "coffee",
        "bakery",
        "bar",
        "pub",
        "brewery",
        "food",
        "pizza",
        "burger",
        "sandwich",
        "dessert",
        "ice_cream",
        "fast_food"
    )

    for feature in features:
        properties = feature.get(
            "properties",
            {}
        )

        primary, alternate = get_categories(
            properties
        )

        if primary:
            category_counts[primary] += 1

        category_text = " ".join(
            [
                primary or "",
                *alternate
            ]
        ).lower()

        if (
            len(food_examples) < 15
            and any(
                word in category_text
                for word in food_words
            )
        ):
            food_examples.append(
                {
                    "name":
                        get_primary_name(
                            properties
                        ),

                    "primary":
                        primary,

                    "alternate":
                        alternate
                }
            )

    print("\nTop 40 primary categories:")

    for category, count in category_counts.most_common(
        40
    ):
        print(
            f"{count:>6}  {category}"
        )

    print("\nFood-related examples:")

    for example in food_examples:
        print(
            f"\nName: {example['name']}"
        )

        print(
            f"Primary: {example['primary']}"
        )

        print(
            "Alternate: "
            + ", ".join(
                example["alternate"]
            )
        )


if __name__ == "__main__":
    main()