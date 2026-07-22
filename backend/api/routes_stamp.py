from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import api.routes_document as doc_module
import fitz
import tempfile
import shutil
import datetime

router = APIRouter(prefix="/stamp", tags=["stamp"])


class StampRequest(BaseModel):
    doc_id: str
    page: int
    x: float
    y: float
    text: str
    color: Optional[str] = "red"
    include_date: Optional[bool] = True


@router.post("/apply")
async def apply_stamp(req: StampRequest):
    session = doc_module.get_session(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    color_map = {
        "red":   (0.7, 0.0, 0.0),
        "blue":  (0.0, 0.0, 0.7),
        "green": (0.0, 0.5, 0.0),
    }
    rgb = color_map.get(req.color, (0.7, 0.0, 0.0))

    try:
        pdf = fitz.open(idrep.file_path)
        pg  = pdf[req.page]

        label = req.text
        if req.include_date:
            label += f"\n{datetime.date.today().strftime('%d %b %Y')}"

        lines     = label.split("\n")
        fontsize  = 22
        padding   = 10
        max_width = max(len(l) for l in lines) * fontsize * 0.55 + padding * 2
        height    = len(lines) * (fontsize + 4) + padding * 2

        rect = fitz.Rect(req.x, req.y, req.x + max_width, req.y + height)

        # Outer border (double line effect)
        pg.draw_rect(rect, color=rgb, width=2.5)
        inner = fitz.Rect(rect.x0 + 3, rect.y0 + 3, rect.x1 - 3, rect.y1 - 3)
        pg.draw_rect(inner, color=rgb, width=1.0)

        # Text lines
        y_offset = req.y + padding + fontsize
        for line in lines:
            pg.insert_text(
                fitz.Point(req.x + padding, y_offset),
                line,
                fontname="helv",
                fontsize=fontsize if line == req.text else 11,
                color=rgb,
            )
            y_offset += fontsize + 4

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)
        renderer.invalidate_page(req.page)

    except Exception as e:
        raise HTTPException(500, f"Stamp failed: {str(e)}")

    return {"success": True}
