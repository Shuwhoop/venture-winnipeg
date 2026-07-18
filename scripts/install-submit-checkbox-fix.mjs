import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";

import {
  dirname,
  join,
  resolve
} from "node:path";


const projectRoot =
  process.cwd();

const appRoot =
  resolve(
    projectRoot,
    "app"
  );

const marker =
  "VENTURE SUBMIT CHECKBOX FIX 2026-07-18";


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
        entry !==
          ".next" &&
        entry !==
          "node_modules"
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


if (
  !existsSync(
    appRoot
  )
) {
  console.error(
    "Run this from the Venture project root."
  );

  process.exit(1);
}


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
    "Could not locate the public submission page."
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
    /import\s+(\w+)\s+from\s+["']\.\/([^"']+\.module\.css)["'];?/
  );


if (
  !cssImport
) {
  console.error(
    "Could not locate the submission CSS module."
  );

  process.exit(1);
}


const stylesAlias =
  cssImport[1];

const cssPath =
  resolve(
    dirname(
      pagePath
    ),
    cssImport[2]
  );

let css =
  readFileSync(
    cssPath,
    "utf8"
  );


const mainClass =
  page.match(
    new RegExp(
      `<main[^>]*className=\\{\\s*${stylesAlias}\\.(\\w+)\\s*\\}`,
      "m"
    )
  )?.[1] ??
  "page";


const patch =
  `\n\n/* ${marker} */\n` +
  `.${mainClass} input[type="checkbox"],\n` +
  `.${mainClass} input[type="radio"] {\n` +
  `  width: 20px !important;\n` +
  `  min-width: 20px !important;\n` +
  `  max-width: 20px !important;\n` +
  `  height: 20px !important;\n` +
  `  min-height: 20px !important;\n` +
  `  margin: 1px 0 0 !important;\n` +
  `  padding: 0 !important;\n` +
  `  flex: 0 0 20px !important;\n` +
  `  accent-color: #d01013;\n` +
  `  cursor: pointer;\n` +
  `}\n\n` +
  `.${mainClass} label:has(input[type="checkbox"]),\n` +
  `.${mainClass} label:has(input[type="radio"]) {\n` +
  `  display: flex !important;\n` +
  `  flex-direction: row !important;\n` +
  `  align-items: flex-start !important;\n` +
  `  justify-content: flex-start !important;\n` +
  `  gap: 12px !important;\n` +
  `  width: 100% !important;\n` +
  `  max-width: 100% !important;\n` +
  `  text-align: left !important;\n` +
  `  cursor: pointer;\n` +
  `}\n\n` +
  `.${mainClass} label:has(input[type="checkbox"]) > *,\n` +
  `.${mainClass} label:has(input[type="radio"]) > * {\n` +
  `  min-width: 0;\n` +
  `}\n\n` +
  `.${mainClass} label:has(input[type="checkbox"]) span,\n` +
  `.${mainClass} label:has(input[type="radio"]) span {\n` +
  `  width: auto !important;\n` +
  `  max-width: 100% !important;\n` +
  `  margin: 0 !important;\n` +
  `  line-height: 1.45;\n` +
  `  overflow-wrap: anywhere;\n` +
  `}\n`;


if (
  !css.includes(
    marker
  )
) {
  const backupPath =
    `${cssPath}.before-checkbox-fix.bak`;

  if (
    !existsSync(
      backupPath
    )
  ) {
    writeFileSync(
      backupPath,
      css,
      "utf8"
    );
  }

  css +=
    patch;

  writeFileSync(
    cssPath,
    css,
    "utf8"
  );
}


console.log(
  "Venture submit checkbox fix installed."
);
