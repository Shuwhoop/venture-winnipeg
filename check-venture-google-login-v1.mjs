import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function requireText(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label} is missing: ${expected}`);
  }
}

const signIn = read("app/sign-in/page.tsx");
const signInCss = read("app/sign-in/page.module.css");
const callback = read("app/auth/callback/route.ts");
const helper = read("Configure-Venture-Google-Login.ps1");
const release = read("VENTURE_GOOGLE_LOGIN_V1_0.md");

requireText(signIn, 'provider: "google"', "Google OAuth provider");
requireText(signIn, "signInWithOAuth", "Google OAuth call");
requireText(signIn, 'prompt: "select_account"', "Google account picker");
requireText(signIn, "Continue with Google", "Google sign-in control");
requireText(signIn, "Continue with email", "Email fallback");
requireText(signIn, 'callbackUrl.searchParams.set(\n        "next"', "Safe return path forwarding");
requireText(signInCss, ".googleButton", "Google button styles");
requireText(signInCss, ".googleButton:focus-visible", "Google keyboard focus style");
requireText(callback, "error_description", "OAuth cancellation handling");
requireText(callback, "getGoogleDisplayName", "Google profile name helper");
requireText(callback, 'resolvedNextPath = "/profile/onboarding"', "Onboarding redirect");
requireText(helper, "/auth/v1/callback", "Supabase OAuth callback helper");
requireText(helper, '$localCallback = "$localOrigin/auth/callback"', "Local callback allow-list helper");
requireText(helper, '$productionCallback = "$productionOrigin/auth/callback"', "Production callback allow-list helper");
requireText(release, "No database migration", "Release migration note");

const forbiddenPatterns = [
  /client_secret\s*=\s*["'][^"']+["']/i,
  /google_client_secret\s*=\s*["'][^"']+["']/i,
  /GOCSPX-[A-Za-z0-9_-]{10,}/,
  /AIza[0-9A-Za-z_-]{20,}/
];

for (const [relativePath, source] of [
  ["app/sign-in/page.tsx", signIn],
  ["app/auth/callback/route.ts", callback],
  ["Configure-Venture-Google-Login.ps1", helper]
]) {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      throw new Error(`Possible Google credential found in ${relativePath}.`);
    }
  }
}

const neighbourhoods = read("lib/winnipeg-neighbourhoods.ts");
const neighbourhoodDeclarations = (
  neighbourhoods.match(/export\s+const\s+WINNIPEG_NEIGHBOURHOODS\s*=/g) ?? []
).length;

if (neighbourhoodDeclarations !== 1) {
  throw new Error(
    `WINNIPEG_NEIGHBOURHOODS must be declared once; found ${neighbourhoodDeclarations}.`
  );
}

console.log("Venture Google Login V1.0 structural check passed.");
