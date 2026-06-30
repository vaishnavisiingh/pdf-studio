"""
IDRepRenderer — renders IDRep tree pages to PNG (for viewer)
or PDF bytes (for save/export).
Only re-renders dirty pages for performance.
"""
from __future__ import annotations
import base64
import fitz
from .models import IDRepDocument, IDRepNodeType


class IDRepRenderer:

    DEFAULT_DPI = 150   # screen quality
    EXPORT_DPI  = 300   # print/export quality

    def __init__(self, document: IDRepDocument):
        self.doc = document
        self._page_cache: dict[int, str] = {}   # page_num → base64 PNG

    def render_page(self, page_number: int, dpi: int = DEFAULT_DPI) -> str:
        """Return base64 PNG of the page. Uses cache for clean pages."""
        if page_number in self._page_cache and page_number not in self.doc.get_dirty_pages():
            return self._page_cache[page_number]

        png_b64 = self._render_from_pdf(page_number, dpi)
        self._page_cache[page_number] = png_b64

        # Mark all nodes on this page clean
        for node in self.doc.get_page_nodes(page_number):
            node.mark_clean()

        return png_b64

    def render_all_pages(self, dpi: int = DEFAULT_DPI) -> list[str]:
        return [self.render_page(i, dpi) for i in range(self.doc.page_count)]

    def invalidate_page(self, page_number: int):
        """Force re-render of a page on next request."""
        self._page_cache.pop(page_number, None)

    def _render_from_pdf(self, page_number: int, dpi: int) -> str:
        pdf = fitz.open(self.doc.file_path)
        page = pdf[page_number]
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        png_bytes = pix.tobytes("png")
        pdf.close()
        return base64.b64encode(png_bytes).decode("utf-8")

    def get_page_dimensions(self, page_number: int) -> dict:
        pdf = fitz.open(self.doc.file_path)
        rect = pdf[page_number].rect
        pdf.close()
        return {"width": rect.width, "height": rect.height}
