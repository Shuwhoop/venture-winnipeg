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


const appRoot =
  resolve(
    process.cwd(),
    "app"
  );

const marker =
  "VENTURE SUBMIT POLISH 2026-07-18";


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
    "Run this check from the Venture project root."
  );

  process.exit(1);
}


const files =
  walk(
    appRoot
  );

const submitPagePath =
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

const apiRoutePath =
  files.find(
    (path) =>
      path.endsWith(
        "route.ts"
      ) &&
      readFileSync(
        path,
        "utf8"
      ).includes(
        "listing_submissions"
      )
  );


let failed =
  false;


if (
  !submitPagePath
) {
  console.error(
    "CHECK FAILED: submit page not found."
  );

  failed =
    true;
}


if (
  !apiRoutePath
) {
  console.error(
    "CHECK FAILED: submission API route not found."
  );

  failed =
    true;
}


if (
  submitPagePath
) {
  const page =
    readFileSync(
      submitPagePath,
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
      "CHECK FAILED: CSS-module import not found."
    );

    failed =
      true;
  } else {
    const cssPath =
      resolve(
        submitPagePath,
        "..",
        cssImport[1]
      );

    const css =
      readFileSync(
        cssPath,
        "utf8"
      );

    for (
      const required
      of [
        marker,
        "container-type: inline-size",
        "overflow-wrap: normal",
        "word-break: normal",
        "12cqw",
        "max-width: 100%"
      ]
    ) {
      if (
        !css.includes(
          required
        )
      ) {
        console.error(
          `RESPONSIVE CHECK FAILED: ${required}`
        );

        failed =
          true;
      }
    }
  }

  const urlInputs =
    page.match(
      /<input\b[\s\S]*?>/g
    ) ??
    [];

  for (
    const tag
    of urlInputs
  ) {
    const isUrlInput =
      /type\s*=\s*["']url["']/i.test(
        tag
      ) ||
      /(?:name|id)\s*=\s*["'][^"']*(?:url|website|ticket)[^"']*["']/i.test(
        tag
      );

    if (
      isUrlInput &&
      /\srequired(?:=\{true\})?(?=\s|\/?>)/.test(
        tag
      )
    ) {
      console.error(
        "OPTIONAL URL CHECK FAILED: a URL input is still required."
      );

      failed =
        true;
    }
  }
}


if (
  apiRoutePath
) {
  const api =
    readFileSync(
      apiRoutePath,
      "utf8"
    );

  const obviousRequiredPatterns = [
    /if\s*\([^)]*!\s*(?:sourceUrl|source_url|websiteUrl|website_url|officialUrl|official_url|ticketUrl|ticket_url)[^)]*\)\s*\{[\s\S]{0,300}(?:required|missing|must provide)/i,
    /(?:sourceUrl|source_url|websiteUrl|website_url|officialUrl|official_url|ticketUrl|ticket_url)\s*:\s*z\.string\(\)(?:\.trim\(\))?\.url\([^)]*\)(?![\s\S]{0,35}\.optional\(\))/i
  ];

  for (
    const pattern
    of obviousRequiredPatterns
  ) {
    if (
      pattern.test(
        api
      )
    ) {
      console.error(
        "SERVER CHECK FAILED: an obvious required-URL rule remains."
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
    "Submit layout and optional-URL checks passed."
  );
}
