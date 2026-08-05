# Venture Profiles + Onboarding V1.0.1

Hotfix for the duplicate `WINNIPEG_NEIGHBOURHOODS` export introduced in V1.0.

- Keeps the original grouped and alphabetically sorted neighbourhood export.
- Removes the second duplicate declaration that prevented Next.js from compiling `/profile`.
- Extends the structural check so this regression is caught before future packages ship.
- No database migration changes.
