# Model Card: `route-score-v1`

## Model type

Transparent rule-based recommendation and route-building system. It is not currently a trained machine-learning model.

## Intended purpose

Select trustworthy Winnipeg places and events that fit a user's requested schedule, interests, budget, transportation mode, stop mix, and route constraints.

## Inputs

Examples include:

- requested date and time
- outing duration
- interests and neighbourhood preferences
- budget
- transportation mode
- alcohol-free preference
- requested food, event, and drink stop counts
- listing schedules, location, category, verification, freshness, and estimated cost

## Outputs

A complete, partial, or empty outing plan, along with candidate count and diversity measurements.

## Current evaluation metrics

- complete, partial, and empty plan rates
- save rate
- share rate
- stop-replacement frequency
- positive feedback
- average candidate pool
- category diversity
- neighbourhood diversity
- stop-kind diversity

## Limitations

- performance depends heavily on inventory breadth and accuracy
- sparse neighbourhood or event coverage can create partial routes
- save and share behaviour are imperfect proxies for satisfaction
- early samples will be too small for strong conclusions
- the system may overrepresent categories with denser inventory

## Responsible-use principles

- trusted organic ranking cannot be purchased
- sponsored inventory must remain separate and labelled
- verification and source traceability matter more than listing volume
- small samples must not be presented as proof
- anonymous analytics must not become advertising surveillance
