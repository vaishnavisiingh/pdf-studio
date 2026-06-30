from __future__ import annotations
import os
import shutil
import fitz
from .models import IDRepDocument, IDRepNode, IDRepNodeType, BoundingBox


WORK_DIR = os.path.expanduser("~/.pdf_studio_workdir")
os.makedirs(WORK_DIR, exist_ok=True)


class IDRepBuilder:

    @staticmethod
    def from_pdf(file_path: str) -> IDRepDocument:
        import uuid
        filename  = os.path.basename(file_path)
        work_path = os.path.join(WORK_DIR, f"{uuid.uuid4().hex}_{filename}")
        shutil.copy2(file_path, work_path)

        doc = IDRepDocument(file_path=work_path, original_path=file_path)

        pdf = fitz.open(work_path)
        doc.page_count = len(pdf)
        doc.title      = pdf.metadata.get("title", "") or filename

        for page_num, page in enumerate(pdf):
            IDRepBuilder._extract_page(page, page_num, doc)

        pdf.close()
        return doc

    @staticmethod
    def _extract_page(page, page_num: int, doc: IDRepDocument):
        blocks     = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
        sort_order = page_num * 1000

        for block in blocks:
            if block.get("type") == 1:
                node = IDRepNode(
                    node_type=IDRepNodeType.IMAGE,
                    page_number=page_num,
                    sort_order=sort_order,
                    bbox=BoundingBox(*block["bbox"], page=page_num),
                )
                doc._node_index[node.id] = node
                sort_order += 1
                continue

            if "lines" not in block:
                continue

            for line in block["lines"]:
                spans = line.get("spans", [])
                if not spans:
                    continue

                text = " ".join(s["text"] for s in spans).strip()
                if not text:
                    continue

                font_size = max(s["size"] for s in spans)
                is_bold   = any("bold" in s["font"].lower() for s in spans)
                is_italic = any(
                    "italic" in s["font"].lower() or "oblique" in s["font"].lower()
                    for s in spans
                )

                node_type = IDRepBuilder._classify(text, font_size, is_bold, sort_order)

                node = IDRepNode(
                    node_type=node_type,
                    page_number=page_num,
                    sort_order=sort_order,
                    text=text,
                    font_size=font_size,
                    is_bold=is_bold,
                    is_italic=is_italic,
                    bbox=BoundingBox(*line["bbox"], page=page_num),
                )

                if node_type == IDRepNodeType.HEADING:
                    node.heading_level = IDRepBuilder._heading_level(font_size)

                doc._node_index[node.id] = node
                sort_order += 1

    @staticmethod
    def _classify(text: str, font_size: float, is_bold: bool, sort_order: int) -> IDRepNodeType:
        t = text.strip()

        if font_size >= 16 or (font_size >= 13 and is_bold):
            return IDRepNodeType.HEADING

        ref_patterns = ["doi:", "http", "arxiv", "et al", "pp.", "vol."]
        if any(p in t.lower() for p in ref_patterns) and sort_order > 5:
            return IDRepNodeType.REFERENCE

        if t.startswith(("[", "(")) and any(c.isdigit() for c in t[:4]):
            return IDRepNodeType.REFERENCE

        if any(kw in t.lower() for kw in ["\\frac", "\\sum", "\\int", "∑", "∫"]):
            return IDRepNodeType.EQUATION

        if t.lower().startswith(("fig", "table", "figure")):
            return IDRepNodeType.CAPTION

        return IDRepNodeType.PARAGRAPH

    @staticmethod
    def _heading_level(font_size: float) -> int:
        if font_size >= 22: return 1
        if font_size >= 18: return 2
        if font_size >= 15: return 3
        return 4
