import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "app/beta/page.tsx",
  "app/beta/beta.module.css",
  "components/beta-launch/beta-mission-board.tsx",
  "components/beta-launch/beta-mission-board.module.css",
  "components/beta-feedback/beta-feedback.tsx"
];

const failures = [];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Missing ${relativePath}`);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

if (failures.length === 0) {
  const page = read("app/beta/page.tsx");
  const board = read("components/beta-launch/beta-mission-board.tsx");
  const feedback = read("components/beta-feedback/beta-feedback.tsx");

  const pageChecks = [
    [page.includes("BetaMissionBoard"), "Beta page does not render the mission board"],
    [page.includes('href="/explore"'), "Beta page is missing Explore entry"],
    [page.includes('href="/build-outing"'), "Beta page is missing Build Outing entry"],
    [page.includes('href="/privacy"'), "Beta page is missing Privacy link"]
  ];

  const boardChecks = [
    [board.includes("venture:beta-missions:v1"), "Mission progress is not persisted"],
    [board.includes("venture:open-feedback"), "Mission board cannot open feedback"],
    [board.includes("Six missions"), "Mission board heading is missing"],
    [board.includes("Mark complete"), "Mission completion control is missing"]
  ];

  const feedbackChecks = [
    [feedback.includes('"venture:open-feedback"'), "Feedback component is not listening for the beta-page event"],
    [feedback.includes("handleExternalOpen"), "Feedback external-open handler is missing"]
  ];

  for (const [passed, message] of [...pageChecks, ...boardChecks, ...feedbackChecks]) {
    if (!passed) failures.push(message);
  }
}

if (failures.length > 0) {
  console.error("Private beta launch kit check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Private beta launch kit structure looks good.");
