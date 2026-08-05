import fs from "node:fs";

const checks = [
  [
    "lib/network-errors.ts",
    [
      "isTransientNetworkError",
      "reportDataAccessError",
      "ENOTFOUND".toLowerCase()
    ]
  ],
  [
    "lib/explore-search.ts",
    ["reportDataAccessError"]
  ],
  [
    "lib/data/events.ts",
    ["reportDataAccessError"]
  ],
  [
    "lib/data/places.ts",
    ["reportDataAccessError"]
  ],
  [
    "lib/data/listing-detail.ts",
    ["isTransientNetworkError", "reportDataAccessError"]
  ],
  [
    "lib/beta/client.ts",
    ["if (!navigator.onLine)"]
  ],
  [
    "lib/beta/server.ts",
    ["isTransientNetworkError"]
  ],
  [
    "app/api/beta/event/route.ts",
    ["recorded: false", "offline: true", "status: 202"]
  ]
];

for (const [file, markers] of checks) {
  const text = fs.readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.toLowerCase().includes(marker.toLowerCase())) {
      throw new Error(`${file} is missing: ${marker}`);
    }
  }
}

const guardedFiles = [
  "lib/explore-search.ts",
  "lib/data/events.ts",
  "lib/data/places.ts"
];

for (const file of guardedFiles) {
  const text = fs.readFileSync(file, "utf8");
  if (/console\.error\(\s*["'`]Unable to (search|load)/m.test(text)) {
    throw new Error(`${file} still exposes expected offline data failures as console errors.`);
  }
}

console.log("Venture Reliability V1.1 structural check passed.");
