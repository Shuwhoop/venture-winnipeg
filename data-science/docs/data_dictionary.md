# Venture Data Dictionary

This dictionary describes the major datasets used by the current analytics workspace.

## `beta_events`

One row represents one tracked product event.

| Field | Meaning |
|---|---|
| `event_id` | Unique event row identifier |
| `visitor_id` | Anonymous browser-level identifier |
| `session_id` | Anonymous 30-minute session identifier |
| `event_name` | Controlled event taxonomy name |
| `page_path` | Venture route where the event occurred |
| `event_version` | Payload schema version |
| `properties_json` | Event-specific JSON properties |
| `client_created_at` | Browser timestamp for diagnostics |
| `created_at` | Server timestamp and source of truth |

Important event names include `page_view`, `listing_detail_opened`, `outing_generated`, `outing_saved`, `outing_shared`, `experiment_exposure`, and `feedback_submitted`.

## `venture_analytics_sessions`

A reporting view that groups events by `session_id`.

Important fields include session start and end times, event count, page-view count, entry path, device class, referrer, and whether the session generated or shared an outing.

## `beta_feedback`

One row represents one submitted tester response.

Contact information must only be used when `permission_to_contact` is true.

## `places`

Trusted place inventory including type, category, neighbourhood, coordinates, hours, status, verification, freshness, and source-check dates.

## `events`

Time-bound inventory including venue, organizer, schedule, price, ticket status, verification, expiration, and publication status.

## `listing_sources`

Traceability layer connecting each place or event to its source and usage-rights record.

## `venture_experiments`

Private registry of A/B tests, including variants, traffic percentage, primary outcome, guardrails, minimum sample size, and status.

## `audit_log`

Administrative change history. It supports traceability, debugging, and responsible data governance.
