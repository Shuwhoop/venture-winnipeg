import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function requireFile(relativePath) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }

  return fs.readFileSync(fullPath, "utf8");
}

function requireText(relativePath, expected) {
  const content = requireFile(relativePath);

  for (const value of expected) {
    if (!content.includes(value)) {
      throw new Error(
        `${relativePath} is missing required text: ${value}`
      );
    }
  }
}

requireText(
  "app/admin/listings/[entityType]/[id]/listing-editor-form.tsx",
  [
    "QUICK HOURS",
    "Apply Mon–Fri",
    "Apply every day",
    "Copy Monday to weekdays",
    "Copy Saturday to Sunday",
    "Close weekend",
    "Review or adjust individual days",
    "formRef",
    "applyQuickHours",
    "copyDayHours"
  ]
);

requireText(
  "app/admin/listings/[entityType]/[id]/page.module.css",
  [
    ".hoursQuickFill",
    ".quickTimeGrid",
    ".quickHourActions",
    ".individualHours"
  ]
);

console.log(
  "Venture quick-hours editor structural checker passed."
);
