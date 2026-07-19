VENTURE NEWSLETTER MIGRATION FIX

Fixes:

column "consent_text" of relation
"public.newsletter_subscribers" does not exist

WHY IT HAPPENED

The newsletter_subscribers table already existed, so:

create table if not exists

did not add the newer columns. The migration then attempted to comment
on consent_text before that column existed.

WHAT THIS REPLACEMENT DOES

- Keeps the same migration timestamp because the failed migration was
  not successfully applied.
- Creates the table when it does not exist.
- Adds every missing column individually with ADD COLUMN IF NOT EXISTS.
- Backfills safe defaults for existing rows.
- Adds the subscriber-status constraint.
- Adds indexes, RLS, service-role permissions, and comments.
- Does not delete the existing table or existing subscriber records.

INSTALL

Extract this ZIP into the Venture project root and overwrite the existing
migration file.

CHECK

node .\scripts\check-newsletter-migration-fix.mjs

PUSH

npx supabase db push

No migration-repair command should be needed because the migration
failed instead of completing.
