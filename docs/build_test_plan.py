#!/usr/bin/env python3
"""Render the manual test plan markdown into a styled PDF.

Pipeline: Markdown -> HTML (markdown + pygments) -> PDF (WeasyPrint).
Shares style.css with build_pdf.py; only the cover and source/output differ.
"""
import sys
import datetime
from pathlib import Path

import markdown
from pygments.formatters import HtmlFormatter
from weasyprint import HTML, CSS

HERE = Path(__file__).parent
MD_FILE = HERE / "test-plan.md"
CSS_FILE = HERE / "style.css"
OUT_FILE = HERE / "Inventory-System-Test-Plan.pdf"

COVER = """
<div class="cover">
  <div class="glyph">✓</div>
  <h1>Inventory &amp; Truck-Stock<br>Platform — Test Plan</h1>
  <div class="sub">A step-by-step manual test run covering environment setup, operator
  onboarding, account creation, authentication, every web page, all back-end routes,
  email notifications, lead capture, and security spot-checks.</div>
  <div class="pills">
    <span class="pill">API · Live on Railway</span>
    <span class="pill">Web · Next.js</span>
    <span class="pill">Mobile · Flutter</span>
    <span class="pill">Desktop · Qt</span>
  </div>
  <div class="meta">
    <strong>API:</strong> inventory-system-api-production.up.railway.app<br>
    <strong>Generated:</strong> {date} &nbsp;·&nbsp; <strong>Version:</strong> 1.0
  </div>
</div>
"""


def main() -> int:
    md_text = MD_FILE.read_text(encoding="utf-8")

    md = markdown.Markdown(
        extensions=[
            "extra",
            "codehilite",
            "toc",
            "sane_lists",
            "admonition",
        ],
        extension_configs={
            "codehilite": {"guess_lang": False, "noclasses": False},
            "toc": {"toc_depth": "1-2"},
        },
    )
    body_html = md.convert(md_text)
    toc_html = md.toc

    pygments_css = HtmlFormatter(style="monokai").get_style_defs(".codehilite")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body>
{COVER.format(date=datetime.date.today().strftime("%B %d, %Y"))}
<div class="toc-page">
  <h1>Table of Contents</h1>
  <div class="toc">{toc_html}</div>
</div>
{body_html}
</body>
</html>"""

    base_css = CSS_FILE.read_text(encoding="utf-8")
    HTML(string=html, base_url=str(HERE)).write_pdf(
        OUT_FILE,
        stylesheets=[CSS(string=base_css), CSS(string=pygments_css)],
    )
    print(f"Wrote {OUT_FILE} ({OUT_FILE.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
