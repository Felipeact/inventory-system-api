# Documentation

**`Inventory-System-Documentation.pdf`** is the full technical documentation for the whole
platform — the Back-End API, Web Front-End, Flutter Mobile App, and Qt Desktop App —
including architecture, build/run guides for each app, and a production-readiness report.

## Files

| File | Purpose |
|------|---------|
| `Inventory-System-Documentation.pdf` | The generated, distributable documentation |
| `documentation.md` | Markdown source of the PDF |
| `build_pdf.py` | Renders the markdown to PDF |
| `style.css` | Print stylesheet (cover page, TOC, code/table styling) |

## Regenerate the PDF

```bash
pip install weasyprint markdown pygments
cd docs
python3 build_pdf.py        # writes Inventory-System-Documentation.pdf
```
