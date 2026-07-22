#!/usr/bin/env python3
"""Prepare neighbourhood-targeted Venture place CSVs from Overture candidates.

Input is the JSON file created by scripts/filter-overture-food.py:
    data/overture-winnipeg-food-candidates.json

The script never changes Supabase. It creates previewable CSV files that are
uploaded through /admin/import and remain drafts.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from collections import defaultdict
from pathlib import Path
from typing import Any


DEFAULT_INPUT = Path("data/overture-winnipeg-food-candidates.json")
DEFAULT_OUTPUT = Path("data/imports/targeted-overture")

AREA_PRESETS: dict[str, dict[str, Any]] = {
    "downtown": {
        "label": "Downtown",
        "latitude": 49.8951,
        "longitude": -97.1384,
        "radius_m": 1800,
    },
    "exchange-district": {
        "label": "Exchange District",
        "latitude": 49.9006,
        "longitude": -97.1390,
        "radius_m": 950,
    },
    "the-forks": {
        "label": "The Forks",
        "latitude": 49.8873,
        "longitude": -97.1302,
        "radius_m": 950,
    },
    "osborne-village": {
        "label": "Osborne Village",
        "latitude": 49.8777,
        "longitude": -97.1469,
        "radius_m": 1150,
    },
    "corydon": {
        "label": "Corydon",
        "latitude": 49.8720,
        "longitude": -97.1595,
        "radius_m": 1500,
    },
    "wellington-crescent": {
        "label": "Wellington Crescent",
        "latitude": 49.8744,
        "longitude": -97.1800,
        "radius_m": 1800,
    },
    "st-boniface": {
        "label": "St. Boniface",
        "latitude": 49.8850,
        "longitude": -97.1110,
        "radius_m": 1800,
    },
    "university-of-manitoba-fort-garry": {
        "label": "University of Manitoba / Fort Garry",
        "latitude": 49.8075,
        "longitude": -97.1366,
        "radius_m": 2400,
    },
    "university-of-winnipeg-west-broadway": {
        "label": "University of Winnipeg / West Broadway",
        "latitude": 49.8905,
        "longitude": -97.1530,
        "radius_m": 1800,
    },
    "bridgwater": {
        "label": "Bridgwater",
        "latitude": 49.7980,
        "longitude": -97.2000,
        "radius_m": 2700,
    },
}

PLACE_TYPES = {
    "restaurant",
    "cafe",
    "bakery_dessert",
    "bar_pub",
    "brewery",
    "food_truck",
    "fast_casual",
}

CSV_FIELDS = [
    "overture_place_id",
    "slug",
    "place_type",
    "name",
    "short_description",
    "full_description",
    "primary_category",
    "secondary_categories",
    "tags",
    "address_line1",
    "address_line2",
    "city",
    "province",
    "postal_code",
    "neighbourhood",
    "latitude",
    "longitude",
    "official_phone",
    "official_email",
    "official_website",
    "price_level",
    "cuisine_primary",
    "cuisine_secondary",
    "weekly_hours_json",
    "open_status",
    "menu_url",
    "reservation_url",
    "dietary_options",
    "atmosphere_tags",
    "good_for",
    "accessibility_notes",
    "parking_notes",
    "transit_notes",
    "source_url",
]


def normalize(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def slugify(value: Any) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", normalize(value))
    return cleaned.strip("-")[:100] or "winnipeg-place"


def humanize(value: Any) -> str:
    return " ".join(word.capitalize() for word in normalize(value).replace("-", "_").split("_") if word)


def map_place_type(category: Any) -> str:
    value = normalize(category).replace(" ", "_")

    if value in {
        "cafe",
        "coffee_shop",
        "tea_room",
        "bubble_tea_shop",
        "juice_bar",
        "smoothie_shop",
    }:
        return "cafe"

    if value in {
        "bakery",
        "dessert_shop",
        "donut_shop",
        "ice_cream_shop",
    }:
        return "bakery_dessert"

    if value in {
        "bar",
        "pub",
        "gastropub",
        "beer_garden",
        "cocktail_bar",
        "sports_bar",
        "wine_bar",
        "beer_bar",
        "dive_bar",
        "hookah_bar",
    }:
        return "bar_pub"

    if value in {"brewery", "winery", "distillery"}:
        return "brewery"

    if value in {"food_truck", "food_stand"}:
        return "food_truck"

    if value in {
        "fast_food_restaurant",
        "pizza_restaurant",
        "burger_restaurant",
        "sandwich_shop",
        "food_court",
    }:
        return "fast_casual"

    return "restaurant"


def cuisine_primary(category: Any) -> str:
    value = normalize(category).replace(" ", "_")

    if value.endswith("_restaurant") and value not in {
        "restaurant",
        "fast_food_restaurant",
        "breakfast_and_brunch_restaurant",
        "bar_and_grill_restaurant",
    }:
        return humanize(value.removesuffix("_restaurant"))

    return ""


def distance_metres(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    value = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )

    return radius * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def clean_url(value: Any) -> str:
    url = str(value or "").strip()
    return url if url.startswith(("https://", "http://")) else ""


def province_name(value: Any) -> str:
    normalized = normalize(value)
    return "Manitoba" if normalized in {"mb", "manitoba", ""} else str(value).strip()


def select_areas(raw: str) -> list[str]:
    if normalize(raw) in {"", "all"}:
        return list(AREA_PRESETS)

    requested = [item.strip() for item in raw.split(",") if item.strip()]
    invalid = [item for item in requested if item not in AREA_PRESETS]

    if invalid:
        raise ValueError(
            "Unknown area preset(s): "
            + ", ".join(invalid)
            + ". Use --list-areas to see valid keys."
        )

    return requested


def load_candidates(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(
            f"Could not find {path}. Run scripts/filter-overture-food.py first."
        )

    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    candidates = data.get("candidates") if isinstance(data, dict) else None

    if not isinstance(candidates, list):
        raise ValueError("The Overture candidate JSON does not contain a candidates list.")

    return [row for row in candidates if isinstance(row, dict)]


def candidate_row(candidate: dict[str, Any], area_label: str) -> dict[str, str]:
    name = str(candidate.get("name") or "").strip()
    primary_raw = str(candidate.get("primaryCategory") or "restaurant").strip()
    primary_category = humanize(primary_raw)
    alternate = [
        humanize(value)
        for value in candidate.get("alternateCategories", [])
        if isinstance(value, str)
    ]
    tags = [
        str(value).strip()
        for value in candidate.get("matchedCategories", [])
        if isinstance(value, str) and str(value).strip()
    ]
    place_type = map_place_type(primary_raw)

    return {
        "overture_place_id": str(candidate.get("overtureId") or "").strip(),
        "slug": slugify(name),
        "place_type": place_type,
        "name": name,
        "short_description": (
            f"{name} is a Winnipeg {primary_category.lower()} imported from "
            "Overture Maps and awaiting Venture verification."
        ),
        "full_description": "",
        "primary_category": primary_category,
        "secondary_categories": ";".join(dict.fromkeys(alternate)),
        "tags": ";".join(dict.fromkeys(tags)),
        "address_line1": str(candidate.get("addressLine1") or "").strip(),
        "address_line2": "",
        "city": str(candidate.get("locality") or "Winnipeg").strip() or "Winnipeg",
        "province": province_name(candidate.get("region")),
        "postal_code": str(candidate.get("postalCode") or "").strip(),
        "neighbourhood": area_label,
        "latitude": str(candidate.get("latitude") or ""),
        "longitude": str(candidate.get("longitude") or ""),
        "official_phone": str(candidate.get("phone") or "").strip(),
        "official_email": "",
        "official_website": clean_url(candidate.get("website")),
        "price_level": "",
        "cuisine_primary": cuisine_primary(primary_raw),
        "cuisine_secondary": "",
        "weekly_hours_json": "{}",
        "open_status": "unknown",
        "menu_url": "",
        "reservation_url": "",
        "dietary_options": "",
        "atmosphere_tags": "",
        "good_for": "",
        "accessibility_notes": "",
        "parking_notes": "",
        "transit_notes": "",
        "source_url": "https://overturemaps.org",
    }


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create targeted Venture import CSVs from Overture food candidates."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--areas", default="all", help="Comma-separated preset keys or all")
    parser.add_argument(
        "--types",
        default="restaurant,bar_pub,cafe,brewery,bakery_dessert,fast_casual",
        help="Comma-separated Venture place types",
    )
    parser.add_argument("--limit-per-area", type=int, default=40)
    parser.add_argument("--list-areas", action="store_true")
    args = parser.parse_args()

    if args.list_areas:
        for key, area in AREA_PRESETS.items():
            print(f"{key}: {area['label']} ({area['radius_m']} m)")
        return

    selected_areas = select_areas(args.areas)
    selected_types = {item.strip() for item in args.types.split(",") if item.strip()}
    invalid_types = sorted(selected_types - PLACE_TYPES)

    if invalid_types:
        raise ValueError("Unsupported place type(s): " + ", ".join(invalid_types))

    limit_per_area = max(1, min(args.limit_per_area, 250))
    candidates = load_candidates(args.input)
    matches: dict[str, list[tuple[float, dict[str, Any]]]] = defaultdict(list)

    for candidate in candidates:
        try:
            latitude = float(candidate.get("latitude"))
            longitude = float(candidate.get("longitude"))
        except (TypeError, ValueError):
            continue

        if map_place_type(candidate.get("primaryCategory")) not in selected_types:
            continue

        for area_key in selected_areas:
            area = AREA_PRESETS[area_key]
            distance = distance_metres(
                latitude,
                longitude,
                float(area["latitude"]),
                float(area["longitude"]),
            )

            if distance <= float(area["radius_m"]):
                matches[area_key].append((distance, candidate))

    args.output.mkdir(parents=True, exist_ok=True)
    combined_rows: list[dict[str, str]] = []
    seen_overture_ids: set[str] = set()
    summary: dict[str, int] = {}

    for area_key in selected_areas:
        area = AREA_PRESETS[area_key]
        area_candidates = sorted(
            matches.get(area_key, []),
            key=lambda item: (item[0], normalize(item[1].get("name"))),
        )

        rows: list[dict[str, str]] = []

        for _, candidate in area_candidates:
            overture_id = str(candidate.get("overtureId") or "").strip()

            if not overture_id or overture_id in seen_overture_ids:
                continue

            row = candidate_row(candidate, str(area["label"]))
            rows.append(row)
            combined_rows.append(row)
            seen_overture_ids.add(overture_id)

            if len(rows) >= limit_per_area:
                break

        filename = f"venture-overture-{area_key}.csv"
        write_csv(args.output / filename, rows)
        summary[str(area["label"])] = len(rows)
        print(f"{str(area['label']).ljust(44)} {len(rows):>3} rows -> {filename}")

    write_csv(args.output / "venture-overture-priority-areas-combined.csv", combined_rows)

    with (args.output / "targeted-overture-summary.json").open(
        "w", encoding="utf-8"
    ) as handle:
        json.dump(
            {
                "input": str(args.input),
                "selectedAreas": selected_areas,
                "selectedTypes": sorted(selected_types),
                "limitPerArea": limit_per_area,
                "totalRows": len(combined_rows),
                "areaCounts": summary,
                "note": "Upload one area CSV at a time through /admin/import. All rows remain drafts.",
            },
            handle,
            indent=2,
        )

    print(f"\nCombined priority-area CSV: {len(combined_rows)} rows")
    print(f"Output folder: {args.output.resolve()}")
    print("No database changes were made.")


if __name__ == "__main__":
    main()
