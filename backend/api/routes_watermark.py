from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import api.routes_document as doc_module
import fitz
import tempfile
import shutil
import math

router = APIRouter(prefix="/watermark", tags=["watermark"])


class WatermarkRequest(BaseModel):
    doc_id: str
    text: str
    color: Optional[str] = "gray"


@router.post("/apply")
async def apply_watermark(req: WatermarkRequest):
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]

    color_map = {
        "gray":  (0.82, 0.82, 0.82),
        "red":   (0.9,  0.5,  0.5),
        "blue":  (0.5,  0.5,  0.9),
        "green": (0.5,  0.8,  0.5),
    }
    rgb = color_map.get(req.color, (0.82, 0.82, 0.82))

    try:
        doc_module.take_snapshot(session, idrep.file_path)

        pdf   = fitz.open(idrep.file_path)
        angle = 45 * math.pi / 180
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)

        for page in pdf:
            rect     = page.rect
            center_x = rect.width / 2
            center_y = rect.height / 2
            positions = [
                fitz.Point(center_x - 100, center_y),
                fitz.Point(center_x - 100, center_y - 150),
                fitz.Point(center_x - 100, center_y + 150),
            ]
            shape = page.new_shape()
            for pos in positions:
                shape.insert_text(
                    pos, req.text,
                    fontsize=50,
                    color=rgb,
                    morph=(pos, fitz.Matrix(cos_a, sin_a, -sin_a, cos_a, 0, 0)),
                )
            shape.commit(overlay=True)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)
        renderer._page_cache.clear()

    except Exception as e:
        raise HTTPException(500, f"Watermark failed: {str(e)}")

    return {"success": True, "text": req.text, "pages": idrep.page_count}
