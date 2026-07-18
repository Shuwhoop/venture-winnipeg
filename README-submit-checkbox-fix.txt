VENTURE SUBMIT CHECKBOX FIX

Fixes the consent section shown in the screenshot.

- Restores checkboxes to 20 x 20 pixels.
- Places each checkbox directly beside its text.
- Prevents the global width rule from stretching checkbox controls.
- Keeps consent text wrapped inside the card.

INSTALL

node .\scripts\install-submit-checkbox-fix.mjs

CHECK

node .\scripts\check-submit-checkbox-fix.mjs

Then refresh:

http://localhost:3000/submit
