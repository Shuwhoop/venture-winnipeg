VENTURE BUILD AN OUTING INTELLIGENCE UPGRADE

This package was built against the current files supplied from the
Venture project.

WHAT IT ADDS

BUILDER

- Group-size selector from 2 to 12 people.
- Per-person budget remains unchanged.
- Must-include preferences, entered as comma-separated terms.
- Avoid preferences, entered as comma-separated terms.
- Maximum travel time per leg:
  10, 20, 35, or 60 minutes.
- Expanded review screen showing:
  party size, travel comfort, must-include terms, and avoid terms.
- Mobile-safe controls and text wrapping.

GENERATOR

- Strongly prioritizes must-include terms.
- Filters listings that clearly match avoid terms.
- Enforces the selected maximum travel time between stops.
- Returns party-size and group-total information.
- Adds a warning when a requested must-include term could not be found.
- Keeps verified-listing, opening-hours, event-time, budget, and
  transportation checks.

RESULTS

- Shows people count.
- Shows per-person and estimated group totals.
- Shows maximum travel time.
- Lock or unlock every stop.
- Replace one unlocked stop without rebuilding the whole outing.
- Refresh every unlocked stop while preserving locked stops.
- Keeps replaced listings out of later replacement attempts.
- Preserves Save, Share, Map, warnings, and listing links.

RESPONSIVE SAFETY

- Uses the actual Venture container width.
- Long headings do not break into vertical letter stacks.
- Buttons, notes, summaries, inputs, and stop controls remain inside
  the page.
- Reduced-motion settings are respected.

INSTALL

Extract into:

C:\Users\ppmal\Documents\Projects\venture-production-starter-v0.1

The ZIP replaces:

app/build-outing/page.tsx
app/build-outing/results/page.tsx
app/api/outings/generate/route.ts
app/api/outings/generate/replace-stop/route.ts
lib/saved-outings.ts
app/globals.css

It also adds:

scripts/check-build-outing-intelligence.mjs

CHECK

node .\scripts\check-build-outing-intelligence.mjs

FULL BUILD

npm run build

LOCAL TEST

npm run dev

Open:

http://localhost:3000/build-outing

TEST CHECKLIST

1. Select Group and change the number of people.
2. Add a must-include term, such as sushi.
3. Add an avoid term, such as nightclub.
4. Choose a maximum travel time.
5. Generate the outing.
6. Confirm per-person and group estimates appear.
7. Lock one stop.
8. Press Refresh unlocked.
9. Confirm the locked stop remains.
10. Replace one individual unlocked stop.
11. Confirm Save, Share, Map, and listing links still work.

OLDER SAVED OUTINGS

The new fields are optional in the saved-outing type, so older saved
plans remain readable.
