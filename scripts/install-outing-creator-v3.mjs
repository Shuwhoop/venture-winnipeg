import {
  copyFileSync,
  existsSync,
  mkdirSync
} from "node:fs";

import {
  dirname,
  relative,
  resolve
} from "node:path";


const projectRoot =
  process.cwd();

const payloadRoot =
  resolve(
    projectRoot,
    "venture-outing-creator-v3-package/payload"
  );

const targets = [
  "app/build-outing/page.tsx",
  "app/build-outing/results/page.tsx",
  "app/api/outings/options/route.ts",
  "app/api/outings/generate/route.ts",
  "app/api/outings/generate/replace-stop/route.ts",
  "app/api/outings/generate/add-stop/route.ts",
  "components/outing-route-map.tsx",
  "lib/saved-outings.ts",
  "app/globals.css"
];


function timestamp() {
  const date =
    new Date();

  const pad =
    (value) =>
      String(value)
        .padStart(
          2,
          "0"
        );

  return [
    date.getFullYear(),
    pad(
      date.getMonth() + 1
    ),
    pad(
      date.getDate()
    )
  ].join("") +
    "-" +
    [
      pad(
        date.getHours()
      ),
      pad(
        date.getMinutes()
      ),
      pad(
        date.getSeconds()
      )
    ].join("");
}


if (
  !existsSync(
    resolve(
      projectRoot,
      "app"
    )
  ) ||
  !existsSync(
    payloadRoot
  )
) {
  console.error(
    "Run this installer from the Venture project root after extracting the ZIP."
  );

  process.exit(1);
}


for (
  const target
  of targets
) {
  const sourcePath =
    resolve(
      payloadRoot,
      target
    );

  if (
    !existsSync(
      sourcePath
    )
  ) {
    console.error(
      `INSTALL FAILED: payload is missing ${target}`
    );

    process.exit(1);
  }
}


const backupRoot =
  resolve(
    projectRoot,
    "venture-backups",
    `outing-creator-v3-${timestamp()}`
  );


for (
  const target
  of targets
) {
  const sourcePath =
    resolve(
      payloadRoot,
      target
    );

  const targetPath =
    resolve(
      projectRoot,
      target
    );

  if (
    existsSync(
      targetPath
    )
  ) {
    const backupPath =
      resolve(
        backupRoot,
        target
      );

    mkdirSync(
      dirname(
        backupPath
      ),
      {
        recursive: true
      }
    );

    copyFileSync(
      targetPath,
      backupPath
    );
  }

  mkdirSync(
    dirname(
      targetPath
    ),
    {
      recursive: true
    }
  );

  copyFileSync(
    sourcePath,
    targetPath
  );

  console.log(
    `INSTALLED: ${relative(projectRoot, targetPath)}`
  );
}


console.log(
  `\nBACKUP: ${relative(projectRoot, backupRoot)}`
);

console.log(
  "Venture Outing Creator V3 installed."
);
