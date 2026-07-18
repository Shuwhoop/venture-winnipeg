import {
  existsSync,
  readFileSync,
  writeFileSync
} from "node:fs";

import {
  resolve
} from "node:path";


const projectRoot =
  process.cwd();

const pagePath =
  resolve(
    projectRoot,
    "app/saved/page.tsx"
  );

const replacementImport =
  'import VentureSavedEmptyState from "@/components/saved-empty-state/saved-empty-state";';


if (
  !existsSync(
    pagePath
  )
) {
  console.error(
    "Could not find app/saved/page.tsx. Run this from the Venture project root."
  );

  process.exit(1);
}


let source =
  readFileSync(
    pagePath,
    "utf8"
  );


const backupPath =
  `${pagePath}.before-name-fix.bak`;


if (
  !existsSync(
    backupPath
  )
) {
  writeFileSync(
    backupPath,
    source,
    "utf8"
  );
}


/*
 * Remove every import that points to a
 * saved-empty-state module. This clears
 * the old named import and the new
 * default import before adding exactly
 * one unambiguous import.
 */
source =
  source.replace(
    /import\s+(?:type\s+)?[\s\S]*?\s+from\s+["'][^"']*saved-empty-state[^"']*["'];?\s*/g,
    ""
  );


/*
 * Add the uniquely named import after
 * "use client" when present.
 */
const clientDirective =
  source.match(
    /^["']use client["'];\s*/
  );


if (clientDirective) {
  source =
    source.slice(
      0,
      clientDirective[0].length
    ) +
    "\n" +
    replacementImport +
    "\n\n" +
    source.slice(
      clientDirective[0].length
    );
} else {
  source =
    replacementImport +
    "\n\n" +
    source;
}


/*
 * Only rename JSX usage. Any pre-existing
 * local function named SavedEmptyState
 * can remain untouched.
 */
source =
  source
    .replace(
      /<SavedEmptyState\b/g,
      "<VentureSavedEmptyState"
    )
    .replace(
      /<\/SavedEmptyState>/g,
      "</VentureSavedEmptyState>"
    );


writeFileSync(
  pagePath,
  source,
  "utf8"
);


console.log(
  "Saved empty-state naming conflict fixed."
);
