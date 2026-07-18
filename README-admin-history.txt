VENTURE ADMIN HISTORY

This package adds a protected review-history page.

ROUTES

/admin/submissions
Existing moderation queue

/admin/submissions/history
Approved and rejected submission history

FEATURES

- Search by title, name, email, venue, category, notes, or reference.
- Filter by approved or rejected.
- Responsive history cards instead of a wide table.
- Twenty records per page.
- Links approved records to the resulting Venture listing.
- Reopens rejected submissions into the review queue.
- Keeps approved submissions linked to their existing entity so the
  moderation workflow cannot silently create duplicates.
- Adds Queue, History, and Public Form links to the secure admin bar.
- Long names, emails, notes, and links wrap inside their cards.
- Mobile breakpoints prevent controls and buttons from cutting across
  the page.

INSTALL

Extract the ZIP into:

C:\Users\ppmal\Documents\Projects\venture-production-starter-v0.1

It creates or replaces:

app/admin/submissions/layout.tsx
app/admin/submissions/admin-layout.module.css
app/admin/submissions/history/page.tsx
app/admin/submissions/history/actions.ts
app/admin/submissions/history/page.module.css
scripts/check-admin-history-files.mjs

VERIFY FILES

node .\scripts\check-admin-history-files.mjs

BUILD TEST

npm run build

START

npm run dev

OPEN

http://localhost:3000/admin/submissions/history

GIT

git add .
git commit -m "Add admin submission history"
git push origin main
