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


const root =
  process.cwd();

const appRoot =
  resolve(
    root,
    "app"
  );

const componentImport =
  'import SubmitListingEntry from "@/components/submit-listing-entry/submit-listing-entry";';

const marker =
  "SubmitListingEntry";


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


function backup(
  path
) {
  const backupPath =
    `${path}.before-submit-entry.bak`;

  if (
    !existsSync(
      backupPath
    )
  ) {
    writeFileSync(
      backupPath,
      readFileSync(
        path,
        "utf8"
      ),
      "utf8"
    );
  }
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

  if (
    source.startsWith(
      '"use client";'
    ) ||
    source.startsWith(
      "'use client';"
    )
  ) {
    const end =
      source.indexOf(
        "\n"
      );

    return (
      source.slice(
        0,
        end + 1
      ) +
      "\n" +
      componentImport +
      "\n" +
      source.slice(
        end + 1
      )
    );
  }

  return (
    componentImport +
    "\n\n" +
    source
  );
}


function insertEntry(
  path,
  placement
) {
  let source =
    readFileSync(
      path,
      "utf8"
    );

  if (
    source.includes(
      `<SubmitListingEntry placement="${placement}"`
    )
  ) {
    console.log(
      `UNCHANGED: ${relative(root, path)}`
    );

    return;
  }

  const mainClose =
    source.lastIndexOf(
      "</main>"
    );

  if (
    mainClose ===
    -1
  ) {
    console.warn(
      `SKIPPED: ${relative(root, path)} has no </main>.`
    );

    return;
  }

  backup(path);

  source =
    addImport(source);

  const updatedClose =
    source.lastIndexOf(
      "</main>"
    );

  const block =
    `\n      <SubmitListingEntry placement="${placement}" />\n    `;

  source =
    source.slice(
      0,
      updatedClose
    ) +
    block +
    source.slice(
      updatedClose
    );

  writeFileSync(
    path,
    source,
    "utf8"
  );

  console.log(
    `UPDATED: ${relative(root, path)}`
  );
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


const files =
  walk(appRoot)
    .filter(
      (path) =>
        path.endsWith(
          "page.tsx"
        )
    );


const homePage =
  files.find(
    (path) => {
      const source =
        readFileSync(
          path,
          "utf8"
        );

      return (
        source.includes(
          "What should we do tonight?"
        ) ||
        source.includes(
          "Build my outing"
        )
      );
    }
  ) ??
  files.find(
    (path) =>
      relative(
        appRoot,
        path
      ) ===
      "page.tsx"
  );


const profilePage =
  files.find(
    (path) =>
      /(?:^|[\\/])profile[\\/]page\.tsx$/i.test(
        path
      )
  );


if (
  !homePage
) {
  console.error(
    "Could not locate the Venture home page."
  );

  process.exit(1);
}


insertEntry(
  homePage,
  "home"
);


if (
  profilePage
) {
  insertEntry(
    profilePage,
    "profile"
  );
} else {
  console.warn(
    "Profile page was not found. Home entry point was still installed."
  );
}


console.log(
  "\nSubmit-listing entry points installed."
);
