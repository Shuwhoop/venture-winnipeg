import fs from "node:fs";

const requiredFiles = [
  "components/city-map.tsx",
  "components/outing-route-map.tsx",
  "app/explore/explore.module.css",
  "app/globals.css"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const cityMap = fs.readFileSync("components/city-map.tsx", "utf8");
const routeMap = fs.readFileSync("components/outing-route-map.tsx", "utf8");
const exploreCss = fs.readFileSync("app/explore/explore.module.css", "utf8");
const globalsCss = fs.readFileSync("app/globals.css", "utf8");

if (!cityMap.includes("markerButton.draggable = false")) {
  throw new Error("Explore marker native dragging is not disabled.");
}

if (!cityMap.includes("draggable: false")) {
  throw new Error("Explore MapLibre markers are not explicitly non-draggable.");
}

if (!routeMap.includes("element.draggable = false")) {
  throw new Error("Outing marker native dragging is not disabled.");
}

if (!routeMap.includes("draggable: false")) {
  throw new Error("Outing MapLibre markers are not explicitly non-draggable.");
}

const mapMarkerBlock = exploreCss.match(/\.mapMarker\s*\{[\s\S]*?\}/)?.[0] ?? "";

if (/transition\s*:[\s\S]*?transform/i.test(mapMarkerBlock)) {
  throw new Error("Explore marker position is still animated with a transform transition.");
}

if (!globalsCss.includes("VENTURE MAP PIN ANCHOR LOCK v0.1")) {
  throw new Error("Global MapLibre marker anchor lock is missing.");
}

console.log("PASS Explore markers are non-draggable");
console.log("PASS Outing markers are non-draggable");
console.log("PASS MapLibre position transforms update without animation lag");
console.log("Map pin anchor checks passed.");
