import fs from "node:fs";

const editorPath =
  "app/admin/listings/[entityType]/[id]/listing-editor-form.tsx";
const cssPath =
  "app/admin/listings/[entityType]/[id]/page.module.css";

const editor = fs.readFileSync(editorPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

const checks = [
  [editor.includes('useRef<"publish" | "return" | "stay">'), "publish action state"],
  [editor.includes('Publish and return'), "publish button"],
  [editor.includes('? "published"'), "forced published status"],
  [editor.includes('formRef.current?.requestSubmit()'), "publish submit trigger"],
  [css.includes('.publishAction'), "publish button styling"]
];

for (const [ok, label] of checks) {
  if (!ok) {
    console.error(`FAIL ${label}`);
    process.exit(1);
  }
  console.log(`PASS ${label}`);
}

console.log("Listing editor publish action checks passed.");
