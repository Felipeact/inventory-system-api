# Documentation

Two distributable PDFs are generated here:

- **`Inventory-System-Documentation.pdf`** — full technical documentation for the whole
  platform (Back-End API, Web Front-End, Flutter Mobile App, Qt Desktop App): architecture,
  build/run guides, onboarding, email/notifications, and a production-readiness report.
- **`Inventory-System-Test-Plan.pdf`** — a step-by-step manual test run covering environment
  setup, operator onboarding, account creation, auth, every web page, all back-end routes,
  email notifications, lead capture, and security spot-checks.

## Files

| File | Purpose |
|------|---------|
| `Inventory-System-Documentation.pdf` | Generated documentation (distributable) |
| `Inventory-System-Test-Plan.pdf` | Generated manual test plan (distributable) |
| `documentation.md` | Markdown source of the documentation PDF |
| `test-plan.md` | Markdown source of the test-plan PDF |
| `build_pdf.py` | Renders `documentation.md` → PDF |
| `build_test_plan.py` | Renders `test-plan.md` → PDF |
| `style.css` | Shared print stylesheet (cover page, TOC, code/table styling) |

## Regenerate the PDFs

```bash
pip install weasyprint markdown pygments
cd docs
python3 build_pdf.py          # writes Inventory-System-Documentation.pdf
python3 build_test_plan.py    # writes Inventory-System-Test-Plan.pdf
```
