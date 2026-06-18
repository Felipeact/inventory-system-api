#!/usr/bin/env python3
"""Render the technical documentation markdown into a styled PDF.

Pipeline: Markdown -> HTML (markdown + pygments) -> PDF (WeasyPrint).
"""
import sys
import datetime
from pathlib import Path

import markdown
from pygments.formatters import HtmlFormatter
from weasyprint import HTML, CSS

HERE = Path(__file__).parent
MD_FILE = HERE / "documentation.md"
CSS_FILE = HERE / "style.css"
OUT_FILE = HERE / "Inventory-System-Documentation.pdf"

COVER = """
<div class="cover">
  <div class="glyph">◆</div>
  <h1>Inventory &amp; Truck-Stock<br>Management Platform</h1>
  <div class="sub">Technical Documentation — Architecture, Build &amp; Run Guides, and
  Production-Readiness Report for the Back-End API, Web Front-End, Flutter Mobile App,
  and Qt Desktop App.</div>
  <div class="pills">
    <span class="pill">Back-End · Node/Express/Prisma</span>
    <span class="pill">Front-End · Next.js</span>
    <span class="pill">Mobile · Flutter</span>
    <span class="pill">Desktop · Qt / C++</span>
  </div>
  <div class="meta">
    <strong>Repositories:</strong> felipeact/inventory-system-api &nbsp;·&nbsp;
    felipeact/InventoryQtApp<br>
    <strong>Generated:</strong> {date} &nbsp;·&nbsp; <strong>Version:</strong> 1.0
  </div>
</div>
"""


def main() -> int:
    md_text = MD_FILE.read_text(encoding="utf-8")

    md = markdown.Markdown(
        extensions=[
            "extra",        # tables, fenced_code, attr_list, def_list, footnotes
            "codehilite",   # pygments highlighting
            "toc",          # heading anchors + md.toc
            "sane_lists",
            "admonition",
        ],
        extension_configs={
            "codehilite": {"guess_lang": False, "noclasses": False},
            "toc": {"toc_depth": "1-3"},
        },
    )
    body_html = md.convert(md_text)
    toc_html = md.toc  # nested <ul> with anchor links

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
