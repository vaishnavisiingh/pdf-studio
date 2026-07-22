from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import api.routes_document as doc_module
import fitz
import tempfile
import shutil

router = APIRouter(prefix="/redact", tags=["redact"])


class RedactRequest(BaseModel):
    doc_id: str
    page: int
    x: float
    y: float
    width: float
    height: float
    color: Optional[str] = "black"


class RedactTextRequest(BaseModel):
    doc_id: str
    text: str
    all_pages: Optional[bool] = True


@router.post("/region")
async def redact_region(req: RedactRequest):
    session = doc_module.get_session(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    color_map = {
        "black": (0, 0, 0),
        "white": (1, 1, 1),
        "blue":  (0, 0, 0.5),
    }
    rgb = color_map.get(req.color, (0, 0, 0))

    try:
        pdf  = fitz.open(idrep.file_path)
        pg   = pdf[req.page]
        rect = fitz.Rect(req.x, req.y, req.x + req.width, req.y + req.height)

        pg.add_redact_annot(rect, fill=rgb)
        pg.apply_redactions()

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)
        renderer.invalidate_page(req.page)

    except Exception as e:
        raise HTTPException(500, f"Redact failed: {str(e)}")

    return {"success": True}


@router.post("/text")
async def redact_text(req: RedactTextRequest):
    session = doc_module.get_session(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    try:
        pdf   = fitz.open(idrep.file_path)
        count = 0

        pages = range(len(pdf)) if req.all_pages else range(1)

        for page_num in pages:
            pg   = pdf[page_num]
            hits = pg.search_for(req.text)
            for rect in hits:
                pg.add_redact_annot(rect, fill=(0, 0, 0))
                count += 1
            if hits:
                pg.apply_redactions()
                renderer.invalidate_page(page_num)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)

    except Exception as e:
        raise HTTPException(500, f"Redact text failed: {str(e)}")

    return {"success": True, "count": count}
