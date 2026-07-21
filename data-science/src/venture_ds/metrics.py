from __future__ import annotations

from math import sqrt
import pandas as pd


def safe_rate(numerator: int | float, denominator: int | float) -> float:
    if denominator in (0, None) or pd.isna(denominator):
        return 0.0
    return float(numerator) / float(denominator)


def wilson_interval(
    successes: int,
    total: int,
    z: float = 1.96,
) -> tuple[float, float]:
    if total <= 0:
        return (0.0, 0.0)

    p = successes / total
    denominator = 1 + (z * z / total)
    center = (p + z * z / (2 * total)) / denominator
    margin = (
        z
        * sqrt(
            p * (1 - p) / total
            + z * z / (4 * total * total)
        )
        / denominator
    )
    return (
        max(0.0, center - margin),
        min(1.0, center + margin),
    )


def add_sample_warning(
    sample_size: int,
    minimum: int = 20,
) -> str | None:
    if sample_size < minimum:
        return (
            f"Directional only: sample size is {sample_size}, "
            f"below the working minimum of {minimum}."
        )
    return None


def ordered_session_funnel(
    events: pd.DataFrame,
    steps: list[tuple[str, set[str]]],
) -> pd.DataFrame:
    required = {"session_id", "event_name", "created_at"}
    missing = required.difference(events.columns)
    if missing:
        raise ValueError(
            f"Events export is missing required columns: {sorted(missing)}"
        )

    ordered = events.sort_values(
        ["session_id", "created_at"]
    )

    results = []
    eligible_sessions: set[str] | None = None

    for key, accepted_events in steps:
        reached: set[str] = set()

        for session_id, group in ordered.groupby("session_id"):
            if (
                eligible_sessions is not None
                and session_id not in eligible_sessions
            ):
                continue

            if group["event_name"].isin(accepted_events).any():
                reached.add(session_id)

        previous = (
            len(eligible_sessions)
            if eligible_sessions is not None
            else events["session_id"].nunique()
        )
        results.append(
            {
                "step": key,
                "sessions": len(reached),
                "step_rate": safe_rate(len(reached), previous),
            }
        )
        eligible_sessions = reached

    return pd.DataFrame(results)
