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

const componentPath =
  resolve(
    root,
    "components/saved-empty-state/saved-empty-state.tsx"
  );

const cssPath =
  resolve(
    root,
    "components/saved-empty-state/saved-empty-state.module.css"
  );

let failed =
  false;


for (
  const path
  of [
    componentPath,
    cssPath
  ]
) {
  if (
    !existsSync(path)
  ) {
    console.error(
      `MISSING: ${path}`
    );

    failed =
      true;
  }
}


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
    const path =
      join(
        directory,
        entry
      );

    const stats =
      statSync(path);

    if (
      stats.isDirectory()
    ) {
      if (
        entry !== ".next" &&
        entry !== "node_modules"
      ) {
        results.push(
          ...walk(path)
        );
      }

      continue;
    }

    results.push(path);
  }

  return results;
}


const appRoot =
  resolve(
    root,
    "app"
  );

const savedPage =
  walk(appRoot)
    .find(
      (path) =>
        /(?:^|[\\/])saved[\\/]page\.tsx$/i.test(
          path
        )
    );


if (!savedPage) {
  console.error(
    "CHECK FAILED: Saved page not found."
  );

  failed =
    true;
} else {
  const source =
    readFileSync(
      savedPage,
      "utf8"
    );

  for (
    const required
    of [
      "SavedEmptyState",
      "<SavedEmptyState"
    ]
  ) {
    if (
      !source.includes(
        required
      )
    ) {
      console.error(
        `PAGE CHECK FAILED: ${required}`
      );

      failed =
        true;
    }
  }
}


if (
  existsSync(
    componentPath
  )
) {
  const component =
    readFileSync(
      componentPath,
      "utf8"
    );

  for (
    const required
    of [
      'href="/build"',
      'href="/explore"',
      "Nothing saved yet",
      "activities.map"
    ]
  ) {
    if (
      !component.includes(
        required
      )
    ) {
      console.error(
        `COMPONENT CHECK FAILED: ${required}`
      );

      failed =
        true;
    }
  }
}


if (
  existsSync(
    cssPath
  )
) {
  const css =
    readFileSync(
      cssPath,
      "utf8"
    );

  for (
    const required
    of [
      "place-items: center",
      "container-type: inline-size",
      "max-width: 100%",
      "overflow-wrap: normal",
      "prefers-reduced-motion",
      "@keyframes activityFloat"
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
    "Saved empty-state checks passed."
  );
}
