import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";

import {
  join,
  relative,
  resolve
} from "node:path";


const projectRoot =
  process.cwd();

const appRoot =
  resolve(
    projectRoot,
    "app"
  );

const componentImport =
  'import SavedEmptyState from "@/components/saved-empty-state/saved-empty-state";';


function walk(
  directory
) {
  const results =
    [];

  for (
    const entry
    of readdirSync(
      directory
    )
  ) {
    const fullPath =
      join(
        directory,
        entry
      );

    const stats =
      statSync(
        fullPath
      );

    if (
      stats.isDirectory()
    ) {
      if (
        entry !== ".next" &&
        entry !== "node_modules"
      ) {
        results.push(
          ...walk(
            fullPath
          )
        );
      }

      continue;
    }

    results.push(
      fullPath
    );
  }

  return results;
}


function addImport(
  source
) {
  if (
    source.includes(
      componentImport
    )
  ) {
    return source;
  }

  const directive =
    source.match(
      /^["']use client["'];\s*/
    );

  if (directive) {
    return (
      source.slice(
        0,
        directive[0].length
      ) +
      "\n" +
      componentImport +
      "\n\n" +
      source.slice(
        directive[0].length
      )
    );
  }

  return (
    componentImport +
    "\n\n" +
    source
  );
}


function findReturnRange(
  source,
  phraseIndex
) {
  const returnPattern =
    /\breturn\s*\(/g;

  let match;

  let returnStart =
    -1;

  let openParen =
    -1;

  while (
    (
      match =
        returnPattern.exec(
          source
        )
    ) !== null
  ) {
    if (
      match.index >
      phraseIndex
    ) {
      break;
    }

    returnStart =
      match.index;

    openParen =
      source.indexOf(
        "(",
        match.index
      );
  }

  if (
    returnStart ===
      -1 ||
    openParen ===
      -1
  ) {
    return null;
  }

  let depth =
    0;

  let quote =
    null;

  let escaped =
    false;

  let lineComment =
    false;

  let blockComment =
    false;

  for (
    let index =
      openParen;
    index <
      source.length;
    index += 1
  ) {
    const character =
      source[index];

    const next =
      source[index + 1];

    if (
      lineComment
    ) {
      if (
        character === "\n"
      ) {
        lineComment =
          false;
      }

      continue;
    }

    if (
      blockComment
    ) {
      if (
        character === "*" &&
        next === "/"
      ) {
        blockComment =
          false;

        index += 1;
      }

      continue;
    }

    if (quote) {
      if (escaped) {
        escaped =
          false;

        continue;
      }

      if (
        character === "\\"
      ) {
        escaped =
          true;

        continue;
      }

      if (
        character === quote
      ) {
        quote =
          null;
      }

      continue;
    }

    if (
      character === "/" &&
      next === "/"
    ) {
      lineComment =
        true;

      index += 1;

      continue;
    }

    if (
      character === "/" &&
      next === "*"
    ) {
      blockComment =
        true;

      index += 1;

      continue;
    }

    if (
      character === '"' ||
      character === "'" ||
      character === "`"
    ) {
      quote =
        character;

      continue;
    }

    if (
      character === "("
    ) {
      depth += 1;

      continue;
    }

    if (
      character === ")"
    ) {
      depth -= 1;

      if (
        depth === 0
      ) {
        let end =
          index + 1;

        while (
          /\s/.test(
            source[end] ??
            ""
          )
        ) {
          end += 1;
        }

        if (
          source[end] ===
          ";"
        ) {
          end += 1;
        }

        return {
          start:
            returnStart,

          end
        };
      }
    }
  }

  return null;
}


if (
  !existsSync(
    appRoot
  )
) {
  console.error(
    "Run this installer from the Venture project root."
  );

  process.exit(1);
}


const pageFiles =
  walk(
    appRoot
  ).filter(
    (path) =>
      path.endsWith(
        "page.tsx"
      )
  );


const savedPage =
  pageFiles.find(
    (path) =>
      /(?:^|[\\/])saved[\\/]page\.tsx$/i.test(
        path
      )
  ) ??
  pageFiles.find(
    (path) =>
      readFileSync(
        path,
        "utf8"
      ).includes(
        "Nothing saved yet"
      )
  );


if (
  !savedPage
) {
  console.error(
    "Could not locate the active Saved page."
  );

  process.exit(1);
}


let source =
  readFileSync(
    savedPage,
    "utf8"
  );


if (
  source.includes(
    "<SavedEmptyState"
  )
) {
  console.log(
    "Saved empty state is already installed."
  );

  process.exit(0);
}


const phraseIndex =
  source.indexOf(
    "Nothing saved yet"
  );


if (
  phraseIndex ===
  -1
) {
  console.error(
    "The Saved page was found, but its empty-state text was not found."
  );

  process.exit(1);
}


const range =
  findReturnRange(
    source,
    phraseIndex
  );


if (!range) {
  console.error(
    "Could not isolate the existing empty-state return block."
  );

  process.exit(1);
}


const backupPath =
  `${savedPage}.before-empty-state.bak`;


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


source =
  addImport(
    source
  );


const importGrowth =
  source.length -
  readFileSync(
    savedPage,
    "utf8"
  ).length;


const adjustedStart =
  range.start +
  importGrowth;

const adjustedEnd =
  range.end +
  importGrowth;


source =
  source.slice(
    0,
    adjustedStart
  ) +
  "return <SavedEmptyState />;" +
  source.slice(
    adjustedEnd
  );


writeFileSync(
  savedPage,
  source,
  "utf8"
);


console.log(
  `UPDATED: ${relative(projectRoot, savedPage)}`
);

console.log(
  "Saved empty-state installer completed."
);
