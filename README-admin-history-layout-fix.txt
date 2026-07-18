VENTURE ADMIN HISTORY LAYOUT FIX

This package fixes the narrow phone-shell layout shown in the screenshot.

WHY IT HAPPENED

The Venture interface is displayed inside a narrow mobile shell even on
a wide desktop browser. The previous styles used viewport breakpoints,
so the page thought it had desktop space and rendered oversized text
inside the narrow shell.

WHAT CHANGED

- History layout is mobile-first.
- The history page uses container queries instead of relying only on the
  browser viewport.
- The hero title no longer breaks words into vertical letter stacks.
- The admin email stays on one line with ellipsis.
- Admin navigation sits on its own row.
- Search controls stack safely.
- History metadata and notes stack safely.
- Long email addresses, URLs, and notes wrap inside cards.
- Buttons never exceed the card width.
- Pagination fits narrow screens.
- Wider layouts are restored only when the actual page container has
  enough room.

FILES REPLACED

app/admin/submissions/admin-layout.module.css
app/admin/submissions/history/page.module.css

TEST FILE

scripts/check-admin-history-layout.mjs

INSTALL

Extract into:

C:\Users\ppmal\Documents\Projects\venture-production-starter-v0.1

VERIFY

node .\scripts\check-admin-history-layout.mjs

BUILD

npm run build

RUN

npm run dev

OPEN

http://localhost:3000/admin/submissions/history
