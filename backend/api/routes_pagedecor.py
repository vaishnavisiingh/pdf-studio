from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import api.routes_document as doc_module
import fitz
import tempfile
import shutil
import datetime

router = APIRouter(prefix="/pagedecor", tags=["pagedecor"])


class PageNumberRequest(BaseModel):
    doc_id: str
    position: Optional[str] = "bottom-center"  # bottom-center, bottom-right, bottom-left
    start_from: Optional[int] = 1
    prefix: Optional[str] = ""
    fontsize: Optional[float] = 10


class HeaderFooterRequest(BaseModel):
    doc_id: str
    header_text: Optional[str] = ""
    footer_text: Optional[str] = ""
    include_date: Optional[bool] = False
    fontsize: Optional[float] = 10


@router.post("/page-numbers")
async def add_page_numbers(req: PageNumberRequest):
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    try:
        pdf = fitz.open(idrep.file_path)

        for i, page in enumerate(pdf):
            rect     = page.rect
            page_num = req.start_from + i
            text     = f"{req.prefix}{page_num}"

            if req.position == "bottom-center":
                x = rect.width / 2 - len(text) * req.fontsize * 0.3
                y = rect.height - 20
            elif req.position == "bottom-right":
                x = rect.width - len(text) * req.fontsize * 0.6 - 20
                y = rect.height - 20
            else:  # bottom-left
                x = 20
                y = rect.height - 20

            page.insert_text(
                fitz.Point(x, y),
                text,
                fontname="helv",
                fontsize=req.fontsize,
                color=(0.3, 0.3, 0.3),
            )
            renderer.invalidate_page(i)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)

    except Exception as e:
        raise HTTPException(500, f"Page numbering failed: {str(e)}")

    return {"success": True, "pages": idrep.page_count}


@router.post("/header-footer")
async def add_header_footer(req: HeaderFooterRequest):
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep    = session["idrep"]
    renderer = session["renderer"]
    doc_module.take_snapshot(session, idrep.file_path)

    date_str = datetime.date.today().strftime("%d %b %Y") if req.include_date else ""

    try:
        pdf = fitz.open(idrep.file_path)

        for i, page in enumerate(pdf):
            rect = page.rect

            if req.header_text:
                header = req.header_text
                if date_str:
                    header += f"  |  {date_str}"
                x = rect.width / 2 - len(header) * req.fontsize * 0.3
                page.insert_text(
                    fitz.Point(x, 20),
                    header,
                    fontname="helv",
                    fontsize=req.fontsize,
                    color=(0.3, 0.3, 0.3),
                )
                # Draw header line
                page.draw_line(
                    fitz.Point(30, 25),
                    fitz.Point(rect.width - 30, 25),
                    color=(0.7, 0.7, 0.7),
                    width=0.5,
                )

            if req.footer_text:
                footer = req.footer_text
                if date_str and not req.header_text:
                    footer += f"  |  {date_str}"
                x = rect.width / 2 - len(footer) * req.fontsize * 0.3
                page.insert_text(
                    fitz.Point(x, rect.height - 15),
                    footer,
                    fontname="helv",
                    fontsize=req.fontsize,
                    color=(0.3, 0.3, 0.3),
                )
                # Draw footer line
                page.draw_line(
                    fitz.Point(30, rect.height - 22),
                    fitz.Point(rect.width - 30, rect.height - 22),
                    color=(0.7, 0.7, 0.7),
                    width=0.5,
                )

            renderer.invalidate_page(i)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()
        pdf.save(tmp.name)
        pdf.close()
        shutil.move(tmp.name, idrep.file_path)

    except Exception as e:
        raise HTTPException(500, f"Header/footer failed: {str(e)}")

    return {"success": True, "pages": idrep.page_count}
