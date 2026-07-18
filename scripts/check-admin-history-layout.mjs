import {
  existsSync,
  readFileSync
} from "node:fs";

import {
  resolve
} from "node:path";


const files = {
  history:
    resolve(
      process.cwd(),
      "app/admin/submissions/history/page.module.css"
    ),

  layout:
    resolve(
      process.cwd(),
      "app/admin/submissions/admin-layout.module.css"
    )
};


let failed =
  false;


for (
  const [name, path]
  of Object.entries(files)
) {
  if (
    !existsSync(path)
  ) {
    console.error(
      `MISSING: ${name} stylesheet`
    );

    failed =
      true;
  }
}


if (
  existsSync(
    files.history
  )
) {
  const history =
    readFileSync(
      files.history,
      "utf8"
    );

  const requiredHistoryRules = [
    "container-type: inline-size",
    "12cqw",
    "overflow-wrap: normal",
    "word-break: normal",
    "grid-template-columns: 1fr",
    "@container (min-width: 520px)",
    "@container (min-width: 760px)"
  ];

  for (
    const rule
    of requiredHistoryRules
  ) {
    if (
      !history.includes(
        rule
      )
    ) {
      console.error(
        `HISTORY LAYOUT CHECK FAILED: ${rule}`
      );

      failed =
        true;
    }
  }
}


if (
  existsSync(
    files.layout
  )
) {
  const layout =
    readFileSync(
      files.layout,
      "utf8"
    );

  const requiredLayoutRules = [
    "grid-column: 1 / -1",
    "text-overflow: ellipsis",
    "repeat(3, minmax(0, 1fr))",
    "white-space: normal"
  ];

  for (
    const rule
    of requiredLayoutRules
  ) {
    if (
      !layout.includes(
        rule
      )
    ) {
      console.error(
        `ADMIN BAR CHECK FAILED: ${rule}`
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
    "Admin history responsive-layout checks passed."
  );
}
