"""
IDRepRepaginator — proper full reflow with ReportLab
Handles: font, size, margins, page size, bullets, tables
"""
from __future__ import annotations
import io
from dataclasses import dataclass
from typing import Optional

from reportlab.lib.pagesizes import A4, LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, HRFlowable, PageBreak
)
from reportlab.platypus.flowables import Flowable

from .models import IDRepDocument, IDRepNode, IDRepNodeType


@dataclass
class RepaginationConfig:
    font_name: str        = "Helvetica"
    font_size: float      = 11.0
    page_size: str        = "A4"
    margin_top: float     = 1.0
    margin_bottom: float  = 1.0
    margin_left: float    = 1.2
    margin_right: float   = 1.0
    line_spacing: float   = 1.4
    show_page_numbers: bool = True


FONT_MAP = {
    "arial":           ("Helvetica",      "Helvetica-Bold",    "Helvetica-Oblique"),
    "helvetica":       ("Helvetica",      "Helvetica-Bold",    "Helvetica-Oblique"),
    "times new roman": ("Times-Roman",    "Times-Bold",        "Times-Italic"),
    "times":           ("Times-Roman",    "Times-Bold",        "Times-Italic"),
    "courier":         ("Courier",        "Courier-Bold",      "Courier-Oblique"),
    "courier new":     ("Courier",        "Courier-Bold",      "Courier-Oblique"),
    "georgia":         ("Times-Roman",    "Times-Bold",        "Times-Italic"),
    "verdana":         ("Helvetica",      "Helvetica-Bold",    "Helvetica-Oblique"),
}

PAGE_SIZES = {
    "A4":     A4,
    "LETTER": LETTER,
}


def resolve_font(name: str):
    return FONT_MAP.get(name.lower(), ("Helvetica", "Helvetica-Bold", "Helvetica-Oblique"))


