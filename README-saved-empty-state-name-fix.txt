VENTURE SAVED EMPTY-STATE NAME FIX

Fixes:

the name `SavedEmptyState` is defined multiple times

The project already had a SavedEmptyState name. The animated component
is now imported and used as VentureSavedEmptyState so the existing code
does not need to be deleted.

INSTALL

Extract into the Venture project root, then run:

node .\scripts\fix-saved-empty-state-name.mjs

CHECK

node .\scripts\check-saved-empty-state-name.mjs

BUILD

npm run build
