from fastapi import APIRouter, HTTPException
import api.routes_document as doc_module
import os
import fitz

router = APIRouter(prefix="/info", tags=["info"])


@router.get("/{doc_id}")
async def get_document_info(doc_id: str):
    session = doc_module.get_session(doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    idrep = session["idrep"]
    file_path = idrep.file_path

    # File size
    file_size = os.path.getsize(file_path)
    if file_size > 1024 * 1024:
        size_str = f"{file_size / (1024*1024):.1f} MB"
    else:
        size_str = f"{file_size / 1024:.1f} KB"

    # PDF metadata
    pdf = fitz.open(file_path)
    meta = pdf.metadata
    pdf.close()

    return {
        "title":    meta.get("title") or os.path.basename(file_path),
        "author":   meta.get("author") or "Unknown",
        "subject":  meta.get("subject") or "",
        "creator":  meta.get("creator") or "",
        "pages":    idrep.page_count,
        "file_size": size_str,
        "file_name": os.path.basename(file_path),
        "created":  meta.get("creationDate") or "",
        "modified": meta.get("modDate") or "",
    }
