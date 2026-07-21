# Venture Metric Glossary

## Active visitor

A distinct anonymous `visitor_id` with at least one event during the chosen period.

## Session

A browser visit grouped under one anonymous session ID. Venture rotates the session after 30 minutes of inactivity.

## Bounce rate

Sessions with one or fewer recorded page views divided by all sessions.

## Average session depth

Recorded page views divided by sessions.

## Outing generation rate

Sessions containing `outing_generated` divided by eligible sessions that opened the builder.

## Outing completion rate

Complete outing generations divided by all `outing_generated` events.

## Save rate

Sessions that save an outing divided by sessions that generated an outing. Use session-level denominators to avoid one highly active user dominating the result.

## Share rate

Sessions that create an outing share link divided by sessions that generated an outing.

## Retention

The percentage of visitors in a first-seen cohort who return during a later calendar week.

## Experiment conversion rate

Exposed sessions or visitors reaching the experiment's primary outcome divided by valid exposures for that variant.

## Recommendation diversity

A family of measures describing the number of distinct categories, neighbourhoods, and stop types in a generated route.

## Data quality score

A diagnostic score based on missing identifiers, unknown events, invalid payload versions, duplicates, latency, and recommendation-version coverage. It measures pipeline reliability, not product success.
