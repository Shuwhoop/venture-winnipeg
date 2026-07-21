from __future__ import annotations

from dataclasses import dataclass
import pandas as pd


TRUSTED_VERIFICATION = {
    "official_source",
    "verified_venture",
    "verified_business",
}


@dataclass(frozen=True)
class RecommendationRequest:
    preferred_categories: tuple[str, ...] = ()
    preferred_neighbourhoods: tuple[str, ...] = ()
    include_events: bool = True


def transparent_inventory_score(
    inventory: pd.DataFrame,
    request: RecommendationRequest,
) -> pd.DataFrame:
    scored = inventory.copy()

    scored["score"] = 0.0
    scored["score_explanation"] = ""

    def add(points: float, mask, reason: str):
        scored.loc[mask, "score"] += points
        scored.loc[mask, "score_explanation"] += f"{reason} ({points:+g}); "

    add(
        25,
        scored["status"].eq("published"),
        "published",
    )
    add(
        25,
        scored["verification_status"].isin(TRUSTED_VERIFICATION),
        "trusted verification",
    )

    if request.preferred_categories:
        add(
            20,
            scored["category"].isin(request.preferred_categories),
            "preferred category",
        )

    if request.preferred_neighbourhoods:
        add(
            15,
            scored["neighbourhood"].isin(request.preferred_neighbourhoods),
            "preferred neighbourhood",
        )

    if not request.include_events:
        add(
            -100,
            scored["entity_type"].eq("event"),
            "events excluded",
        )

    add(
        -15,
        scored["neighbourhood"].isna()
        | scored["neighbourhood"].eq(""),
        "missing neighbourhood",
    )
    add(
        -40,
        ~scored["status"].eq("published"),
        "not public",
    )
    add(
        -30,
        ~scored["verification_status"].isin(TRUSTED_VERIFICATION),
        "not trusted",
    )

    return scored.sort_values(
        ["score", "name"],
        ascending=[False, True],
    )
