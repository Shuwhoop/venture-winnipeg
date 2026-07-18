import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync
} from "node:fs";

import {
  dirname,
  join,
  resolve
} from "node:path";


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


const appRoot =
  resolve(
    process.cwd(),
    "app"
  );

const files =
  walk(
    appRoot
  );

const pagePath =
  files.find(
    (path) =>
      path.endsWith(
        "page.tsx"
      ) &&
      readFileSync(
        path,
        "utf8"
      ).includes(
        "Add something worth"
      )
  );


if (
  !pagePath
) {
  console.error(
    "Submit page not found."
  );

  process.exit(1);
}


const page =
  readFileSync(
    pagePath,
    "utf8"
  );

const cssImport =
  page.match(
    /import\s+\w+\s+from\s+["']\.\/([^"']+\.module\.css)["'];?/
  );


if (
  !cssImport
) {
  console.error(
    "Submit CSS module not found."
  );

  process.exit(1);
}


const cssPath =
  resolve(
    dirname(
      pagePath
    ),
    cssImport[1]
  );

const css =
  readFileSync(
    cssPath,
    "utf8"
  );

const required = [
  "VENTURE SUBMIT CHECKBOX FIX 2026-07-18",
  'input[type="checkbox"]',
  "width: 20px !important",
  "display: flex !important",
  "gap: 12px !important"
];

let failed =
  false;

for (
  const item
  of required
) {
  if (
    !css.includes(
      item
    )
  ) {
    console.error(
      `CHECK FAILED: ${item}`
    );

    failed =
      true;
  }
}


if (failed) {
  process.exitCode =
    1;
} else {
  console.log(
    "Submit checkbox layout checks passed."
  );
}
