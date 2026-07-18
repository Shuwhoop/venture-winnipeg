import {
  existsSync,
  readFileSync,
  writeFileSync
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
  `${pagePath}.before-react-hooks-fix.bak`;


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


const usedHooks =
  hookNames.filter(
    (hook) =>
      new RegExp(
        `\\b${hook}\\s*(?:<|\\()`
      ).test(
        source
      )
  );


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
  const clause =
    match[1];

  const named =
    clause.match(
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


const missingHooks =
  usedHooks.filter(
    (hook) =>
      !importedHooks.has(
        hook
      )
  );


if (
  missingHooks.length ===
  0
) {
  console.log(
    "All React hooks used by the Saved page are already imported."
  );

  process.exit(0);
}


const namedReactImport =
  reactImports.find(
    (match) =>
      /\{[\s\S]*?\}/.test(
        match[1]
      )
  );


if (namedReactImport) {
  const fullImport =
    namedReactImport[0];

  const clause =
    namedReactImport[1];

  const updatedClause =
    clause.replace(
      /\{([\s\S]*?)\}/,
      (
        _match,
        names
      ) => {
        const existing =
          names
            .split(",")
            .map(
              (name) =>
                name.trim()
            )
            .filter(Boolean);

        const combined =
          Array.from(
            new Set([
              ...existing,
              ...missingHooks
            ])
          );

        return `{\n  ${combined.join(",\n  ")}\n}`;
      }
    );

  source =
    source.replace(
      fullImport,
      `import ${updatedClause} from "react";`
    );
} else {
  const newImport =
    `import {\n  ${missingHooks.join(",\n  ")}\n} from "react";`;

  const directive =
    source.match(
      /^["']use client["'];\s*/
    );

  if (directive) {
    source =
      source.slice(
        0,
        directive[0].length
      ) +
      "\n" +
      newImport +
      "\n\n" +
      source.slice(
        directive[0].length
      );
  } else {
    source =
      newImport +
      "\n\n" +
      source;
  }
}


writeFileSync(
  pagePath,
  source,
  "utf8"
);


console.log(
  `Restored React hooks: ${missingHooks.join(", ")}`
);
