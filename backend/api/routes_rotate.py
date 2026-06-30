from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import api.routes_document as doc_module
import fitz
import tempfile
import shutil

router = APIRouter(prefix="/rotate", tags=["rotate"])


class RotateRequest(BaseModel):
    doc_id: str
    pages: Optional[List[int]] = None  # None = all pages
    angle: int = 90  # 90, 180, 270


@router.post("/apply")
async def rotate_pages(req: RotateRequest):
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    if req.angle not in [90, 180, 270]:
        raise HTTPException(400, "Angle must be 90, 180, or 270")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    try:
        pdf   = fitz.open(idrep.file_path)
        pages = req.pages if req.pages else list(range(len(pdf)))

        for page_num in pages:
            if 0 <= page_num < len(pdf):
                page = pdf[page_num]
                page.set_rotation(req.angle)
                renderer.invalidate_page(page_num)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)

    except Exception as e:
        raise HTTPException(500, f"Rotate failed: {str(e)}")

    return {"success": True, "pages_rotated": len(pages)}
