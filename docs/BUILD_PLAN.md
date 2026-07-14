# Venture MVP Build Plan

## Sprint 0: Project setup

- Create GitHub organization and private repository
- Register development and production environments
- Create Vercel and Supabase projects
- Apply the initial SQL migration
- Add environment variables securely
- Configure preview deployments
- Add code formatting, linting, and branch protection

Exit condition: every pull request receives a working preview and the database migration can be reproduced from an empty project.

## Sprint 1: Public discovery foundation

- Convert approved prototype into reusable React components
- Implement Home, Explore, listing details, Tonight, Saved, and Profile routes
- Load curated sample listings from PostgreSQL
- Implement category, date, price, verification, and distance filters
- Add MapLibre with licensed tiles
- Add visible source, last-checked, and verification information

Exit condition: a guest can find an event or restaurant and inspect its trust information without creating an account.

## Sprint 2: Data operations and moderation

- Build source registry
- Build raw submission and normalized listing tables
- Add duplicate detection rules
- Add moderation queue and audit history
- Add automatic expiry and stale warnings
- Build organizer and business submission forms
- Add report-an-issue workflow

Exit condition: new information never jumps directly from a public form to a verified public listing.

## Sprint 3: Accounts and saved plans

- Add Supabase Auth
- Add profile preferences with explicit consent
- Add saves and collections
- Add reminders and change alerts
- Keep guest browsing fully functional

Exit condition: account features work without weakening guest access or data privacy.

## Sprint 4: Tonight pairings

- Add deterministic event-and-food pairing first
- Validate opening hours, event timing, travel buffer, budget, dietary needs, and verification freshness
- Provide reasons for every recommendation
- Allow users to swap either half of the plan

Exit condition: every generated plan is feasible according to the stored data and clearly warns about uncertainty.

## Sprint 5: Weekly newsletter

- Build double-opt-in signup
- Generate Thursday draft from eligible, recently checked listings
- Require human approval before the first public editions
- Add unsubscribe and suppression handling
- Record consent source and consent-text version

Exit condition: the newsletter can be audited from signup to unsubscribe and never features expired or stale listings without a warning.

## Sprint 6: Private beta

- Seed at least 30 checked events and 30 checked restaurants across Winnipeg
- Recruit 20 interview participants from the target audience
- Measure time-to-useful-result, trust comprehension, failed searches, and return intent
- Fix the most serious usability and accuracy failures

Exit condition: most testers can find a suitable event, restaurant, or pairing in under two minutes and understand verification labels.

## Sprint 7: Public beta

- Expand data coverage citywide
- Add operational dashboards and alerts
- Complete privacy, copyright, terms, accessibility, CASL, and moderation review
- Publish terms, privacy notice, correction process, and source policy
- Launch Venture This Weekend

Exit condition: Venture can operate safely for one city without the founder manually rescuing every listing.
