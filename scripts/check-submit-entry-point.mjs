import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync
} from "node:fs";

import {
  join,
  resolve
} from "node:path";


const root =
  process.cwd();

const requiredFiles = [
  "components/submit-listing-entry/submit-listing-entry.tsx",
  "components/submit-listing-entry/submit-listing-entry.module.css"
];


let failed =
  false;


for (
  const relativePath
  of requiredFiles
) {
  const fullPath =
    resolve(
      root,
      relativePath
    );

  if (
    !existsSync(
      fullPath
    )
  ) {
    console.error(
      `MISSING: ${relativePath}`
    );

    failed =
      true;
  }
}


function walk(
  directory
) {
  const output =
    [];

  for (
    const entry
    of readdirSync(
      directory
    )
  ) {
    const path =
      join(
        directory,
        entry
      );

    const stats =
      statSync(
        path
      );

    if (
      stats.isDirectory()
    ) {
      if (
        entry !== ".next" &&
        entry !== "node_modules"
      ) {
        output.push(
          ...walk(path)
        );
      }

      continue;
    }

    output.push(path);
  }

  return output;
}


const appRoot =
  resolve(
    root,
    "app"
  );

const pages =
  walk(appRoot)
    .filter(
      (path) =>
        path.endsWith(
          "page.tsx"
        )
    );


const installedPages =
  pages.filter(
    (path) =>
      readFileSync(
        path,
        "utf8"
      ).includes(
        "<SubmitListingEntry"
      )
  );


if (
  installedPages.length <
  1
) {
  console.error(
    "ENTRY CHECK FAILED: no page contains the submit-listing entry component."
  );

  failed =
    true;
}


const cssPath =
  resolve(
    root,
    "components/submit-listing-entry/submit-listing-entry.module.css"
  );


if (
  existsSync(cssPath)
) {
  const css =
    readFileSync(
      cssPath,
      "utf8"
    );

  for (
    const required
    of [
      "container-type: inline-size",
      "overflow-wrap: normal",
      "word-break: normal",
      "max-width: 100%",
      "@container (max-width: 360px)"
    ]
  ) {
    if (
      !css.includes(
        required
      )
    ) {
      console.error(
        `LAYOUT CHECK FAILED: ${required}`
      );

      failed =
        true;
    }
  }
}


if (failed) {
  process.exitCode =
    1;
} else {
  console.log(
    `Submit entry-point checks passed on ${installedPages.length} page(s).`
  );
}
