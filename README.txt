VENTURE NEWSLETTER SCHEMA COMPATIBILITY FIX

Root cause fixed:

The original Venture database already had a required column named
consent_text_version. The newer welcome-email route used consent_version
instead. A new subscriber insert therefore omitted a required legacy
column and Supabase rejected the row.

The original schema can also contain subscribers whose email_normalized
field was not yet populated. The route now falls back to the original
email column before attempting a new insert.

This package:
- adds a new reconciliation migration
- sends both consent_version and consent_text_version
- searches both email_normalized and legacy email
- backfills normalized email values
- prints safe Supabase error details in the local server terminal
