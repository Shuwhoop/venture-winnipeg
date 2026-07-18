VENTURE SUBMIT ENTRY POINT

Adds a public path into the existing submission system.

PLACEMENTS

- Home page
- Profile page, when found

CARD CONTENT

- "Know something worth discovering?"
- Explains that restaurants and events can be submitted
- Explains that every submission is reviewed
- Links directly to /submit

LAYOUT

The card is mobile-first and uses its own container width. Long text,
buttons, and headings remain inside the Venture phone frame.

INSTALL

Extract into the Venture project root.

Then run:

node .\scripts\install-submit-entry-point.mjs

CHECK

node .\scripts\check-submit-entry-point.mjs

BUILD

npm run build

LOCAL TEST

npm run dev

Open:

http://localhost:3000

and:

http://localhost:3000/profile

The new card should open:

http://localhost:3000/submit
