from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional
import api.routes_document as doc_module
import fitz
import tempfile
import shutil

router = APIRouter(prefix="/pages", tags=["pages"])


class ExtractRequest(BaseModel):
    doc_id: str
    pages: List[int]


class SplitRequest(BaseModel):
    doc_id: str
    split_at: List[int]


@router.post("/extract")
async def extract_pages(req: ExtractRequest):
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep = session["idrep"]

    try:
        src = fitz.open(idrep.file_path)
        out = fitz.open()

        for page_num in req.pages:
            if 0 <= page_num < len(src):
                out.insert_pdf(src, from_page=page_num, to_page=page_num)

        pdf_bytes = out.tobytes()
        src.close()
        out.close()

    except Exception as e:
        raise HTTPException(500, f"Extraction failed: {str(e)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=extracted.pdf"}
    )


@router.post("/split")
async def split_pdf(req: SplitRequest):
    session = doc_module._sessions.get(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep      = session["idrep"]
    page_count = idrep.page_count

    try:
        src        = fitz.open(idrep.file_path)
        split_pts  = sorted(set(req.split_at))
        boundaries = [0] + split_pts + [page_count]
        parts      = []

        for i in range(len(boundaries) - 1):
            start = boundaries[i]
            end   = boundaries[i + 1] - 1
            if start > end or start >= page_count:
                continue
            out = fitz.open()
            out.insert_pdf(src, from_page=start, to_page=min(end, page_count - 1))
            parts.append(out.tobytes())
            out.close()

        src.close()

    except Exception as e:
        raise HTTPException(500, f"Split failed: {str(e)}")

    return {"parts": len(parts), "sizes": [len(p) for p in parts], "data": [p.hex() for p in parts]}


@router.post("/merge")
async def merge_pdfs(files: List[UploadFile] = File(...)):
    try:
        out = fitz.open()

        for file in files:
            data    = await file.read()
            tmp     = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
            tmp.write(data)
            tmp.close()
            src = fitz.open(tmp.name)
            out.insert_pdf(src)
            src.close()

        pdf_bytes = out.tobytes()
        out.close()

    except Exception as e:
        raise HTTPException(500, f"Merge failed: {str(e)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=merged.pdf"}
    )
