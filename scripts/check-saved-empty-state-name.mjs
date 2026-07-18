import {
  existsSync,
  readFileSync
} from "node:fs";

import {
  resolve
} from "node:path";


const pagePath =
  resolve(
    process.cwd(),
    "app/saved/page.tsx"
  );


if (
  !existsSync(
    pagePath
  )
) {
  console.error(
    "Saved page not found."
  );

  process.exit(1);
}


const source =
  readFileSync(
    pagePath,
    "utf8"
  );


let failed =
  false;


const savedImports =
  source.match(
    /import\s+(?:type\s+)?[\s\S]*?\s+from\s+["'][^"']*saved-empty-state[^"']*["'];?/g
  ) ??
  [];


if (
  savedImports.length !==
  1
) {
  console.error(
    `IMPORT CHECK FAILED: expected 1 saved-empty-state import, found ${savedImports.length}.`
  );

  failed =
    true;
}


if (
  !source.includes(
    'import VentureSavedEmptyState from "@/components/saved-empty-state/saved-empty-state";'
  )
) {
  console.error(
    "IMPORT CHECK FAILED: unique VentureSavedEmptyState import is missing."
  );

  failed =
    true;
}


if (
  !source.includes(
    "<VentureSavedEmptyState"
  )
) {
  console.error(
    "JSX CHECK FAILED: VentureSavedEmptyState is not used."
  );

  failed =
    true;
}


if (
  /<SavedEmptyState\b/.test(
    source
  )
) {
  console.error(
    "JSX CHECK FAILED: old SavedEmptyState JSX usage remains."
  );

  failed =
    true;
}


if (failed) {
  process.exitCode =
    1;
} else {
  console.log(
    "Saved empty-state naming checks passed."
  );
}