def escape_xml(text: str) -> str:
    return (text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;"))


class IDRepRepaginator:

    def __init__(self, document: IDRepDocument, config: RepaginationConfig = None):
        self.doc    = document
        self.config = config or RepaginationConfig()

    def repaginate(self) -> bytes:
        buffer   = io.BytesIO()
        pagesize = PAGE_SIZES.get(self.config.page_size, A4)
        base, bold, italic = resolve_font(self.config.font_name)
        fs   = self.config.font_size
        lead = fs * self.config.line_spacing

        styles = {
            "h1": ParagraphStyle("h1",
                fontName=bold, fontSize=fs + 8,
                leading=(fs+8)*1.3, spaceBefore=14, spaceAfter=6,
                textColor=colors.HexColor("#0A0E1A")),
            "h2": ParagraphStyle("h2",
                fontName=bold, fontSize=fs + 5,
                leading=(fs+5)*1.3, spaceBefore=10, spaceAfter=4,
                textColor=colors.HexColor("#0A0E1A")),
            "h3": ParagraphStyle("h3",
                fontName=bold, fontSize=fs + 2,
                leading=(fs+2)*1.3, spaceBefore=8, spaceAfter=4,
                textColor=colors.HexColor("#0A0E1A")),
            "h4": ParagraphStyle("h4",
                fontName=bold, fontSize=fs + 1,
                leading=(fs+1)*1.3, spaceBefore=6, spaceAfter=2,
                textColor=colors.HexColor("#0A0E1A")),
            "body": ParagraphStyle("body",
                fontName=base, fontSize=fs,
                leading=lead, spaceAfter=4,
                alignment=TA_JUSTIFY),
            "bullet": ParagraphStyle("bullet",
                fontName=base, fontSize=fs,
                leading=lead, spaceAfter=2,
                leftIndent=20, bulletIndent=8,
                bulletText="•"),
            "caption": ParagraphStyle("caption",
                fontName=italic, fontSize=fs-1,
                leading=(fs-1)*1.3, spaceAfter=4,
                alignment=TA_CENTER,
                textColor=colors.HexColor("#6B7280")),
            "reference": ParagraphStyle("reference",
                fontName=base, fontSize=fs-1,
                leading=(fs-1)*1.4, spaceAfter=2,
                textColor=colors.HexColor("#374151")),
            "equation": ParagraphStyle("equation",
                fontName=italic, fontSize=fs,
                leading=lead, spaceAfter=6, spaceBefore=6,
                alignment=TA_CENTER),
        }

        doc = SimpleDocTemplate(
            buffer,
            pagesize=pagesize,
            topMargin=self.config.margin_top * inch,
            bottomMargin=self.config.margin_bottom * inch,
            leftMargin=self.config.margin_left * inch,
            rightMargin=self.config.margin_right * inch,
        )

        story = self._build_story(styles, bold)

        if self.config.show_page_numbers:
            doc.build(story,
                      onFirstPage=self._page_footer,
                      onLaterPages=self._page_footer)
        else:
            doc.build(story)

        return buffer.getvalue()

    def _build_story(self, styles, bold_font):
        story = []

        skip_types = {
            IDRepNodeType.DOCUMENT,
            IDRepNodeType.PAGE,
            IDRepNodeType.TABLE_ROW,
            IDRepNodeType.TABLE_CELL,
        }

        nodes = sorted(
            [n for n in self.doc._node_index.values()
             if n.node_type not in skip_types],
            key=lambda n: (n.page_number, n.sort_order)
        )

        for node in nodes:
            el = self._node_to_element(node, styles, bold_font)
            if el is not None:
                story.append(el)

        if not story:
            story.append(Paragraph("No content extracted.", styles["body"]))

        return story

    def _node_to_element(self, node: IDRepNode, styles, bold_font):
        text = escape_xml(node.text or "").strip()
        if not text:
            return None

        if node.node_type == IDRepNodeType.HEADING:
            level = min(node.heading_level or 1, 4)
            if node.is_bold:
                text = f"<b>{text}</b>"
            return Paragraph(text, styles[f"h{level}"])

        elif node.node_type == IDRepNodeType.PARAGRAPH:
            # Detect bullet points
            if text.startswith(("•", "-", "*", "●", "■")):
                clean = text.lstrip("•-*●■ ").strip()
                return Paragraph(clean, styles["bullet"])
            formatted = text
            if node.is_bold:
                formatted = f"<b>{formatted}</b>"
            if node.is_italic:
                formatted = f"<i>{formatted}</i>"
            return Paragraph(formatted, styles["body"])

        elif node.node_type == IDRepNodeType.CAPTION:
            return Paragraph(f"<i>{text}</i>", styles["caption"])

        elif node.node_type == IDRepNodeType.REFERENCE:
            return Paragraph(text, styles["reference"])

        elif node.node_type == IDRepNodeType.EQUATION:
            return Paragraph(f"<i>{text}</i>", styles["equation"])

        elif node.node_type == IDRepNodeType.TABLE:
            return self._build_table(node)

        elif node.node_type == IDRepNodeType.ANNOTATION:
            return Paragraph(f"<i>[Note: {text}]</i>", styles["caption"])

        return None

    def _build_table(self, table_node: IDRepNode):
        rows = []
        for row_node in sorted(table_node.children, key=lambda n: n.sort_order):
            row = []
            for cell_node in sorted(row_node.children, key=lambda n: n.sort_order):
                row.append(cell_node.text or "")
            if row:
                rows.append(row)

        if not rows:
            return None

        col_count = max(len(r) for r in rows)
        # Pad rows to equal length
        for r in rows:
            while len(r) < col_count:
                r.append("")

        table = Table(rows, repeatRows=1, hAlign="LEFT")
        table.setStyle(TableStyle([
            ("BACKGROUND",     (0,0), (-1,0),  colors.HexColor("#1E2A45")),
            ("TEXTCOLOR",      (0,0), (-1,0),  colors.white),
            ("FONTNAME",       (0,0), (-1,0),  "Helvetica-Bold"),
            ("FONTSIZE",       (0,0), (-1,-1), self.config.font_size - 1),
            ("ROWBACKGROUNDS", (0,1), (-1,-1),
             [colors.HexColor("#F8F9FA"), colors.white]),
            ("GRID",           (0,0), (-1,-1), 0.5, colors.HexColor("#DEE2E6")),
            ("VALIGN",         (0,0), (-1,-1), "MIDDLE"),
            ("PADDING",        (0,0), (-1,-1), 6),
        ]))
        return table

    def _page_footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.HexColor("#9CA3AF"))
        canvas.drawCentredString(
            doc.pagesize[0] / 2,
            0.4 * inch,
            str(canvas.getPageNumber())
        )
        canvas.restoreState()
