VENTURE OUTING CREATOR V3

This upgrade turns Build an Outing into a route creator built around
Venture's published restaurant, event, and drinks data.

WHAT USERS CAN DO

1. Surprise route
   Choose one to five stops and the categories Venture may use. The
   generator randomly chooses from the strongest verified matches, so
   rebuilding can produce a different good route rather than repeating
   the same answer every time.

2. Exact stop mix
   Choose exactly how many food, event, and drinks stops the outing
   should contain, up to five total stops.

3. Start with an existing listing
   Search published Venture restaurants, events, and drinks places,
   choose one starting point, and select which additional stop types
   should be built around it.

4. Extend an existing generated plan
   Add another food, event, or drinks stop from the results page. Venture
   searches for an available gap and recalculates stop order and travel.

5. Edit without destroying the plan
   Lock important stops, replace one stop, or refresh every unlocked
   stop while keeping the locked parts.

SOLO AND GROUP LOGIC

Solo routes ask about:
- solo mood
- preferred pace
- comfortable independent experiences

Group routes ask about:
- group size
- occasion
- whether consensus, budget, or minimal travel matters most

The two flows no longer repeat the same follow-up screen.

RESULTS PAGE

- The route map appears first.
- A horizontal stop preview appears above the map.
- Save, Share, and Refresh actions appear immediately after the map.
- Summary and detailed itinerary follow the route overview.
- Each stop has a category badge, reason, lock control, replace control,
  and listing link.
- Users can add Food, Event, or Drinks stops to the current plan.

DATA AND TRUST

The builder uses the existing published Venture data functions:
- getPublishedEventListings
- getPublishedPlaceListings

Only official_source, verified_venture, and verified_business records are
shown as starting-point choices. The existing generator also continues
to enforce hours, event times, budget, transportation, and travel limits.

PERSISTENT SUBMISSION CARD

The Submit a Listing entry component is removed from the outing wizard.
The wizard now ends with only its own Back and Continue/Create controls.
The public submission entry still remains on Home and Profile.

INSTALL

1. Extract this ZIP into:

C:\Users\ppmal\Documents\Projects\venture-production-starter-v0.1

2. Run from the project root:

node .\scripts\install-outing-creator-v3.mjs

The installer backs up every replaced file under:

venture-backups\outing-creator-v3-<timestamp>

3. Run the package checks:

node .\scripts\check-outing-creator-v3.mjs

4. Run the real Next.js check:

npm run build

5. Start locally:

npm run dev

6. Open:

http://localhost:3000/build-outing

TEST ROUTES

A. Surprise solo outing
- Solo
- Surprise me
- 2 or 3 stops
- Choose a solo mood and pace
- Generate twice and confirm the plan can vary among strong matches

B. Exact group mix
- Group
- Choose my mix
- 1 food, 1 event, 1 drinks
- Select group size and occasion
- Confirm the results show the requested and actual mix

C. Existing starting point
- Start with a place
- Search for a published event or restaurant
- Select it
- Add food, event, or drinks counts
- Confirm the chosen listing remains in the generated route

D. Edit the result
- Confirm the map appears before the summary and itinerary
- Lock one stop
- Refresh unlocked stops
- Replace one unlocked stop
- Add another category stop
- Confirm Save, Share, Google Maps, and listing links still work
