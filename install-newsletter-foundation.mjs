import {
  cpSync,
  existsSync,
  mkdirSync,
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

import {
  fileURLToPath
} from "node:url";


const projectRoot =
  process.cwd();

const packageRoot =
  dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const payloadRoot =
  resolve(
    packageRoot,
    "payload"
  );

const backupRoot =
  resolve(
    projectRoot,
    "venture-backups",
    `newsletter-foundation-${new Date()
      .toISOString()
      .replaceAll(":", "-")}`
  );


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
  const results = [];

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


function backupFile(
  fullPath
) {
  if (!existsSync(fullPath)) {
    return;
  }

  const relativePath =
    relative(
      projectRoot,
      fullPath
    );

  const destination =
    resolve(
      backupRoot,
      relativePath
    );

  mkdirSync(
    dirname(destination),
    {
      recursive:
        true
    }
  );

  writeFileSync(
    destination,
    readFileSync(fullPath)
  );
}


function writePatchedFile(
  fullPath,
  content
) {
  backupFile(fullPath);

  mkdirSync(
    dirname(fullPath),
    {
      recursive:
        true
    }
  );

  writeFileSync(
    fullPath,
    content,
    "utf8"
  );
}


function addImport(
  source,
  importLine
) {
  if (
    source.includes(
      importLine
    )
  ) {
    return source;
  }

  const clientDirective =
    source.match(
      /^["']use client["'];\s*/
    );

  if (clientDirective) {
    return (
      source.slice(
        0,
        clientDirective[0].length
      ) +
      "\n" +
      importLine +
      "\n\n" +
      source.slice(
        clientDirective[0].length
      )
    );
  }

  return (
    importLine +
    "\n\n" +
    source
  );
}


function insertBeforePageClose(
  source,
  block
) {
  if (
    source.includes(block.trim())
  ) {
    return source;
  }

  const mainClose =
    source.lastIndexOf(
      "</main>"
    );

  if (mainClose >= 0) {
    return (
      source.slice(
        0,
        mainClose
      ) +
      `\n      ${block}\n    ` +
      source.slice(
        mainClose
      )
    );
  }

  const fragmentClose =
    source.lastIndexOf(
      "</>"
    );

  if (fragmentClose >= 0) {
    return (
      source.slice(
        0,
        fragmentClose
      ) +
      `\n      ${block}\n    ` +
      source.slice(
        fragmentClose
      )
    );
  }

  return source;
}


if (
  !existsSync(
    resolve(
      projectRoot,
      "app"
    )
  )
) {
  fail(
    "Run this installer from the Venture project root."
  );
}


if (!existsSync(payloadRoot)) {
  fail(
    "The package payload folder is missing."
  );
}


mkdirSync(
  backupRoot,
  {
    recursive:
      true
  }
);


for (
  const sourcePath
  of walk(payloadRoot)
) {
  const relativePath =
    relative(
      payloadRoot,
      sourcePath
    );

  const destination =
    resolve(
      projectRoot,
      relativePath
    );

  backupFile(destination);

  mkdirSync(
    dirname(destination),
    {
      recursive:
        true
    }
  );

  cpSync(
    sourcePath,
    destination,
    {
      force:
        true
    }
  );

  console.log(
    `INSTALLED: ${relativePath}`
  );
}


const layoutPath =
  resolve(
    projectRoot,
    "app/layout.tsx"
  );

if (existsSync(layoutPath)) {
  let layout =
    readFileSync(
      layoutPath,
      "utf8"
    );

  layout =
    layout
      .replaceAll(
        "Venture | Discover Your City",
        "Venture by Boogie Bangers | Discover Your City"
      )
      .replaceAll(
        'applicationName: "Venture"',
        'applicationName: "Venture by Boogie Bangers"'
      )
      .replaceAll(
        'aria-label="Venture home"',
        'aria-label="Venture by Boogie Bangers home"'
      )
      .replace(
        /<strong>Venture<\/strong>\s*<small>[^<]*<\/small>/,
        `<strong>Venture</strong>\n                <small>by Boogie Bangers</small>`
      );

  writePatchedFile(
    layoutPath,
    layout
  );

  console.log(
    "UPDATED: app/layout.tsx branding"
  );
}


const manifestPath =
  resolve(
    projectRoot,
    "app/manifest.ts"
  );

if (existsSync(manifestPath)) {
  let manifest =
    readFileSync(
      manifestPath,
      "utf8"
    );

  manifest =
    manifest
      .replaceAll(
        'name: "Venture"',
        'name: "Venture by Boogie Bangers"'
      )
      .replaceAll(
        'short_name: "Venture"',
        'short_name: "Venture"'
      );

  writePatchedFile(
    manifestPath,
    manifest
  );

  console.log(
    "UPDATED: app/manifest.ts branding"
  );
}


const homePath =
  resolve(
    projectRoot,
    "app/page.tsx"
  );

if (existsSync(homePath)) {
  let home =
    readFileSync(
      homePath,
      "utf8"
    );

  home =
    addImport(
      home,
      'import NewsletterSignup from "@/components/newsletter-signup/newsletter-signup";'
    );

  home =
    home.replace(
      /<section\s+className=["']newsletter-panel["'][\s\S]*?<\/section>/,
      '<NewsletterSignup placement="home" />'
    );

  if (
    !home.includes(
      '<NewsletterSignup placement="home" />'
    )
  ) {
    home =
      insertBeforePageClose(
        home,
        '<NewsletterSignup placement="home" />'
      );
  }

  writePatchedFile(
    homePath,
    home
  );

  console.log(
    "UPDATED: app/page.tsx newsletter entry"
  );
}


const profilePath =
  resolve(
    projectRoot,
    "app/profile/page.tsx"
  );

if (existsSync(profilePath)) {
  let profile =
    readFileSync(
      profilePath,
      "utf8"
    );

  profile =
    addImport(
      profile,
      'import NewsletterSignup from "@/components/newsletter-signup/newsletter-signup";'
    );

  profile =
    insertBeforePageClose(
      profile,
      '<NewsletterSignup placement="profile" />'
    );

  writePatchedFile(
    profilePath,
    profile
  );

  console.log(
    "UPDATED: app/profile/page.tsx newsletter entry"
  );
}


const envLocalPath =
  resolve(
    projectRoot,
    ".env.local"
  );

const envBlock = `\n# Venture newsletter\nVENTURE_EMAIL_REPLY_TO=venturebangers@gmail.com\n# RESEND_API_KEY=\n# VENTURE_EMAIL_FROM=Venture by Boogie Bangers <onboarding@resend.dev>\n# NEXT_PUBLIC_APP_URL=http://localhost:3000\n# NEWSLETTER_TOKEN_SECRET=\n`;

if (existsSync(envLocalPath)) {
  const envLocal =
    readFileSync(
      envLocalPath,
      "utf8"
    );

  if (
    !envLocal.includes(
      "VENTURE_EMAIL_REPLY_TO="
    )
  ) {
    writePatchedFile(
      envLocalPath,
      envLocal.trimEnd() +
        "\n" +
        envBlock
    );

    console.log(
      "UPDATED: .env.local newsletter placeholders"
    );
  }
}


console.log(
  `\nBACKUP: ${backupRoot}`
);

console.log(
  "\nVenture newsletter foundation installed."
);
