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

const marker =
  "VENTURE SUBMIT POLISH 2026-07-18";


function fail(
  message
) {
  console.error(
    `\nINSTALL FAILED: ${message}`
  );

  process.exit(1);
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
        entry ===
          "node_modules" ||
        entry ===
          ".next"
      ) {
        continue;
      }

      results.push(
        ...walk(
          fullPath
        )
      );

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
  fail(
    "Run this script from the Venture project root."
  );
}


const allAppFiles =
  walk(
    appRoot
  );


const submitPagePath =
  allAppFiles.find(
    (filePath) => {
      if (
        !filePath.endsWith(
          "page.tsx"
        )
      ) {
        return false;
      }

      const content =
        readFileSync(
          filePath,
          "utf8"
        );

      return (
        content.includes(
          "Add something worth"
        ) &&
        content.includes(
          "/api/submissions"
        )
      );
    }
  ) ??
  allAppFiles.find(
    (filePath) => {
      if (
        !filePath.endsWith(
          "page.tsx"
        )
      ) {
        return false;
      }

      const content =
        readFileSync(
          filePath,
          "utf8"
        );

      return (
        content.includes(
          "Share a restaurant"
        ) &&
        content.includes(
          "submission"
        )
      );
    }
  );


if (
  !submitPagePath
) {
  fail(
    "Could not locate the active public submission page."
  );
}


let submitPage =
  readFileSync(
    submitPagePath,
    "utf8"
  );


const cssImportMatch =
  submitPage.match(
    /import\s+(\w+)\s+from\s+["']\.\/([^"']+\.module\.css)["'];?/
  );


if (
  !cssImportMatch
) {
  fail(
    "Could not find the submission page CSS-module import."
  );
}


const stylesAlias =
  cssImportMatch[1];

const cssPath =
  resolve(
    dirname(
      submitPagePath
    ),
    cssImportMatch[2]
  );


if (
  !existsSync(
    cssPath
  )
) {
  fail(
    `The submit stylesheet was not found at ${relative(projectRoot, cssPath)}.`
  );
}


const apiRoutePath =
  allAppFiles.find(
    (filePath) => {
      if (
        !filePath.endsWith(
          "route.ts"
        )
      ) {
        return false;
      }

      const content =
        readFileSync(
          filePath,
          "utf8"
        );

      return (
        content.includes(
          "listing_submissions"
        ) &&
        content.includes(
          "export async function POST"
        )
      );
    }
  );


if (
  !apiRoutePath
) {
  fail(
    "Could not locate the listing-submission API route."
  );
}


let apiRoute =
  readFileSync(
    apiRoutePath,
    "utf8"
  );

let css =
  readFileSync(
    cssPath,
    "utf8"
  );


