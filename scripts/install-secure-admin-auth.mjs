import {
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync
} from "node:fs";

import {
  resolve
} from "node:path";


const projectRoot =
  process.cwd();

const files = {
  submissionsPage:
    resolve(
      projectRoot,
      "app/admin/submissions/page.tsx"
    ),

  submissionsActions:
    resolve(
      projectRoot,
      "app/admin/submissions/actions.ts"
    ),

  restaurantActions:
    resolve(
      projectRoot,
      "app/admin/restaurants/actions.ts"
    )
};


function requireFile(
  path
) {
  if (
    !existsSync(path)
  ) {
    throw new Error(
      `Required file was not found: ${path}`
    );
  }
}


function backUp(
  path
) {
  const backupPath =
    `${path}.before-auth.bak`;

  if (
    !existsSync(
      backupPath
    )
  ) {
    copyFileSync(
      path,
      backupPath
    );
  }
}


function removeLocalGuardFunction(
  source
) {
  return source.replace(
    /function\s+requireLocalDashboard\s*\(\s*\)\s*\{\s*if\s*\(\s*process\.env\.NODE_ENV\s*===\s*"production"\s*\)\s*\{\s*throw\s+new\s+Error\s*\([\s\S]*?\)\s*;\s*\}\s*\}\s*/m,
    ""
  );
}


function patchActions(
  path
) {
  requireFile(path);
  backUp(path);

  let source =
    readFileSync(
      path,
      "utf8"
    );

  if (
    !source.includes(
      'from "@/lib/auth/admin"'
    )
  ) {
    const directive =
      '"use server";';

    if (
      !source.includes(
        directive
      )
    ) {
      throw new Error(
        `The server-action directive was not found in ${path}`
      );
    }

    source =
      source.replace(
        directive,
        `${directive}\n\nimport {\n  requireVentureAdmin\n} from "@/lib/auth/admin";`
      );
  }

  source =
    removeLocalGuardFunction(
      source
    );

  source =
    source.replaceAll(
      "requireLocalDashboard();",
      "await requireVentureAdmin();"
    );

  if (
    source.includes(
      "requireLocalDashboard"
    )
  ) {
    throw new Error(
      `A temporary local guard remains in ${path}`
    );
  }

  if (
    !source.includes(
      "await requireVentureAdmin();"
    )
  ) {
    throw new Error(
      `No protected action calls were found in ${path}`
    );
  }

  writeFileSync(
    path,
    source,
    "utf8"
  );
}


function patchPage(
  path
) {
  requireFile(path);
  backUp(path);

  let source =
    readFileSync(
      path,
      "utf8"
    );

  source =
    source.replace(
      /import\s*\{\s*notFound\s*\}\s*from\s*"next\/navigation";\s*/m,
      ""
    );

  source =
    source.replace(
      /\s*if\s*\(\s*process\.env\.NODE_ENV\s*===\s*"production"\s*\)\s*\{\s*notFound\(\);\s*\}\s*/m,
      "\n"
    );

  source =
    source.replaceAll(
      "LOCAL ADMIN TOOL",
      "SECURE ADMIN TOOL"
    );

  if (
    source.includes(
      "notFound()"
    )
  ) {
    throw new Error(
      `A temporary production 404 remains in ${path}`
    );
  }

  writeFileSync(
    path,
    source,
    "utf8"
  );
}


patchActions(
  files.submissionsActions
);

patchActions(
  files.restaurantActions
);

patchPage(
  files.submissionsPage
);

console.log(
  "Secure admin patches installed."
);

console.log(
  "Backups use the suffix .before-auth.bak"
);
