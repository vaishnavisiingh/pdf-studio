"""
Re-pagination API — change font, size, margins, page size
and get a brand new PDF generated from the IDRep tree.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from api.routes_document import _sessions
from core.idrep import IDRepRepaginator, RepaginationConfig

router = APIRouter(prefix="/repaginate", tags=["repagination"])


class RepaginateRequest(BaseModel):
    doc_id: str
    font_name:    Optional[str]   = "Helvetica"
    font_size:    Optional[float] = 11.0
    page_size:    Optional[str]   = "A4"       # "A4" or "LETTER"
    margin_top:   Optional[float] = 1.0
    margin_bottom:Optional[float] = 1.0
    margin_left:  Optional[float] = 1.2
    margin_right: Optional[float] = 1.0
    line_spacing: Optional[float] = 1.4
    show_page_numbers: Optional[bool] = True


@router.post("/")
async def repaginate(req: RepaginateRequest):
    session = _sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    config = RepaginationConfig(
        font_name=req.font_name,
        font_size=req.font_size,
        page_size=req.page_size,
        margin_top=req.margin_top,
        margin_bottom=req.margin_bottom,
        margin_left=req.margin_left,
        margin_right=req.margin_right,
        line_spacing=req.line_spacing,
        show_page_numbers=req.show_page_numbers,
    )

    try:
        repaginator = IDRepRepaginator(session["idrep"], config)
        pdf_bytes   = repaginator.repaginate()
    except Exception as e:
        raise HTTPException(500, f"Re-pagination failed: {str(e)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=repaginated.pdf"}
    )