from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import api.routes_document as doc_module
import fitz
import tempfile
import shutil

router = APIRouter(prefix="/crop", tags=["crop"])


class CropRequest(BaseModel):
    doc_id: str
    page: int
    x: float
    y: float
    width: float
    height: float
    apply_to_all: Optional[bool] = False


class ResizeRequest(BaseModel):
    doc_id: str
    width: float
    height: float
    apply_to_all: Optional[bool] = True


@router.post("/page")
async def crop_page(req: CropRequest):
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    try:
        pdf   = fitz.open(idrep.file_path)
        pages = range(len(pdf)) if req.apply_to_all else [req.page]

        for page_num in pages:
            page = pdf[page_num]
            crop_rect = fitz.Rect(req.x, req.y, req.x + req.width, req.y + req.height)
            page.set_cropbox(crop_rect)
            renderer.invalidate_page(page_num)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)

    except Exception as e:
        raise HTTPException(500, f"Crop failed: {str(e)}")

    return {"success": True}


@router.post("/resize")
async def resize_page(req: ResizeRequest):
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    try:
        pdf   = fitz.open(idrep.file_path)
        pages = range(len(pdf)) if req.apply_to_all else [0]

        for page_num in pages:
            page     = pdf[page_num]
            new_rect = fitz.Rect(0, 0, req.width, req.height)
            page.set_mediabox(new_rect)
            renderer.invalidate_page(page_num)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)

    except Exception as e:
        raise HTTPException(500, f"Resize failed: {str(e)}")

    return {"success": True}


@router.post("/reset")
async def reset_crop(req: CropRequest):
    """Reset crop to full page."""
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    try:
        pdf = fitz.open(idrep.file_path)
        pages = range(len(pdf)) if req.apply_to_all else [req.page]

        for page_num in pages:
            page = pdf[page_num]
            page.set_cropbox(page.mediabox)
            renderer.invalidate_page(page_num)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)

    except Exception as e:
        raise HTTPException(500, f"Reset failed: {str(e)}")

    return {"success": True}
