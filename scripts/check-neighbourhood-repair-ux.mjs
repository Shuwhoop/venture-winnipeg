import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }

  return fs.readFileSync(fullPath, "utf8");
}

function expect(content, phrase, label) {
  if (!content.includes(phrase)) {
    throw new Error(`Missing ${label}: ${phrase}`);
  }
}

const neighbourhoods = read(
  "lib/winnipeg-neighbourhoods.ts"
);
const picker = read(
  "components/neighbourhood-picker.tsx"
);
const profile = read(
  "app/profile/page.tsx"
);
const builder = read(
  "app/build-outing/page.tsx"
);
const generator = read(
  "app/api/outings/generate/route.ts"
);
const editor = read(
  "app/admin/listings/[entityType]/[id]/listing-editor-form.tsx"
);
const editorCss = read(
  "app/admin/listings/[entityType]/[id]/page.module.css"
);
const globals = read("app/globals.css");

for (const name of [
  "West End",
  "Bridgwater",
  "Bridgwater Forest",
  "St. Vital",
  "Transcona",
  "Charleswood",
  "Amber Trails"
]) {
  expect(
    neighbourhoods,
    `\"${name}\"`,
    `Winnipeg neighbourhood ${name}`
  );
}

expect(
  neighbourhoods,
  "neighbourhoodMatchesPreference",
  "neighbourhood alias matcher"
);
expect(
  picker,
  "Browse all Winnipeg neighbourhoods",
  "collapsed browse control"
);
expect(
  picker,
  "Search another Winnipeg area",
  "searchable neighbourhood field"
);
expect(
  profile,
  "<NeighbourhoodPicker",
  "profile neighbourhood picker"
);
expect(
  builder,
  "<NeighbourhoodPicker",
  "outing-builder neighbourhood picker"
);
expect(
  generator,
  "neighbourhoodMatchesPreference(",
  "outing neighbourhood alias support"
);
expect(
  editor,
  "WINNIPEG_NEIGHBOURHOOD_GROUPS.map",
  "repair neighbourhood dropdown"
);
expect(
  editor,
  "venture-primary-categories",
  "repair category suggestions"
);
expect(
  editor,
  "TICKET_STATUS_OPTIONS.map",
  "ticket-status dropdown"
);
expect(
  editor,
  "AGE_LABEL_OPTIONS.map",
  "age-label dropdown"
);
expect(
  editor,
  "Apply timing defaults",
  "event timing shortcut"
);
expect(
  editor,
  "generateSlug",
  "slug generator"
);
expect(
  editor,
  "setFreshnessDays",
  "freshness shortcuts"
);
expect(
  editorCss,
  ".quickEditBar",
  "repair quick-edit styles"
);
expect(
  globals,
  ".neighbourhood-picker",
  "neighbourhood picker styles"
);

console.log(
  "Venture neighbourhood and repair UX checker passed."
);
