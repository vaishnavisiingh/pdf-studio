from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import api.routes_document as doc_module
import fitz
import tempfile
import shutil
import os

router = APIRouter(prefix="/ocr", tags=["ocr"])


class OCRRequest(BaseModel):
    doc_id: str
    pages: Optional[list] = None  # None = all pages


@router.post("/process")
async def ocr_document(req: OCRRequest):
    session = doc_module.get_session(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    try:
        import pytesseract
        from PIL import Image
        import io

        pdf        = fitz.open(idrep.file_path)
        page_count = len(pdf)
        pages_to_process = req.pages if req.pages else list(range(page_count))

        total_text_added = 0

        for page_num in pages_to_process:
            if page_num >= page_count:
                continue

            page = pdf[page_num]

            # Check if page already has text
            existing_text = page.get_text().strip()
            if len(existing_text) > 20:
                continue  # Skip pages that already have text

            # Render page to image at high DPI for better OCR
            mat  = fitz.Matrix(3.0, 3.0)  # 3x zoom = ~216 DPI
            pix  = page.get_pixmap(matrix=mat)
            img  = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            # Run OCR
            ocr_data = pytesseract.image_to_data(
                img,
                output_type=pytesseract.Output.DICT,
                config="--psm 3"
            )

            # Add each recognized word as invisible text overlay
            # This makes the PDF searchable without changing appearance
            n_boxes = len(ocr_data["text"])
            scale_x = page.rect.width  / pix.width
            scale_y = page.rect.height / pix.height

            words_added = 0
            for i in range(n_boxes):
                conf = int(ocr_data["conf"][i])
                text = ocr_data["text"][i].strip()

                if conf < 40 or not text:
                    continue

                x = ocr_data["left"][i]   * scale_x
                y = ocr_data["top"][i]    * scale_y
                w = ocr_data["width"][i]  * scale_x
                h = ocr_data["height"][i] * scale_y

                if w < 1 or h < 1:
                    continue

                # Insert invisible text (color matches background — white)
                # This adds a searchable text layer without changing visuals
                try:
                    page.insert_text(
                        fitz.Point(x, y + h * 0.85),
                        text,
                        fontsize=max(h * 0.8, 6),
                        color=(1, 1, 1),  # white = invisible
                        overlay=False,
                    )
                    words_added += 1
                except Exception:
                    continue

            total_text_added += words_added
            renderer.invalidate_page(page_num)

        # Save the OCR'd PDF
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)

        # Rebuild IDRep tree with new text
        from core.idrep import IDRepBuilder, IDRepRenderer
     # Preserve history and session metadata
        old_history       = session.get("history", [])
        old_history_index = session.get("history_index", -1)
        old_redo_history  = session.get("redo_history", [])
        
        print(f"[OCR] Preserving history: {len(old_history)} snapshots, index={old_history_index}")
        new_idrep    = IDRepBuilder.from_pdf(idrep.file_path)
        new_renderer = IDRepRenderer(new_idrep)
        new_idrep.id = idrep.id  # Keep same session ID

        session["idrep"]         = new_idrep
        session["renderer"]      = new_renderer
        session["history"]       = old_history
        session["history_index"] = old_history_index
        session["redo_history"]  = old_redo_history
        session["renderer"] = new_renderer

    except Exception as e:
        raise HTTPException(500, f"OCR failed: {str(e)}")

    return {
        "success": True,
        "pages_processed": len(pages_to_process),
        "words_added": total_text_added,
    }


@router.get("/check/{doc_id}")
async def check_ocr_needed(doc_id: str):
    """Check how many pages have no text (need OCR)."""
    session = doc_module.get_session(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep = session["idrep"]

    try:
        pdf           = fitz.open(idrep.file_path)
        pages_no_text = []

        for i, page in enumerate(pdf):
            text = page.get_text().strip()
            if len(text) < 20:
                pages_no_text.append(i)

        pdf.close()

    except Exception as e:
        raise HTTPException(500, f"Check failed: {str(e)}")

    return {
        "total_pages":     idrep.page_count,
        "pages_need_ocr":  pages_no_text,
        "needs_ocr":       len(pages_no_text) > 0,
    }
