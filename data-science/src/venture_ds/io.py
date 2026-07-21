from __future__ import annotations

from pathlib import Path
import json
import pandas as pd


def _latest_matching(folder: Path, pattern: str) -> Path | None:
    matches = sorted(
        folder.glob(pattern),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    return matches[0] if matches else None


def _read_csv(path: Path | None) -> pd.DataFrame:
    if path is None:
        return pd.DataFrame()
    return pd.read_csv(path, encoding="utf-8-sig")


def parse_properties_column(events: pd.DataFrame) -> pd.DataFrame:
    events = events.copy()
    if "properties_json" not in events.columns:
        events["properties"] = [{} for _ in range(len(events))]
        return events

    def parse(value):
        if pd.isna(value) or value == "":
            return {}
        if isinstance(value, dict):
            return value
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except (TypeError, json.JSONDecodeError):
            return {}

    events["properties"] = events["properties_json"].map(parse)
    return events


def load_exports(raw_dir: str | Path = "data/raw") -> dict[str, pd.DataFrame]:
    folder = Path(raw_dir)

    files = {
        "events": _latest_matching(folder, "venture-events-*.csv"),
        "sessions": _latest_matching(folder, "venture-sessions-*.csv"),
        "feedback": _latest_matching(folder, "venture-feedback-*.csv"),
        "inventory": _latest_matching(folder, "venture-inventory-*.csv"),
    }

    result = {
        name: _read_csv(path)
        for name, path in files.items()
    }

    result["events"] = parse_properties_column(result["events"])

    for frame_name in ("events", "sessions", "feedback", "inventory"):
        frame = result[frame_name]
        for column in (
            "created_at",
            "client_created_at",
            "session_started_at",
            "session_ended_at",
            "start_at",
        ):
            if column in frame.columns:
                frame[column] = pd.to_datetime(
                    frame[column],
                    utc=True,
                    errors="coerce",
                )

    result["_files"] = pd.DataFrame(
        [
            {
                "dataset": name,
                "path": str(path) if path else None,
                "found": path is not None,
            }
            for name, path in files.items()
        ]
    )
    return result


def load_optional_export(
    keyword: str,
    raw_dir: str | Path = "data/raw",
) -> pd.DataFrame:
    folder = Path(raw_dir)
    path = _latest_matching(folder, f"*{keyword}*.csv")
    return _read_csv(path)
