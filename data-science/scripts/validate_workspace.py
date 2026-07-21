from pathlib import Path
import ast
import json
import sys

ROOT = Path(__file__).resolve().parents[1]

errors = []

for path in (ROOT / "src").rglob("*.py"):
    try:
        ast.parse(path.read_text(encoding="utf-8"))
    except SyntaxError as exc:
        errors.append(f"{path}: {exc}")

for path in (ROOT / "notebooks").glob("*.ipynb"):
    try:
        content = json.loads(path.read_text(encoding="utf-8"))
        if content.get("nbformat") != 4:
            errors.append(f"{path}: expected notebook format 4")
        if not content.get("cells"):
            errors.append(f"{path}: notebook has no cells")
    except json.JSONDecodeError as exc:
        errors.append(f"{path}: invalid JSON: {exc}")

required = [
    ROOT / "README.md",
    ROOT / "requirements.txt",
    ROOT / "docs" / "data_dictionary.md",
    ROOT / "docs" / "metric_glossary.md",
    ROOT / "docs" / "owners_handbook_outline.md",
]

for path in required:
    if not path.exists():
        errors.append(f"Missing required file: {path}")

if errors:
    print("Workspace validation failed:")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("Venture Data Science Workspace validation passed.")
