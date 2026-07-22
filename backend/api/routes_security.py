from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
import api.routes_document as doc_module
import fitz
import tempfile
import shutil

router = APIRouter(prefix="/security", tags=["security"])


class PasswordRequest(BaseModel):
    doc_id: str
    password: str
    confirm_password: str


@router.post("/protect")
async def protect_document(req: PasswordRequest):
    session = doc_module.get_session(req.doc_id)
    if not session:
        raise HTTPException(404, "Document not found")

    if req.password != req.confirm_password:
        raise HTTPException(400, "Passwords do not match")

    if len(req.password) < 4:
        raise HTTPException(400, "Password must be at least 4 characters")

    idrep = session["idrep"]

    try:
        pdf = fitz.open(idrep.file_path)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.close()

        pdf.save(
            tmp.name,
            encryption=fitz.PDF_ENCRYPT_AES_256,
            user_pw=req.password,
            owner_pw=req.password + "_owner",
            permissions=fitz.PDF_PERM_PRINT | fitz.PDF_PERM_COPY,
        )
        pdf.close()

        # Return the protected PDF as download
        with open(tmp.name, "rb") as f:
            pdf_bytes = f.read()

        shutil.rmtree(tmp.name, ignore_errors=True)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=protected.pdf"}
        )

    except Exception as e:
        raise HTTPException(500, f"Protection failed: {str(e)}")
