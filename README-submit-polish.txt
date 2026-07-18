VENTURE SUBMIT POLISH

This package fixes the public submission page before adding its public
entry point.

CHANGES

1. Submit-page text safety
   - Uses the actual Venture container width.
   - Prevents headings from breaking into vertical word fragments.
   - Prevents labels, descriptions, URLs, emails, and notes from leaving
     the page.
   - Makes controls respect the available width.
   - Adds a narrow-container heading size.

2. Optional URLs
   - Removes required validation from URL-style form fields.
   - Marks common URL labels as optional.
   - Removes obvious required-URL server checks.
   - Keeps URL-format validation when a URL is actually supplied.
   - Stores a blank source URL as null where applicable.

3. Safety
   - Finds the active files by their content rather than assuming only
     one exact folder layout.
   - Creates .before-submit-polish.bak backups.
   - Includes a static checker.
   - The full Next.js build remains the final test.

INSTALL

From the Venture project root:

node .\scripts\install-submit-polish.mjs

STATIC CHECK

node .\scripts\check-submit-polish.mjs

FULL BUILD

npm run build

LOCAL TEST

npm run dev

Open:

http://localhost:3000/submit

Test one restaurant and one event with every URL field left blank.

The submission should succeed and each success reference should appear
in the secure review queue.
