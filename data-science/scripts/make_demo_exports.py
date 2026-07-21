"""Create clearly labelled synthetic CSV exports for notebook practice.

These files are not real Venture evidence and must never be used in a pitch,
experiment decision, or product claim.
"""

from pathlib import Path
from datetime import datetime, timedelta, timezone
import json
import random
import uuid
import pandas as pd

random.seed(2400)

root = Path(__file__).resolve().parents[1]
demo = root / "data" / "demo"
demo.mkdir(parents=True, exist_ok=True)

now = datetime.now(timezone.utc)
events = []
sessions = []

for visitor_number in range(60):
    visitor_id = str(uuid.uuid4())
    first_day = random.randint(0, 27)
    visit_count = random.choice([1, 1, 1, 2, 2, 3])

    for visit in range(visit_count):
        session_id = str(uuid.uuid4())
        started = now - timedelta(
            days=max(0, first_day - visit * random.randint(3, 8)),
            hours=random.randint(0, 20),
        )
        path = random.choice(["/", "/explore", "/tonight"])
        session_events = [
            ("session_started", path, {}),
            ("page_view", path, {"pageGroup": "discovery"}),
            ("discovery_viewed", "/explore", {"surface": "explore"}),
        ]

        if random.random() < 0.65:
            session_events.append(
                ("listing_detail_opened", "/listings/demo", {"listingId": "demo-place"})
            )
        if random.random() < 0.45:
            session_events.append(
                ("outing_builder_opened", "/build-outing", {})
            )
        generated = random.random() < 0.34
        if generated:
            status = random.choices(
                ["complete", "partial", "empty"],
                weights=[0.55, 0.35, 0.10],
            )[0]
            session_events.append(
                (
                    "outing_generated",
                    "/build-outing/results",
                    {
                        "planStatus": status,
                        "recommendationVersion": "route-score-v1",
                        "actualStopCount": 3 if status == "complete" else 2,
                        "requestedStopCount": 3,
                        "candidateCount": random.randint(5, 30),
                        "categoryDiversity": random.randint(1, 3),
                        "neighbourhoodDiversity": random.randint(1, 2),
                        "stopKindDiversity": random.randint(1, 3),
                    },
                )
            )
            if random.random() < 0.25:
                session_events.append(
                    ("outing_saved", "/build-outing/results", {"recommendationVersion": "route-score-v1"})
                )
            if random.random() < 0.12:
                session_events.append(
                    ("outing_shared", "/build-outing/results", {"recommendationVersion": "route-score-v1"})
                )

        for index, (name, page, properties) in enumerate(session_events):
            timestamp = started + timedelta(minutes=index * 2)
            events.append(
                {
                    "event_id": len(events) + 1,
                    "visitor_id": visitor_id,
                    "session_id": session_id,
                    "event_name": name,
                    "page_path": page,
                    "event_version": 2,
                    "device_class": random.choice(["mobile", "mobile", "desktop"]),
                    "referrer_host": random.choice(["direct", "instagram.com", "google.com"]),
                    "listing_id": properties.get("listingId"),
                    "listing_type": "place" if properties.get("listingId") else None,
                    "plan_status": properties.get("planStatus"),
                    "properties_json": json.dumps(properties),
                    "client_created_at": timestamp.isoformat(),
                    "created_at": (timestamp + timedelta(seconds=random.randint(0, 4))).isoformat(),
                }
            )

        ended = started + timedelta(minutes=max(1, len(session_events) * 2))
        sessions.append(
            {
                "session_id": session_id,
                "visitor_id": visitor_id,
                "session_started_at": started.isoformat(),
                "session_ended_at": ended.isoformat(),
                "duration_seconds": int((ended - started).total_seconds()),
                "event_count": len(session_events),
                "page_view_count": 1,
                "entry_path": path,
                "exit_path": session_events[-1][1],
                "device_class": random.choice(["mobile", "desktop"]),
                "referrer_host": random.choice(["direct", "instagram.com", "google.com"]),
                "bounced": len(session_events) <= 2,
                "generated_outing": generated,
                "shared_outing": any(name == "outing_shared" for name, _, _ in session_events),
                "submitted_feedback": False,
            }
        )

pd.DataFrame(events).to_csv(
    demo / "venture-events-demo-synthetic.csv",
    index=False,
)
pd.DataFrame(sessions).to_csv(
    demo / "venture-sessions-demo-synthetic.csv",
    index=False,
)

print(f"Synthetic practice exports written to {demo}")
print("Do not use them as real Venture evidence.")
