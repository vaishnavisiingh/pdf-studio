from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List
import api.routes_document as doc_module
import fitz
import tempfile
import shutil
import os
import base64

router = APIRouter(prefix="/signature", tags=["signature"])


class TextSignatureRequest(BaseModel):
    doc_id: str
    page: int
    x: float
    y: float
    name: str
    fontsize: Optional[float] = 16
    color: Optional[str] = "blue"


class ImageSignatureRequest(BaseModel):
    doc_id: str
    page: int
    x: float
    y: float
    width: Optional[float] = 150
    height: Optional[float] = 60
    image_b64: str


@router.post("/text")
async def add_text_signature(req: TextSignatureRequest):
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    color_map = {
        "blue":  (0.0, 0.0, 0.6),
        "black": (0.0, 0.0, 0.0),
        "red":   (0.6, 0.0, 0.0),
    }
    rgb = color_map.get(req.color, (0.0, 0.0, 0.6))

    try:
        pdf = fitz.open(idrep.file_path)
        pg  = pdf[req.page]

        # Draw signature line
        line_y = req.y + 5
        pg.draw_line(
            fitz.Point(req.x, line_y),
            fitz.Point(req.x + len(req.name) * req.fontsize * 0.6 + 20, line_y),
            color=rgb,
            width=0.8,
        )

        # Insert signature text in italic style
        pg.insert_text(
            fitz.Point(req.x, req.y),
            req.name,
            fontname="tiro",
            fontsize=req.fontsize,
            color=rgb,
        )

        # Add "Digitally Signed" label below
        pg.insert_text(
            fitz.Point(req.x, req.y + req.fontsize + 6),
            f"Digitally Signed",
            fontname="helv",
            fontsize=7,
            color=(0.5, 0.5, 0.5),
        )

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)
        renderer.invalidate_page(req.page)

    except Exception as e:
        raise HTTPException(500, f"Signature failed: {str(e)}")

    return {"success": True}


@router.post("/image")
async def add_image_signature(req: ImageSignatureRequest):
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    try:
        img_bytes = base64.b64decode(req.image_b64)
        tmp_img   = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        tmp_img.write(img_bytes)
        tmp_img.close()

        pdf  = fitz.open(idrep.file_path)
        pg   = pdf[req.page]
        rect = fitz.Rect(req.x, req.y, req.x + req.width, req.y + req.height)
        pg.insert_image(rect, filename=tmp_img.name)
        os.unlink(tmp_img.name)

        # Add signature line below
        pg.draw_line(
            fitz.Point(req.x, req.y + req.height + 2),
            fitz.Point(req.x + req.width, req.y + req.height + 2),
            color=(0.0, 0.0, 0.6),
            width=0.8,
        )

        pg.insert_text(
            fitz.Point(req.x, req.y + req.height + 12),
            "Digitally Signed",
            fontname="helv",
            fontsize=7,
            color=(0.5, 0.5, 0.5),
        )

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)
        renderer.invalidate_page(req.page)

    except Exception as e:
        raise HTTPException(500, f"Signature failed: {str(e)}")

    return {"success": True}
