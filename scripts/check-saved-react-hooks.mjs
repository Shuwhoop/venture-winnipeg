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


const hookNames = [
  "useState",
  "useEffect",
  "useMemo",
  "useCallback",
  "useRef",
  "useReducer",
  "useTransition",
  "useDeferredValue",
  "useId"
];


const reactImports =
  Array.from(
    source.matchAll(
      /import\s+([\s\S]*?)\s+from\s+["']react["'];?/g
    )
  );


const importedHooks =
  new Set();


for (
  const match
  of reactImports
) {
  const named =
    match[1].match(
      /\{([\s\S]*?)\}/
    );

  if (!named) {
    continue;
  }

  for (
    const part
    of named[1].split(",")
  ) {
    const cleaned =
      part
        .trim()
        .split(/\s+as\s+/)[0]
        ?.trim();

    if (cleaned) {
      importedHooks.add(
        cleaned
      );
    }
  }
}


let failed =
  false;


for (
  const hook
  of hookNames
) {
  const used =
    new RegExp(
      `\\b${hook}\\s*(?:<|\\()`
    ).test(
      source
    );

  if (
    used &&
    !importedHooks.has(
      hook
    )
  ) {
    console.error(
      `HOOK CHECK FAILED: ${hook} is used but not imported.`
    );

    failed =
      true;
  }
}


if (
  !source.includes(
    "VentureSavedEmptyState"
  )
) {
  console.error(
    "COMPONENT CHECK FAILED: VentureSavedEmptyState is missing."
  );

  failed =
    true;
}


if (failed) {
  process.exitCode =
    1;
} else {
  console.log(
    "Saved page React-hook checks passed."
  );
}
