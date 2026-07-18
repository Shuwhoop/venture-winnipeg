import {
  existsSync,
  readFileSync
} from "node:fs";

import {
  resolve
} from "node:path";


const projectRoot =
  process.cwd();

const requiredFiles = [
  "app/admin/submissions/layout.tsx",
  "app/admin/submissions/admin-layout.module.css",
  "app/admin/submissions/history/page.tsx",
  "app/admin/submissions/history/actions.ts",
  "app/admin/submissions/history/page.module.css"
];


let failed =
  false;


for (
  const relativePath
  of requiredFiles
) {
  const fullPath =
    resolve(
      projectRoot,
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
  } else {
    console.log(
      `FOUND: ${relativePath}`
    );
  }
}


const actionsPath =
  resolve(
    projectRoot,
    "app/admin/submissions/history/actions.ts"
  );

const pagePath =
  resolve(
    projectRoot,
    "app/admin/submissions/history/page.tsx"
  );

const cssPath =
  resolve(
    projectRoot,
    "app/admin/submissions/history/page.module.css"
  );


if (
  existsSync(
    actionsPath
  )
) {
  const actions =
    readFileSync(
      actionsPath,
      "utf8"
    );

  if (
    !actions.includes(
      "await requireVentureAdmin();"
    )
  ) {
    console.error(
      "SECURITY CHECK FAILED: history actions do not require an admin."
    );

    failed =
      true;
  }

  if (
    actions.includes(
      'process.env.NODE_ENV === "production"'
    )
  ) {
    console.error(
      "SECURITY CHECK FAILED: a temporary local-only guard remains."
    );

    failed =
      true;
  }
}


if (
  existsSync(
    pagePath
  )
) {
  const page =
    readFileSync(
      pagePath,
      "utf8"
    );

  for (
    const expected
    of [
      "approved",
      "rejected",
      "Reopen for review",
      "PAGE_SIZE"
    ]
  ) {
    if (
      !page.includes(
        expected
      )
    ) {
      console.error(
        `PAGE CHECK FAILED: missing ${expected}`
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
    const expected
    of [
      "overflow-wrap: anywhere",
      "min-width: 0",
      "@media (max-width: 700px)",
      "white-space: normal"
    ]
  ) {
    if (
      !css.includes(
        expected
      )
    ) {
      console.error(
        `RESPONSIVE CHECK FAILED: missing ${expected}`
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
    "\nAdmin history package checks passed."
  );
}
