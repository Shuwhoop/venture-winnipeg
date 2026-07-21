# Venture Data Science Workspace

This folder turns Venture's product data into a practical analytics and data-science learning environment.

## What this workspace is for

Use it to:

- audit Venture's analytics exports
- calculate product KPIs
- build conversion funnels
- study retention cohorts
- analyze A/B experiments
- evaluate recommendation versions
- measure inventory health and coverage
- summarize tester feedback
- build a transparent baseline recommendation score
- create portfolio-ready findings without overstating small samples

## Data sources

Download CSV files from Venture's admin tools and place them in `data/raw`.

Expected file patterns:

- `venture-events-*.csv`
- `venture-sessions-*.csv`
- `venture-feedback-*.csv`
- `venture-inventory-*.csv`
- optional experiment export containing `experiment` in its filename
- optional recommendation export containing `recommendation` in its filename
- optional pipeline export containing `pipeline` in its filename

The current Analytics Lab exports are available from Venture's private admin dashboard.

## Recommended notebook order

1. `00_setup_and_data_audit.ipynb`
2. `01_product_kpis_and_funnels.ipynb`
3. `02_retention_cohorts.ipynb`
4. `03_experiment_analysis.ipynb`
5. `04_recommendation_evaluation.ipynb`
6. `05_inventory_supply_and_quality.ipynb`
7. `06_feedback_text_analysis.ipynb`
8. `07_baseline_recommendation_model.ipynb`

## Setup on Windows

```powershell
cd data-science
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
jupyter lab
```

## Important interpretation rule

Small samples are exploratory evidence, not proof. Venture should not declare an experiment winner, a retention trend, or a recommendation improvement until the relevant sample is large enough and the result is stable.

## Privacy

The workspace is designed around anonymous visitor and session identifiers. Do not export or analyze contact emails unless there is a specific operational reason and the person explicitly gave permission to be contacted.
