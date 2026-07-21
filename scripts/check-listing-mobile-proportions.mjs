import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function expect(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

const page = read("app/listings/[slug]/page.tsx");
const css = read("app/listings/[slug]/page.module.css");
const feedback = read("components/beta-feedback/beta-feedback.tsx");
const feedbackCss = read("components/beta-feedback/beta-feedback.module.css");

expect(page, 'name="directions"', "directions icon");
expect(page, 'name="globe"', "website globe icon");
expect(page, 'name="phone"', "phone icon");
expect(page, 'name="menu"', "menu icon");
expect(page, "secondaryWebsite", "website action styling");
expect(page, "factNeighbourhood", "neighbourhood fact styling");
expect(css, "overflow-x: clip", "mobile overflow protection");
expect(css, "grid-template-columns: repeat(2, minmax(0, 1fr))", "two-column mobile grids");
expect(css, ".iconSvg", "larger SVG icon style");
expect(css, "width: 24px", "24px action icons");
expect(css, ".secondaryAction:last-child:nth-child(odd)", "balanced odd action row");
expect(css, "@keyframes actionGleam", "subtle action animation");
expect(css, "prefers-reduced-motion", "reduced-motion support");
expect(feedback, 'aria-label="Give Venture feedback"', "feedback accessibility label");
expect(feedbackCss, "font-size: 0", "compact mobile feedback launcher");

console.log("Venture listing mobile proportions check passed.");