function backup(
  path
) {
  const backupPath =
    `${path}.before-submit-polish.bak`;

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


backup(
  submitPagePath
);

backup(
  cssPath
);

backup(
  apiRoutePath
);


/*
 * Identify the page wrapper and the
 * closest CSS-module class enclosing
 * the first h1.
 */
const mainClassMatch =
  submitPage.match(
    new RegExp(
      `<main[^>]*className=\\{\\s*${stylesAlias}\\.(\\w+)\\s*\\}`,
      "m"
    )
  );

const rootClass =
  mainClassMatch?.[1] ??
  "page";

const firstHeadingIndex =
  submitPage.indexOf(
    "<h1"
  );

let headingClass =
  "hero";

if (
  firstHeadingIndex >=
  0
) {
  const beforeHeading =
    submitPage.slice(
      Math.max(
        0,
        firstHeadingIndex -
          1800
      ),
      firstHeadingIndex
    );

  const classPattern =
    new RegExp(
      `className=\\{\\s*${stylesAlias}\\.(\\w+)\\s*\\}`,
      "g"
    );

  const classes =
    Array.from(
      beforeHeading.matchAll(
        classPattern
      )
    );

  headingClass =
    classes.at(-1)?.[1] ??
    headingClass;
}


/*
 * Make every URL-style field optional.
 * Reading the entire input tag catches
 * multiline JSX and browser-autofilled
 * fields without depending on one exact
 * formatting style.
 */
submitPage =
  submitPage.replace(
    /<input\b[\s\S]*?>/g,
    (tag) => {
      const isUrlInput =
        /type\s*=\s*["']url["']/i.test(
          tag
        ) ||
        /(?:name|id)\s*=\s*["'][^"']*(?:url|website|webSite|ticket)[^"']*["']/i.test(
          tag
        ) ||
        /inputMode\s*=\s*["']url["']/i.test(
          tag
        );

      if (
        !isUrlInput
      ) {
        return tag;
      }

      return tag
        .replace(
          /\s+required=\{true\}/g,
          ""
        )
        .replace(
          /\s+required(?=\s|\/?>)/g,
          ""
        );
    }
  );


/*
 * Clarify optional URL labels without
 * changing names already marked optional.
 */
const optionalLabelPatterns = [
  /\b(Source URL)(?!\s*\(optional\))/gi,
  /\b(Official website)(?!\s*\(optional\))/gi,
  /\b(Event website)(?!\s*\(optional\))/gi,
  /\b(Restaurant website)(?!\s*\(optional\))/gi,
  /\b(Ticket URL)(?!\s*\(optional\))/gi,
  /\b(Website URL)(?!\s*\(optional\))/gi
];

for (
  const pattern
  of optionalLabelPatterns
) {
  submitPage =
    submitPage.replace(
      pattern,
      "$1 (optional)"
    );
}


/*
 * Remove URL fields from quoted required
 * key lists. This handles code such as:
 * ["name", "sourceUrl", "email"].
 */
apiRoute =
  apiRoute
    .replace(
      /(["'])(sourceUrl|source_url|websiteUrl|website_url|officialUrl|official_url|ticketUrl|ticket_url)\1\s*,?/g,
      (match, quote, key, offset, fullText) => {
        const lineStart =
          fullText.lastIndexOf(
            "\n",
            offset
          ) + 1;

        const lineEndCandidate =
          fullText.indexOf(
            "\n",
            offset
          );

        const lineEnd =
          lineEndCandidate ===
          -1
            ? fullText.length
            : lineEndCandidate;

        const line =
          fullText.slice(
            lineStart,
            lineEnd
          );

        const likelyRequiredList =
          /required|missing|requiredFields|required_fields/i.test(
            line
          ) ||
          fullText
            .slice(
              Math.max(
                0,
                offset - 250
              ),
              offset
            )
            .match(
              /required|missing|requiredFields|required_fields/i
            );

        return likelyRequiredList
          ? ""
          : match;
      }
    );


/*
 * Change common Zod URL requirements
 * into optional URL-or-empty validation.
 */
apiRoute =
  apiRoute.replace(
    /((?:sourceUrl|source_url|websiteUrl|website_url|officialUrl|official_url|ticketUrl|ticket_url)\s*:\s*z\.string\(\)(?:\.trim\(\))?\.url\([^)]*\))(?![\s\S]{0,35}\.optional\(\))/g,
    "$1.optional().or(z.literal(\"\"))"
  );


function findJsonBodyVariable(
  content
) {
  const direct =
    content.match(
      /const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*as\s*[^;]+|await\s+\w+\.json\(\))/m
    );

  if (
    direct &&
    content.includes(
      `${direct[1]}.`
    )
  ) {
    return direct[1];
  }

  const sourceReceiver =
    content.match(
      /(\w+)\.(?:sourceUrl|source_url|websiteUrl|website_url|officialUrl|official_url|ticketUrl|ticket_url)/
    );

  return (
    sourceReceiver?.[1] ??
    "body"
  );
}


const bodyVariable =
  findJsonBodyVariable(
    apiRoute
  );


const urlVariables = [
  {
    variable:
      "sourceUrl",

    property:
      "sourceUrl"
  },
  {
    variable:
      "websiteUrl",

    property:
      "websiteUrl"
  },
  {
    variable:
      "officialUrl",

    property:
      "officialUrl"
  },
  {
    variable:
      "ticketUrl",

    property:
      "ticketUrl"
  },
  {
    variable:
      "source_url",

    property:
      "source_url"
  },
  {
    variable:
      "website_url",

    property:
      "website_url"
  },
  {
    variable:
      "official_url",

    property:
      "official_url"
  },
  {
    variable:
      "ticket_url",

    property:
      "ticket_url"
  }
];


/*
 * Replace required helper assignments for
 * URL values with safe optional strings.
 */
for (
  const {
    variable,
    property
  }
  of urlVariables
) {
  const declaration =
    new RegExp(
      `const\\s+${variable}\\s*=\\s*[\\s\\S]*?;`,
      "m"
    );

  const existing =
    apiRoute.match(
      declaration
    );

  if (
    !existing
  ) {
    continue;
  }

  const looksRequired =
    /required|requireString|must|missing/i.test(
      existing[0]
    );

  if (
    !looksRequired
  ) {
    continue;
  }

  apiRoute =
    apiRoute.replace(
      declaration,
      `const ${variable} =\n` +
      `    typeof ${bodyVariable}.${property} === "string"\n` +
      `      ? ${bodyVariable}.${property}.trim()\n` +
      `      : "";`
    );
}


/*
 * A required URL check normally looks
 * like if (!sourceUrl) { return error }.
 * Remove only blocks that contain both
 * URL language and required/missing
 * language, leaving all unrelated checks.
 */
function removeRequiredUrlBlocks(
  content
) {
  let output =
    content;

  const conditions = [
    "sourceUrl",
    "source_url",
    "websiteUrl",
    "website_url",
    "officialUrl",
    "official_url",
    "ticketUrl",
    "ticket_url"
  ];

  let changed =
    true;

  while (
    changed
  ) {
    changed =
      false;

    for (
      const variable
      of conditions
    ) {
      const startPattern =
        new RegExp(
          `if\\s*\\([^)]*!\\s*${variable}[^)]*\\)\\s*\\{`,
          "m"
        );

      const match =
        startPattern.exec(
          output
        );

      if (
        !match
      ) {
        continue;
      }

      const openBrace =
        output.indexOf(
          "{",
          match.index
        );

      let depth =
        0;

      let end =
        -1;

      for (
        let index =
          openBrace;
        index <
          output.length;
        index += 1
      ) {
        if (
          output[index] ===
          "{"
        ) {
          depth += 1;
        } else if (
          output[index] ===
          "}"
        ) {
          depth -= 1;

          if (
            depth ===
            0
          ) {
            end =
              index + 1;

            break;
          }
        }
      }

      if (
        end ===
        -1
      ) {
        continue;
      }

      const block =
        output.slice(
          match.index,
          end
        );

      const isRequiredError =
        /required|missing|must provide|please provide/i.test(
          block
        ) &&
        /url|website|source|ticket/i.test(
          block
        );

      if (
        !isRequiredError
      ) {
        continue;
      }

      output =
        output.slice(
          0,
          match.index
        ) +
        output.slice(
          end
        );

      changed =
        true;

      break;
    }
  }

  return output;
}


apiRoute =
  removeRequiredUrlBlocks(
    apiRoute
  );


/*
 * Preserve URL-format validation when a
 * value exists, but skip it when blank.
 */
for (
  const {
    variable
  }
  of urlVariables
) {
  const validators = [
    "isValidUrl",
    "isHttpUrl",
    "isUrl",
    "validUrl"
  ];

  for (
    const validator
    of validators
  ) {
    const validationPattern =
      new RegExp(
        `if\\s*\\(\\s*!\\s*${validator}\\(\\s*${variable}\\s*\\)\\s*\\)`,
        "g"
      );

    apiRoute =
      apiRoute.replace(
        validationPattern,
        `if (${variable} && !${validator}(${variable}))`
      );
  }
}


/*
 * Store blank source URLs as null when
 * the database object uses source_url.
 */
apiRoute =
  apiRoute.replace(
    /source_url\s*:\s*(sourceUrl|source_url)(?!\s*\|\|)/g,
    "source_url: $1 || null"
  );


const layoutPatch =
  `\n\n/* ${marker} */\n` +
  `.${rootClass} {\n` +
  `  container-type: inline-size;\n` +
  `  width: 100%;\n` +
  `  max-width: 100%;\n` +
  `  overflow-x: clip;\n` +
  `}\n\n` +
  `.${rootClass},\n` +
  `.${rootClass} * {\n` +
  `  min-width: 0;\n` +
  `  box-sizing: border-box;\n` +
  `}\n\n` +
  `.${headingClass} h1 {\n` +
  `  max-width: 100%;\n` +
  `  font-size: clamp(2.25rem, 12cqw, 3.35rem) !important;\n` +
  `  line-height: 0.96 !important;\n` +
  `  letter-spacing: -0.052em !important;\n` +
  `  overflow-wrap: normal !important;\n` +
  `  word-break: normal !important;\n` +
  `  hyphens: none !important;\n` +
  `}\n\n` +
  `.${rootClass} h2,\n` +
  `.${rootClass} h3,\n` +
  `.${rootClass} button,\n` +
  `.${rootClass} strong {\n` +
  `  overflow-wrap: normal;\n` +
  `  word-break: normal;\n` +
  `  hyphens: none;\n` +
  `}\n\n` +
  `.${rootClass} p,\n` +
  `.${rootClass} small,\n` +
  `.${rootClass} label,\n` +
  `.${rootClass} a,\n` +
  `.${rootClass} dd,\n` +
  `.${rootClass} textarea {\n` +
  `  max-width: 100%;\n` +
  `  overflow-wrap: anywhere;\n` +
  `  word-break: break-word;\n` +
  `}\n\n` +
  `.${rootClass} input,\n` +
  `.${rootClass} select,\n` +
  `.${rootClass} textarea,\n` +
  `.${rootClass} button {\n` +
  `  width: 100%;\n` +
  `  max-width: 100%;\n` +
  `}\n\n` +
  `@container (max-width: 390px) {\n` +
  `  .${headingClass} h1 {\n` +
  `    font-size: clamp(2.1rem, 11.4cqw, 3rem) !important;\n` +
  `  }\n` +
  `}\n`;


if (
  !css.includes(
    marker
  )
) {
  css +=
    layoutPatch;
}


writeFileSync(
  submitPagePath,
  submitPage,
  "utf8"
);

writeFileSync(
  cssPath,
  css,
  "utf8"
);

writeFileSync(
  apiRoutePath,
  apiRoute,
  "utf8"
);


console.log(
  "\nVenture submit polish installed."
);

console.log(
  `PAGE: ${relative(projectRoot, submitPagePath)}`
);

console.log(
  `CSS:  ${relative(projectRoot, cssPath)}`
);

console.log(
  `API:  ${relative(projectRoot, apiRoutePath)}`
);

console.log(
  "\nBackups use the suffix .before-submit-polish.bak."
);
